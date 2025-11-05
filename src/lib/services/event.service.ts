import { db } from '@/lib/db/supabase-client';
import { generateInviteCode } from '@/lib/utils/auth';
import type { CreateEventInput } from '@/lib/validators/index';
import type { Event, DecisionFramework } from '@/lib/types';

export class EventService {
  /**
   * Create a new event with full configuration
   */
  async createEvent(input: CreateEventInput, userId?: string): Promise<Event> {
    // Validate decision framework
    this.validateDecisionFramework(input.decisionFramework);

    console.log('DEBUG EventService.createEvent input:', {
      proposalConfig: input.proposalConfig,
      optionMode: input.optionMode,
      title: input.title
    });

    // Begin transaction
    return await db.transaction(async (tx) => {
      // 1. Insert event
      const eventData = {
        title: input.title,
        description: input.description,
        tags: input.tags,
        image_url: input.imageUrl,
        visibility: input.visibility || 'public', // Safety fallback
        start_time: new Date(input.startTime).toISOString(),
        end_time: new Date(input.endTime).toISOString(),
        timezone: input.timezone,
        decision_framework: input.decisionFramework as any,
        option_mode: input.optionMode,
        proposal_config: input.proposalConfig,
        credits_per_voter: input.creditsPerVoter,
        weighting_mode: input.weightingMode,
        weighting_config: input.weightingConfig,
        token_gating: input.tokenGating,
        show_results_during_voting: input.showResultsDuringVoting,
        show_results_after_close: input.showResultsAfterClose,
        // vote_settings: input.voteSettings, // Temporarily disabled until DB migration
        created_by: userId ? userId : null,
        // admin_code: generateInviteCode(), // Temporarily disabled - column doesn't exist in DB
      };

      console.log('DEBUG EventService.createEvent about to insert:', {
        proposalConfig: eventData.proposal_config,
        optionMode: eventData.option_mode
      });

      const event = await tx.events.create(eventData);

      console.log('DEBUG EventService.createEvent after insert:', {
        eventId: event.id,
        proposalConfig: event.proposal_config,
        optionMode: event.option_mode
      });

      // 2. If admin-defined options, insert them
      if (input.optionMode !== 'community_proposals' && input.initialOptions && input.initialOptions.length > 0) {
        const optionData = input.initialOptions.map((opt, index) => ({
          event_id: event.id,
          title: opt.title,
          description: opt.description,
          image_url: opt.imageUrl,
          position: index,
          source: 'admin' as const,
        }));

        await tx.options.create(optionData);
      }

      // 3. If invite list provided, generate codes
      if (input.inviteEmails && input.inviteEmails.length > 0) {
        const inviteRecords = input.inviteEmails.map(email => ({
          event_id: event.id,
          email: email,
          code: generateInviteCode(),
          invite_type: this.determineInviteType(input) as 'voting' | 'proposal_submission' | 'both',
        }));

        await tx.invites.create(inviteRecords);
      }

      return event as Event;
    });
  }
  
  /**
   * Validate decision framework configuration
   */
  private validateDecisionFramework(framework: DecisionFramework): void {
    const { framework_type, config } = framework;
    
    if (framework_type === 'binary_selection') {
      const { threshold_mode } = config;
      
      if (threshold_mode === 'top_n' && !config.top_n_count) {
        throw new Error('top_n_count required for top_n threshold mode');
      }
      if (threshold_mode === 'percentage' && !config.percentage_threshold) {
        throw new Error('percentage_threshold required for percentage mode');
      }
      if (threshold_mode === 'absolute_votes' && !config.absolute_vote_threshold) {
        throw new Error('absolute_vote_threshold required for absolute_votes mode');
      }
    } else if (framework_type === 'proportional_distribution') {
      const { resource_name, total_pool_amount } = config;
      
      if (!resource_name || !total_pool_amount) {
        throw new Error('resource_name and total_pool_amount required for proportional distribution');
      }
      if (total_pool_amount <= 0) {
        throw new Error('total_pool_amount must be positive');
      }
    } else {
      throw new Error('Invalid framework_type');
    }
  }
  
  /**
   * Determine invite type based on event configuration
   */
  private determineInviteType(input: CreateEventInput): string {
    const hasProposals = input.optionMode === 'community_proposals' || input.optionMode === 'hybrid';
    
    if (hasProposals && input.proposalConfig?.access_control === 'invite_only') {
      return 'both';
    }
    return 'voting';
  }
  
  /**
   * Get event by ID with related data
   */
  async getEventById(eventId: string): Promise<(Event & { options: any[] }) | null> {
    const event = await db.events.findById(eventId);

    if (!event) {
      return null;
    }

    // Fetch options separately
    const eventOptions = await db.options.findByEventId(eventId);

    return {
      ...event,
      options: eventOptions
    } as any;
  }
  
  /**
   * Check if event is currently active
   */
  isEventActive(event: Event): boolean {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  }
  
  /**
   * Check if proposals are currently open
   */
  areProposalsOpen(event: Event): boolean {
    if (event.optionMode === 'admin_defined') return false;
    
    const config = event.proposalConfig;
    if (!config || !config.enabled) return false;
    
    const now = new Date();
    return now >= new Date(config.submission_start) && now <= new Date(config.submission_end);
  }
  
  /**
   * Get all active events
   */
  async getActiveEvents(): Promise<Event[]> {
    const result = await db.events.findMany({
      visibility: 'public'
    });

    return result as Event[];
  }
}

export const eventService = new EventService();

