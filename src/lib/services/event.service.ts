import { supabase } from '@/lib/db/supabase-client';
import { generateInviteCode } from '@/lib/utils/auth';
import { adminService } from '@/lib/services/admin.service';
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
      created_by: userId ? userId : null,
    };

    console.log('DEBUG EventService.createEvent about to insert:', {
      proposalConfig: eventData.proposal_config,
      optionMode: eventData.option_mode
    });

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      throw new Error(`Failed to create event: ${eventError.message}`);
    }

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

      const { error: optionsError } = await supabase
        .from('options')
        .insert(optionData);

      if (optionsError) {
        throw new Error(`Failed to create options: ${optionsError.message}`);
      }
    }

    // 3. If invite list provided, generate codes
    if (input.inviteEmails && input.inviteEmails.length > 0) {
      const inviteRecords = input.inviteEmails.map(email => ({
        event_id: event.id,
        email: email,
        code: generateInviteCode(),
        invite_type: this.determineInviteType(input) as 'voting' | 'proposal_submission' | 'both',
      }));

      const { error: invitesError } = await supabase
        .from('invites')
        .insert(inviteRecords);

      if (invitesError) {
        throw new Error(`Failed to create invites: ${invitesError.message}`);
      }
    }

    // 4. Add creator as event owner
    if (userId) {
      const addAdminResult = await adminService.addEventAdmin(event.id, userId, 'owner');
      if (!addAdminResult.success) {
        console.error('Failed to add creator as admin:', addAdminResult.error);
        // Don't fail event creation for this, but log the error
      }
    }

    return event as Event;
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
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return null;
    }

    // Fetch options separately
    const { data: eventOptions } = await supabase
      .from('options')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true });

    // Map snake_case database fields to camelCase frontend fields
    const mappedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      tags: event.tags,
      imageUrl: event.image_url,
      visibility: event.visibility,
      startTime: event.start_time,
      endTime: event.end_time,
      timezone: event.timezone,
      decisionFramework: event.decision_framework,
      optionMode: event.option_mode,
      proposalConfig: event.proposal_config,
      creditsPerVoter: event.credits_per_voter,
      weightingMode: event.weighting_mode,
      weightingConfig: event.weighting_config,
      tokenGating: event.token_gating,
      showResultsDuringVoting: event.show_results_during_voting,
      showResultsAfterClose: event.show_results_after_close,
      createdBy: event.created_by,
      adminCode: event.admin_code, // This might be undefined if column doesn't exist
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      options: eventOptions || []
    };

    return mappedEvent as any;
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
    const { data: result, error } = await supabase
      .from('events')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    // Map snake_case database fields to camelCase frontend fields
    const mappedEvents = (result || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      tags: event.tags,
      imageUrl: event.image_url,
      visibility: event.visibility,
      startTime: event.start_time,
      endTime: event.end_time,
      timezone: event.timezone,
      decisionFramework: event.decision_framework,
      optionMode: event.option_mode,
      proposalConfig: event.proposal_config,
      creditsPerVoter: event.credits_per_voter,
      weightingMode: event.weighting_mode,
      weightingConfig: event.weighting_config,
      tokenGating: event.token_gating,
      showResultsDuringVoting: event.show_results_during_voting,
      showResultsAfterClose: event.show_results_after_close,
      createdBy: event.created_by,
      adminCode: event.admin_code,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    }));

    return mappedEvents as Event[];
  }
}

export const eventService = new EventService();

