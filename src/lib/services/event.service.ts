import { db } from '@/lib/db/client';
import { events, options, invites } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { generateInviteCode } from '@/lib/utils/auth';
import type { CreateEventInput } from '@/lib/validators';
import type { Event, DecisionFramework } from '@/lib/types';

export class EventService {
  /**
   * Create a new event with full configuration
   */
  async createEvent(input: CreateEventInput, userId?: string): Promise<Event> {
    // Validate decision framework
    this.validateDecisionFramework(input.decisionFramework);
    
    // Begin transaction
    return await db.transaction(async (tx) => {
      // 1. Insert event
      const [event] = await tx.insert(events).values({
        title: input.title,
        description: input.description,
        tags: input.tags,
        imageUrl: input.imageUrl,
        visibility: input.visibility,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        timezone: input.timezone,
        decisionFramework: input.decisionFramework as any,
        optionMode: input.optionMode,
        proposalConfig: input.proposalConfig,
        creditsPerVoter: input.creditsPerVoter,
        weightingMode: input.weightingMode,
        weightingConfig: input.weightingConfig,
        tokenGating: input.tokenGating,
        showResultsDuringVoting: input.showResultsDuringVoting,
        showResultsAfterClose: input.showResultsAfterClose,
        createdBy: userId ? userId : null,
      }).returning();
      
      // 2. If admin-defined options, insert them
      if (input.optionMode !== 'community_proposals' && input.initialOptions && input.initialOptions.length > 0) {
        await tx.insert(options).values(
          input.initialOptions.map((opt, index) => ({
            eventId: event.id,
            title: opt.title,
            description: opt.description,
            imageUrl: opt.imageUrl,
            position: index,
            source: 'admin' as const,
          }))
        );
      }
      
      // 3. If invite list provided, generate codes
      if (input.inviteEmails && input.inviteEmails.length > 0) {
        const inviteRecords = input.inviteEmails.map(email => ({
          eventId: event.id,
          email: email,
          code: generateInviteCode(),
          inviteType: this.determineInviteType(input) as 'voting' | 'proposal_submission' | 'both',
        }));
        
        await tx.insert(invites).values(inviteRecords);
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
    const eventResults = await db.select().from(events).where(
      and(
        eq(events.id, eventId),
        isNull(events.deletedAt)
      )
    ).limit(1);

    if (eventResults.length === 0) {
      return null;
    }

    const event = eventResults[0];

    // Fetch options separately
    const eventOptions = await db.select().from(options).where(eq(options.eventId, eventId));

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
    const now = new Date();
    const result = await db.query.events.findMany({
      where: and(
        isNull(events.deletedAt),
        eq(events.visibility, 'public')
      ),
    });
    
    return result as Event[];
  }
}

export const eventService = new EventService();

