import { supabase } from '@/lib/supabase';
import { calculateQuadraticVotes, getTotalCredits } from '@/lib/utils/quadratic';
import type { Vote } from '@/lib/types';

export class VoteService {
  /**
   * Submit or update a vote
   */
  async submitVote(
    eventId: string,
    inviteCode: string,
    allocations: Record<string, number>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<Vote> {
    // 1. Validate invite code
    const invite = await this.validateInviteCode(eventId, inviteCode);

    // 2. Validate event is active
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) throw new Error('Event not found');
    if (!this.isVotingOpen(event)) throw new Error('Voting is closed');

    // 3. Validate credit allocation
    await this.validateAllocations(event, allocations);

    // 4. Calculate total credits used
    const totalCredits = getTotalCredits(allocations);

    // 5. Handle anonymous voting for public events
    let finalInviteCode = inviteCode;
    if (invite.isVirtual && inviteCode === 'anonymous') {
      // Generate a unique identifier for anonymous voters based on IP + User Agent
      const crypto = require('crypto');
      const identifier = crypto.createHash('sha256')
        .update(`${metadata?.ipAddress || 'unknown'}-${metadata?.userAgent || 'unknown'}-${eventId}`)
        .digest('hex')
        .substring(0, 32);
      finalInviteCode = `anon_${identifier}`;
    }

    // 6. Insert or update vote (simplified for immediate deployment)
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .upsert({
        event_id: eventId,
        invite_code: finalInviteCode,
        allocations: allocations,
        total_credits_used: totalCredits,
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
      })
      .select()
      .single();

    if (voteError) {
      throw new Error(`Failed to submit vote: ${voteError.message}`);
    }
    
    // 6. Update invite tracking (skip for virtual invites)
    if (!invite.isVirtual) {
      const { error: trackingError } = await supabase
        .from('invites')
        .update({
          vote_submitted_at: new Date().toISOString(),
          used_at: new Date().toISOString(),
        })
        .eq('code', finalInviteCode);

      if (trackingError) {
        console.error('Failed to update invite tracking:', trackingError);
        // Don't fail the vote for tracking errors
      }
    }
    
    // 7. Skip cache invalidation (Redis removed)
    // Note: Results cache invalidation disabled since Redis was removed

    // 8. Skip live aggregation (Redis removed)
    // Note: Live aggregation disabled since Redis was removed
    
    return vote as Vote;
  }
  
  /**
   * Validate invite code for this event
   */
  private async validateInviteCode(eventId: string, code: string): Promise<any> {
    // First, check if a specific invite code exists
    const { data: invite } = await supabase
      .from('invites')
      .select('*')
      .eq('event_id', eventId)
      .eq('code', code)
      .limit(1)
      .single();

    if (invite) {
      if (invite.invite_type === 'proposal_submission') {
        throw new Error('This code is only for proposal submission');
      }
      return invite;
    }

    // If no specific invite found, check if this is a public event
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event) throw new Error('Event not found');

    // For public events, allow voting without specific invite codes
    if (event.visibility === 'public') {
      // Create a virtual invite for tracking purposes
      return {
        event_id: eventId,
        code: code,
        invite_type: 'voting',
        created_at: new Date(),
        isVirtual: true // Flag to indicate this is not a real database invite
      };
    }

    // For private events, invite code is required
    throw new Error('Invalid invite code');
  }
  
  /**
   * Check if voting is currently open
   */
  private isVotingOpen(event: any): boolean {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  }
  
  /**
   * Validate vote allocations
   */
  private async validateAllocations(
    event: any,
    allocations: Record<string, number>
  ): Promise<void> {
    // Get valid option IDs for this event
    const { data: validOptions } = await supabase
      .from('options')
      .select('id')
      .eq('event_id', event.id);

    const validOptionIds = new Set((validOptions || []).map(o => o.id));

    // Check all allocated option IDs are valid
    for (const optionId of Object.keys(allocations)) {
      if (!validOptionIds.has(optionId)) {
        throw new Error(`Invalid option ID: ${optionId}`);
      }
    }

    // Check credit sum
    const totalCredits = getTotalCredits(allocations);
    if (totalCredits > event.credits_per_voter) {
      throw new Error(`Total credits (${totalCredits}) exceeds limit (${event.credits_per_voter})`);
    }

    // Check all values are non-negative integers
    for (const [optionId, credits] of Object.entries(allocations)) {
      if (credits < 0 || !Number.isInteger(credits)) {
        throw new Error(`Invalid credit allocation for option ${optionId}`);
      }
    }
  }
  
  // Note: updateLiveAggregation method removed since Redis was removed
  
  /**
   * Get voter's current allocation
   */
  async getVoteByCode(eventId: string, inviteCode: string): Promise<Vote | null> {
    const { data: vote } = await supabase
      .from('votes')
      .select('*')
      .eq('event_id', eventId)
      .eq('invite_code', inviteCode)
      .single();

    return vote ? (vote as Vote) : null;
  }
  
  /**
   * Get all votes for an event (for results calculation)
   */
  async getVotesByEventId(eventId: string): Promise<Vote[]> {
    const { data: result } = await supabase
      .from('votes')
      .select('*')
      .eq('event_id', eventId);

    return (result || []) as Vote[];
  }
}

export const voteService = new VoteService();

