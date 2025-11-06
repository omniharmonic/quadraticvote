import { supabase } from '@/lib/db/supabase-client';
import { hashString } from '@/lib/utils/auth';
import type { Proposal } from '@/lib/types';

export class ProposalService {
  /**
   * Submit a new proposal
   */
  async submitProposal(input: {
    eventId: string;
    title: string;
    description?: string;
    imageUrl?: string;
    submitterEmail: string;
    submitterWallet?: string;
    payoutWallet?: string;
    inviteCode?: string;
  }): Promise<Proposal> {
    // 1. Validate event accepts proposals
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', input.eventId)
      .single();

    if (eventError || !event) throw new Error('Event not found');
    if (!this.areProposalsOpen(event)) throw new Error('Proposal submission is closed');
    
    // 2. Validate submitter authorization if needed
    if ((event.proposalConfig as any)?.access_control === 'invite_only') {
      if (!input.inviteCode) throw new Error('Invite code required');
      await this.validateSubmitter(event.id, input.submitterEmail, input.inviteCode);
    }
    
    // 3. Generate anonymous ID
    const anonymousId = hashString(input.submitterEmail);
    
    // 4. Determine initial status based on moderation mode
    const initialStatus = this.getInitialStatus(event.proposalConfig);
    
    // 5. Insert proposal
    const { data: proposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        event_id: input.eventId,
        title: input.title,
        description: input.description,
        image_url: input.imageUrl,
        submitter_email: input.submitterEmail,
        submitter_wallet: input.submitterWallet,
        payout_wallet: input.payoutWallet,
        submitter_anonymous_id: anonymousId,
        status: initialStatus,
        submitted_at: initialStatus !== 'draft' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create proposal: ${insertError.message}`);
    }

    // 6. Auto-convert to option if approved (simplified)
    if (initialStatus === 'approved') {
      await this.convertSingleProposalToOption(proposal);
    }

    // 7. Update invite tracking if applicable (simplified)
    if (input.inviteCode) {
      await supabase
        .from('invites')
        .update({ proposals_submitted: 1 })
        .eq('code', input.inviteCode);
    }

    return proposal as Proposal;
  }
  
  /**
   * Check if proposals are currently open
   */
  private areProposalsOpen(event: any): boolean {
    console.log('DEBUG: Checking if proposals are open for event:', {
      eventId: event.id,
      optionMode: event.optionMode,
      proposalConfig: event.proposalConfig,
      startTime: event.startTime,
      endTime: event.endTime
    });

    if (event.optionMode === 'admin_defined') {
      console.log('DEBUG: Proposals blocked - admin_defined mode');
      return false;
    }

    // Check if proposalConfig exists and is properly configured
    if (!event.proposalConfig) {
      console.log('DEBUG: Proposals blocked - no proposalConfig found');
      return false;
    }

    // If enabled is explicitly false, block proposals
    if (event.proposalConfig.enabled === false) {
      console.log('DEBUG: Proposals blocked - explicitly disabled in config');
      return false;
    }

    const now = new Date();
    console.log('DEBUG: Current time:', now.toISOString());

    // Support both camelCase and snake_case for backwards compatibility
    const submissionStart = event.proposalConfig.submissionStart || event.proposalConfig.submission_start;
    const submissionEnd = event.proposalConfig.submissionEnd || event.proposalConfig.submission_end;

    console.log('DEBUG: Submission window from config:', {
      submissionStart,
      submissionEnd,
      hasSubmissionWindow: !!(submissionStart && submissionEnd),
      configKeys: Object.keys(event.proposalConfig || {})
    });

    if (!submissionStart || !submissionEnd) {
      // If no submission window specified, allow submissions during event time
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const isWithinEventTime = now >= eventStart && now <= eventEnd;

      console.log('DEBUG: No submission window, checking event time:', {
        eventStart: eventStart.toISOString(),
        eventEnd: eventEnd.toISOString(),
        isWithinEventTime
      });

      return isWithinEventTime;
    }

    // Parse submission window with proper timezone handling
    let startTime, endTime;
    try {
      startTime = new Date(submissionStart);
      endTime = new Date(submissionEnd);

      // Validate dates are valid
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.log('DEBUG: Invalid submission dates, falling back to event time');
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        return now >= eventStart && now <= eventEnd;
      }
    } catch (error) {
      console.log('DEBUG: Error parsing submission dates:', error);
      // Fall back to event time window
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return now >= eventStart && now <= eventEnd;
    }

    const isWithinSubmissionWindow = now >= startTime && now <= endTime;

    console.log('DEBUG: Checking submission window:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isWithinSubmissionWindow,
      nowIsoString: now.toISOString()
    });

    return isWithinSubmissionWindow;
  }
  
  /**
   * Validate submitter is authorized
   */
  private async validateSubmitter(
    eventId: string,
    email: string,
    inviteCode: string
  ): Promise<void> {
    const { data: invite, error } = await supabase
      .from('invites')
      .select('*')
      .eq('event_id', eventId)
      .eq('code', inviteCode)
      .single();

    if (error || !invite) throw new Error('Invalid invite code');
    if (invite.invite_type === 'voting') {
      throw new Error('This code is only for voting');
    }
  }
  
  /**
   * Determine initial proposal status based on moderation mode
   */
  private getInitialStatus(proposalConfig: any): string {
    if (!proposalConfig) return 'pending_approval';

    const { moderation_mode } = proposalConfig;

    switch (moderation_mode) {
      case 'pre_approval':
        return 'pending_approval';
      case 'post_approval':
      case 'none':
        return 'approved';
      case 'threshold':
        return 'submitted';
      default:
        return 'pending_approval';
    }
  }

  /**
   * Convert a single proposal to an option (simplified)
   */
  private async convertSingleProposalToOption(proposal: any): Promise<void> {
    // Skip if already converted
    if (proposal.converted_to_option_id) return;

    // Get current max position for this event
    const { data: existingOptions } = await supabase
      .from('options')
      .select('position')
      .eq('event_id', proposal.event_id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingOptions && existingOptions.length > 0
      ? existingOptions[0].position + 1
      : 0;

    // Insert as option
    const { data: option, error: optionError } = await supabase
      .from('options')
      .insert({
        event_id: proposal.event_id,
        title: proposal.title,
        description: proposal.description,
        image_url: proposal.image_url,
        position: nextPosition,
        source: 'community',
        created_by_proposal_id: proposal.id,
      })
      .select()
      .single();

    if (optionError) {
      throw new Error(`Failed to create option: ${optionError.message}`);
    }

    // Update proposal with option ID
    await supabase
      .from('proposals')
      .update({ converted_to_option_id: option.id })
      .eq('id', proposal.id);
  }
  
  /**
   * Get proposals for an event
   */
  async getProposalsByEventId(
    eventId: string,
    status?: string
  ): Promise<Proposal[]> {
    let query = supabase
      .from('proposals')
      .select('*')
      .eq('event_id', eventId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: result, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }

    return result as Proposal[];
  }

  /**
   * Get all proposals across all events (for admin)
   */
  async getAllProposals(status?: string): Promise<Proposal[]> {
    let query = supabase
      .from('proposals')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data: result, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }

    return result as Proposal[];
  }
  
  /**
   * Approve proposal (admin action) - automatically converts to option
   */
  async approveProposal(proposalId: string, adminUserId: string | null): Promise<void> {
    // 1. Update proposal status
    const { data: proposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUserId,
      })
      .eq('id', proposalId)
      .select()
      .single();

    if (updateError || !proposal) {
      throw new Error('Proposal not found or failed to update');
    }

    // 2. Automatically convert to option
    await this.convertSingleProposalToOption(proposal);
  }
  
  /**
   * Reject proposal (admin action)
   */
  async rejectProposal(
    proposalId: string,
    reason: string,
    adminUserId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('proposals')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        rejected_by: adminUserId,
      })
      .eq('id', proposalId);

    if (error) {
      throw new Error(`Failed to reject proposal: ${error.message}`);
    }
  }
  
  /**
   * Convert approved proposals to voting options (simplified)
   */
  async convertProposalsToOptions(eventId: string): Promise<number> {
    // Get all approved proposals that haven't been converted yet
    const { data: approvedProposals, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .is('converted_to_option_id', null);

    if (error) {
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }

    if (!approvedProposals || approvedProposals.length === 0) {
      return 0;
    }

    let converted = 0;

    for (const proposal of approvedProposals) {
      try {
        await this.convertSingleProposalToOption(proposal);
        converted++;
      } catch (error) {
        console.error(`Failed to convert proposal ${proposal.id}:`, error);
        // Continue with other proposals
      }
    }

    return converted;
  }
}

export const proposalService = new ProposalService();

