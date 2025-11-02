import { db } from '@/lib/db/client';
import { votes, invites, events, options } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redis, redisKeys } from '@/lib/redis/client';
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
    
    // 5. Insert or update vote
    const [vote] = await db.insert(votes)
      .values({
        eventId: eventId,
        inviteCode: inviteCode,
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
    
    // 6. Update invite tracking
    await db.update(invites)
      .set({ 
        voteSubmittedAt: new Date(),
        usedAt: new Date(),
      })
      .where(eq(invites.code, inviteCode));
    
    // 7. Invalidate cached results
    await redis.del(redisKeys.results(eventId));
    
    // 8. Update live aggregation (if real-time enabled)
    if (event.showResultsDuringVoting) {
      await this.updateLiveAggregation(eventId, allocations);
    }
    
    return vote as Vote;
  }
  
  /**
   * Validate invite code for this event
   */
  private async validateInviteCode(eventId: string, code: string): Promise<any> {
    const inviteResults = await db.select().from(invites).where(
      and(
        eq(invites.eventId, eventId),
        eq(invites.code, code)
      )
    ).limit(1);
    const invite = inviteResults[0];
    
    if (!invite) throw new Error('Invalid invite code');
    if (invite.inviteType === 'proposal_submission') {
      throw new Error('This code is only for proposal submission');
    }
    
    return invite;
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
  
  /**
   * Update live vote aggregation in Redis
   */
  private async updateLiveAggregation(
    eventId: string,
    allocations: Record<string, number>
  ): Promise<void> {
    try {
      // Calculate quadratic votes
      const quadraticVotes = calculateQuadraticVotes(allocations);
      
      // Update Redis hash
      const key = redisKeys.votesLive(eventId);
      for (const [optionId, voteValue] of Object.entries(quadraticVotes)) {
        await redis.hincrbyfloat(key, optionId, voteValue);
      }
    } catch (error) {
      console.error('Failed to update live aggregation:', error);
      // Don't fail the vote submission if Redis update fails
    }
  }
  
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

