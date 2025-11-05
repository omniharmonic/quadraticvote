import { db } from '@/lib/db/client';
import { votes, invites, events, options } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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
    const eventResults = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    const event = eventResults[0];

    if (!event) throw new Error('Event not found');
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

    // 6. Insert or update vote
    const [vote] = await db.insert(votes)
      .values({
        eventId: eventId,
        inviteCode: finalInviteCode,
        allocations: allocations as any,
        totalCreditsUsed: totalCredits,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      })
      .onConflictDoUpdate({
        target: [votes.eventId, votes.inviteCode],
        set: {
          allocations: allocations as any,
          totalCreditsUsed: totalCredits,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // 6. Update invite tracking (skip for virtual invites)
    if (!invite.isVirtual) {
      await db.update(invites)
        .set({
          voteSubmittedAt: new Date(),
          usedAt: new Date(),
        })
        .where(eq(invites.code, inviteCode));
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
    const inviteResults = await db.select().from(invites).where(
      and(
        eq(invites.eventId, eventId),
        eq(invites.code, code)
      )
    ).limit(1);
    const invite = inviteResults[0];

    if (invite) {
      if (invite.inviteType === 'proposal_submission') {
        throw new Error('This code is only for proposal submission');
      }
      return invite;
    }

    // If no specific invite found, check if this is a public event
    const eventResults = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    const event = eventResults[0];

    if (!event) throw new Error('Event not found');

    // For public events, allow voting without specific invite codes
    if (event.visibility === 'public') {
      // Create a virtual invite for tracking purposes
      return {
        eventId: eventId,
        code: code,
        inviteType: 'voting',
        createdAt: new Date(),
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
    const validOptions = await db.select({ id: options.id }).from(options).where(eq(options.eventId, event.id));
    
    const validOptionIds = new Set(validOptions.map(o => o.id));
    
    // Check all allocated option IDs are valid
    for (const optionId of Object.keys(allocations)) {
      if (!validOptionIds.has(optionId)) {
        throw new Error(`Invalid option ID: ${optionId}`);
      }
    }
    
    // Check credit sum
    const totalCredits = getTotalCredits(allocations);
    if (totalCredits > event.creditsPerVoter) {
      throw new Error(`Total credits (${totalCredits}) exceeds limit (${event.creditsPerVoter})`);
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
    const voteResults = await db.select().from(votes).where(
      and(
        eq(votes.eventId, eventId),
        eq(votes.inviteCode, inviteCode)
      )
    ).limit(1);
    const vote = voteResults[0];
    
    return vote ? (vote as Vote) : null;
  }
  
  /**
   * Get all votes for an event (for results calculation)
   */
  async getVotesByEventId(eventId: string): Promise<Vote[]> {
    const result = await db.select().from(votes).where(eq(votes.eventId, eventId));

    return result as Vote[];
  }
}

export const voteService = new VoteService();

