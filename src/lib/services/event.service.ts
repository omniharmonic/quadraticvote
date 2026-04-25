import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/utils/auth';
import { adminService } from '@/lib/services/admin.service';
import type { CreateEventInput } from '@/lib/validators/index';
import type { Event, DecisionFramework } from '@/lib/types';

type DbEventRow = Record<string, any>;

function mapDbEventToEvent(row: DbEventRow): Event & { options?: any[] } {
  const pc = row.proposal_config;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.tags,
    imageUrl: row.image_url,
    visibility: row.visibility,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    decisionFramework: row.decision_framework,
    optionMode: row.option_mode,
    proposalConfig: pc
      ? {
          enabled: pc.enabled ?? true,
          submission_start: pc.submission_start ?? pc.submissionStart,
          submission_end: pc.submission_end ?? pc.submissionEnd,
          submissionStart: pc.submissionStart ?? pc.submission_start,
          submissionEnd: pc.submissionEnd ?? pc.submission_end,
          moderation_mode: pc.moderation_mode ?? pc.moderationMode,
          moderationMode: pc.moderationMode ?? pc.moderation_mode,
          access_control: pc.access_control ?? pc.accessControl,
          accessControl: pc.accessControl ?? pc.access_control,
          max_proposals_per_user: pc.max_proposals_per_user ?? pc.maxProposalsPerUser,
          maxProposalsPerUser: pc.maxProposalsPerUser ?? pc.max_proposals_per_user,
        }
      : undefined,
    creditsPerVoter: row.credits_per_voter,
    weightingMode: row.weighting_mode,
    weightingConfig: row.weighting_config,
    tokenGating: row.token_gating,
    showResultsDuringVoting: row.show_results_during_voting,
    showResultsAfterClose: row.show_results_after_close,
    createdBy: row.created_by,
    adminCode: row.admin_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class EventService {
  /**
   * Create a new event with full configuration.
   */
  async createEvent(input: CreateEventInput, userId?: string): Promise<Event> {
    this.validateDecisionFramework(input.decisionFramework);

    const supabase = createServiceRoleClient();

    const eventData = {
      title: input.title,
      description: input.description,
      tags: input.tags,
      image_url: input.imageUrl,
      visibility: input.visibility || 'public',
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
      created_by: userId ?? null,
    };

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      throw new Error(`Failed to create event: ${eventError.message}`);
    }

    if (
      input.optionMode !== 'community_proposals' &&
      input.initialOptions &&
      input.initialOptions.length > 0
    ) {
      const optionData = input.initialOptions.map((opt, index) => ({
        event_id: event.id,
        title: opt.title,
        description: opt.description,
        image_url: opt.imageUrl,
        position: index,
        source: 'admin' as const,
      }));

      const { error: optionsError } = await supabase.from('options').insert(optionData);
      if (optionsError) throw new Error(`Failed to create options: ${optionsError.message}`);
    }

    if (input.inviteEmails && input.inviteEmails.length > 0) {
      const inviteRecords = input.inviteEmails.map((email) => ({
        event_id: event.id,
        email,
        code: generateInviteCode(),
        invite_type: this.determineInviteType(input) as 'voting' | 'proposal_submission' | 'both',
      }));

      const { error: invitesError } = await supabase.from('invites').insert(inviteRecords);
      if (invitesError) throw new Error(`Failed to create invites: ${invitesError.message}`);
    }

    if (userId) {
      const addAdminResult = await adminService.addEventAdmin(event.id, userId, 'owner');
      if (!addAdminResult.success) {
        console.error('Failed to add creator as admin:', addAdminResult.error);
      }
    }

    return mapDbEventToEvent(event) as Event;
  }

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

  private determineInviteType(input: CreateEventInput): string {
    const hasProposals =
      input.optionMode === 'community_proposals' || input.optionMode === 'hybrid';
    if (hasProposals && input.proposalConfig?.access_control === 'invite_only') {
      return 'both';
    }
    return 'voting';
  }

  /**
   * Get event by ID with options.
   */
  async getEventById(eventId: string): Promise<(Event & { options: any[] }) | null> {
    const supabase = createServiceRoleClient();
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !event) return null;

    const { data: eventOptions } = await supabase
      .from('options')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true });

    return { ...mapDbEventToEvent(event), options: eventOptions || [] } as Event & {
      options: any[];
    };
  }

  isEventActive(event: Event): boolean {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  }

  /**
   * Get all active public events.
   */
  async getActiveEvents(): Promise<Event[]> {
    const supabase = createServiceRoleClient();
    const { data: result, error } = await supabase
      .from('events')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch events: ${error.message}`);
    return (result || []).map(mapDbEventToEvent) as Event[];
  }
}

export const eventService = new EventService();
