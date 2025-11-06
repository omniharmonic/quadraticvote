import { db } from '@/lib/db/supabase-client';
import { events, votes, options } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { aggregateVotes } from '@/lib/utils/quadratic';
import type {
  EventResults,
  BinaryResults,
  ProportionalResults,
  Option,
  BinaryDecisionConfig,
  ProportionalDistributionConfig,
  OptionWithVotes,
  BinaryOptionResult,
  Distribution,
} from '@/lib/types';

export class ResultService {
  /**
   * Get results for an event (caching disabled since Redis was removed)
   */
  async getResults(eventId: string): Promise<EventResults> {
    // Note: Redis caching disabled - calculating fresh results every time
    const results = await this.calculateResults(eventId);

    return results;
  }
  
  /**
   * Calculate results from scratch
   */
  private async calculateResults(eventId: string): Promise<EventResults> {
    // 1. Fetch event configuration
    const eventResult = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    const event = eventResult[0];

    if (!event) throw new Error('Event not found');

    // 1.1. Fetch event options separately
    const eventOptions = await db.select().from(options).where(eq(options.eventId, eventId));

    // 2. Fetch all votes
    const allVotes = await db.select().from(votes).where(eq(votes.eventId, eventId));
    
    // 3. Aggregate quadratic votes
    const voteTotals = aggregateVotes(allVotes.map(v => ({ allocations: v.allocations as Record<string, number> })));
    
    // 4. Calculate results based on framework
    const framework = (event.decisionFramework as any).framework_type;
    const config = (event.decisionFramework as any).config;
    
    let frameworkResults: BinaryResults | ProportionalResults;
    
    if (framework === 'binary_selection') {
      frameworkResults = this.calculateBinaryResults(
        config,
        voteTotals,
        eventOptions as Option[]
      );
    } else if (framework === 'proportional_distribution') {
      frameworkResults = this.calculateProportionalResults(
        config,
        voteTotals,
        eventOptions as Option[]
      );
    } else {
      throw new Error('Unknown framework type');
    }
    
    // 5. Add participation metadata
    return {
      event_id: eventId,
      framework_type: framework,
      results: frameworkResults,
      participation: {
        total_voters: allVotes.length,
        total_credits_allocated: allVotes.reduce((sum, v) => sum + v.totalCreditsUsed, 0),
        voting_start: event.startTime,
        voting_end: event.endTime,
        is_final: this.isEventClosed(event),
      },
      calculated_at: new Date(),
    };
  }
  
  /**
   * Calculate binary selection results
   */
  private calculateBinaryResults(
    config: BinaryDecisionConfig,
    voteTotals: Record<string, number>,
    eventOptions: Option[]
  ): BinaryResults {
    // Convert vote totals to array with option details
    const optionsWithVotes: OptionWithVotes[] = eventOptions.map(opt => ({
      option_id: opt.id,
      title: opt.title,
      votes: voteTotals[opt.id] || 0,
    }));
    
    // Sort by votes descending
    const sorted = optionsWithVotes.sort((a, b) => b.votes - a.votes);
    
    // Determine selected options based on threshold mode
    let selectedOptionIds: Set<string>;
    let selectionMargin: number | undefined;
    
    switch (config.threshold_mode) {
      case 'top_n':
        selectedOptionIds = new Set(
          sorted.slice(0, config.top_n_count).map(o => o.option_id)
        );
        // Calculate margin between last selected and first not selected
        if (sorted.length > config.top_n_count!) {
          selectionMargin = sorted[config.top_n_count! - 1].votes - sorted[config.top_n_count!].votes;
        }
        break;
      
      case 'percentage':
        const maxVotes = sorted[0]?.votes || 0;
        const threshold = maxVotes * (config.percentage_threshold! / 100);
        selectedOptionIds = new Set(
          sorted.filter(o => o.votes >= threshold).map(o => o.option_id)
        );
        break;
      
      case 'absolute_votes':
        selectedOptionIds = new Set(
          sorted.filter(o => o.votes >= config.absolute_vote_threshold!).map(o => o.option_id)
        );
        break;
      
      case 'above_average':
        const avgVotes = sorted.reduce((sum, o) => sum + o.votes, 0) / sorted.length;
        selectedOptionIds = new Set(
          sorted.filter(o => o.votes >= avgVotes).map(o => o.option_id)
        );
        break;
      
      default:
        throw new Error('Unknown threshold mode');
    }
    
    // Add selection status and rank to each option
    const results: BinaryOptionResult[] = sorted.map((opt, index) => ({
      ...opt,
      rank: index + 1,
      selected: selectedOptionIds.has(opt.option_id),
    }));
    
    // Separate selected and not selected
    const selectedOptions = results.filter(r => r.selected);
    const notSelectedOptions = results.filter(r => !r.selected);
    
    return {
      framework_type: 'binary_selection',
      threshold_mode: config.threshold_mode,
      selected_options: selectedOptions,
      not_selected_options: notSelectedOptions,
      selected_count: selectedOptions.length,
      selection_margin: selectionMargin,
    };
  }
  
  /**
   * Calculate proportional distribution results
   */
  private calculateProportionalResults(
    config: ProportionalDistributionConfig,
    voteTotals: Record<string, number>,
    eventOptions: Option[]
  ): ProportionalResults {
    // Calculate total votes
    const totalVotes = Object.values(voteTotals).reduce((sum, v) => sum + v, 0);
    
    if (totalVotes === 0) {
      // No votes yet, return zero distribution
      return {
        framework_type: 'proportional_distribution',
        resource_name: config.resource_name,
        resource_symbol: config.resource_symbol,
        total_pool: config.total_pool_amount,
        distributions: eventOptions.map(opt => ({
          option_id: opt.id,
          title: opt.title,
          votes: 0,
          allocation_amount: 0,
          allocation_percentage: 0,
        })),
        total_allocated: 0,
        gini_coefficient: 0,
      };
    }
    
    // Calculate initial proportional distributions
    let distributions: Distribution[] = eventOptions.map(opt => {
      const voteCount = voteTotals[opt.id] || 0;
      const percentage = voteCount / totalVotes;
      let allocation = percentage * config.total_pool_amount;
      
      return {
        option_id: opt.id,
        title: opt.title,
        votes: voteCount,
        allocation_amount: allocation,
        allocation_percentage: percentage * 100,
      };
    });
    
    // Apply minimum allocation floor if enabled
    if (config.minimum_allocation_enabled && config.minimum_allocation_percentage) {
      const minAllocation = (config.minimum_allocation_percentage / 100) * config.total_pool_amount;
      
      for (const dist of distributions) {
        if (dist.votes > 0 && dist.allocation_amount < minAllocation) {
          dist.allocation_amount = minAllocation;
        }
      }
    }
    
    // Normalize if over-allocated due to minimums
    const totalAllocated = distributions.reduce((sum, d) => sum + d.allocation_amount, 0);
    
    if (totalAllocated > config.total_pool_amount) {
      const normalizationFactor = config.total_pool_amount / totalAllocated;
      distributions = distributions.map(d => ({
        ...d,
        allocation_amount: d.allocation_amount * normalizationFactor,
        allocation_percentage: (d.allocation_amount * normalizationFactor / config.total_pool_amount) * 100,
      }));
    }
    
    // Sort by allocation descending
    distributions.sort((a, b) => b.allocation_amount - a.allocation_amount);
    
    // Calculate Gini coefficient (measure of inequality)
    const gini = this.calculateGiniCoefficient(distributions.map(d => d.allocation_amount));
    
    return {
      framework_type: 'proportional_distribution',
      resource_name: config.resource_name,
      resource_symbol: config.resource_symbol,
      total_pool: config.total_pool_amount,
      distributions: distributions,
      total_allocated: distributions.reduce((sum, d) => sum + d.allocation_amount, 0),
      gini_coefficient: gini,
    };
  }
  
  /**
   * Calculate Gini coefficient (0 = perfect equality, 1 = perfect inequality)
   */
  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const total = sorted.reduce((sum, val) => sum + val, 0);
    
    if (total === 0) return 0;
    
    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i + 1) * sorted[i];
    }
    
    return (2 * numerator) / (n * total) - (n + 1) / n;
  }
  
  /**
   * Check if event is closed
   */
  private isEventClosed(event: any): boolean {
    return new Date() > new Date(event.endTime);
  }
  
  /**
   * Cache invalidation disabled since Redis was removed
   */
  async invalidateCache(eventId: string): Promise<void> {
    // Note: Cache invalidation disabled since Redis was removed
    // Results are now calculated fresh on each request
  }
}

export const resultService = new ResultService();

