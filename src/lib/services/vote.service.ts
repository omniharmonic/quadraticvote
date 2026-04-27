import 'server-only';
import { createHash } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase';

const supabase = createServiceRoleClient();

/**
 * Stable identifier for an anonymous voter on a public event. Used both
 * when writing a new ballot and when looking up an existing one so the
 * same browser sees the same vote.
 */
export function computeAnonInviteCode(
  eventId: string,
  ipAddress?: string,
  userAgent?: string
): string {
  const identifier = createHash('sha256')
    .update(`${ipAddress || 'unknown'}-${userAgent || 'unknown'}-${eventId}`)
    .digest('hex')
    .substring(0, 32);
  return `anon_${identifier}`;
}
import { calculateQuadraticVotes, getTotalCredits } from '@/lib/utils/quadratic';
import type { Vote } from '@/lib/types';
import {
  DEFAULT_VOTE_SETTINGS,
  type VoteSettings,
} from '@/lib/services/event.service';

interface VoteAuthContext {
  /** Authenticated user id, when one was attached to the request. */
  userId?: string;
  /** Authenticated user's email, when present. */
  email?: string;
  /** True iff the auth provider has confirmed the user's email. */
  emailVerified?: boolean;
}

/**
 * Pull a normalized VoteSettings out of a raw events row. Exported so the
 * unit tests can exercise the toggle defaults directly.
 */
export function readVoteSettings(eventRow: any): VoteSettings {
  const v = eventRow?.vote_settings;
  if (!v || typeof v !== 'object') return { ...DEFAULT_VOTE_SETTINGS };
  return {
    allowVoteChanges:
      typeof v.allowVoteChanges === 'boolean'
        ? v.allowVoteChanges
        : DEFAULT_VOTE_SETTINGS.allowVoteChanges,
    allowLateSubmissions:
      typeof v.allowLateSubmissions === 'boolean'
        ? v.allowLateSubmissions
        : DEFAULT_VOTE_SETTINGS.allowLateSubmissions,
    requireEmailVerification:
      typeof v.requireEmailVerification === 'boolean'
        ? v.requireEmailVerification
        : DEFAULT_VOTE_SETTINGS.requireEmailVerification,
    allowAnonymous:
      typeof v.allowAnonymous === 'boolean'
        ? v.allowAnonymous
        : DEFAULT_VOTE_SETTINGS.allowAnonymous,
  };
}

/**
 * Pure window check used inside `submitVote`. Exported for unit tests.
 *
 * Throws when the request falls outside the voting window. `allowLateSubmissions`
 * relaxes the upper bound only — voting can never start before `start_time`.
 */
export function assertWithinVotingWindow(
  event: { start_time: string | Date; end_time: string | Date },
  settings: Pick<VoteSettings, 'allowLateSubmissions'>,
  now: Date = new Date()
): void {
  const start = new Date(event.start_time as any);
  const end = new Date(event.end_time as any);
  if (now < start) throw new Error('Voting has not started yet');
  if (now > end && !settings.allowLateSubmissions) {
    throw new Error('Voting is closed');
  }
}

/**
 * Pure pre-check for the email-verification toggle. Throws when the toggle
 * is on and the caller's auth context doesn't carry a confirmed email.
 */
export function assertEmailVerificationOk(
  settings: Pick<VoteSettings, 'requireEmailVerification'>,
  auth?: VoteAuthContext
): void {
  if (!settings.requireEmailVerification) return;
  if (!auth?.userId || !auth.emailVerified) {
    throw new Error(
      'This event requires a signed-in account with a verified email'
    );
  }
}

/**
 * Pure pre-check for the anonymous-voter fall-through path.
 *
 * Returns `true` when the caller may proceed as an anonymous voter (i.e. no
 * real invite row matched, but the event allows it). Throws when the event
 * is public-but-no-anon, returns `false` when the event is private/unlisted
 * and no real invite was found (caller should reject with "Invalid invite
 * code").
 */
export function canFallThroughToAnonymous(eventCtx: {
  visibility: string;
  allowAnonymous: boolean;
}): boolean {
  if (eventCtx.visibility !== 'public') return false;
  if (!eventCtx.allowAnonymous) {
    throw new Error(
      'This event is public but does not allow anonymous voting. Enter a valid invite code.'
    );
  }
  return true;
}

export class VoteService {
  /**
   * Submit or update a vote
   */
  async submitVote(
    eventId: string,
    inviteCode: string,
    allocations: Record<string, number>,
    metadata?: { ipAddress?: string; userAgent?: string; auth?: VoteAuthContext }
  ): Promise<Vote> {
    // 1. Load event (needed before invite validation so toggles can shape it).
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) throw new Error('Event not found');
    const settings = readVoteSettings(event);

    // 2. Window check, with optional late-submission grace.
    assertWithinVotingWindow(event, settings);

    // 3. Email-verification gate, when required by the event.
    assertEmailVerificationOk(settings, metadata?.auth);

    // 4. Validate the invite/anon path. Pass settings so this layer can
    // refuse `anonymous` ballots when the event has disabled them.
    const invite = await this.validateInviteCode(eventId, inviteCode, {
      visibility: event.visibility,
      allowAnonymous: settings.allowAnonymous,
    });

    // 5. Validate credit allocation
    await this.validateAllocations(event, allocations);

    // 6. Calculate total credits used
    const totalCredits = getTotalCredits(allocations);

    // 7. Resolve final invite code (anon → IP/UA hash).
    let finalInviteCode = inviteCode;
    if (invite.isVirtual && inviteCode === 'anonymous') {
      finalInviteCode = computeAnonInviteCode(
        eventId,
        metadata?.ipAddress,
        metadata?.userAgent
      );
    }

    // 8. allowVoteChanges gate — block the upsert path when disabled and a
    // ballot already exists for this voter.
    if (!settings.allowVoteChanges) {
      const { data: existing } = await supabase
        .from('votes')
        .select('id')
        .eq('event_id', eventId)
        .eq('invite_code', finalInviteCode)
        .maybeSingle();

      if (existing) {
        throw new Error(
          'This event does not allow vote changes — your ballot has already been recorded'
        );
      }
    }

    // 9. Insert or update vote.
    //
    // The votes table has a UNIQUE (event_id, invite_code) constraint to
    // enforce one ballot per voter. We must tell supabase-js to use that
    // constraint as the conflict target — without `onConflict` it falls
    // back to the primary key and a re-submitted ballot trips the unique
    // and 500s.
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .upsert(
        {
          event_id: eventId,
          invite_code: finalInviteCode,
          allocations: allocations,
          total_credits_used: totalCredits,
          ip_address: metadata?.ipAddress,
          user_agent: metadata?.userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,invite_code' }
      )
      .select()
      .single();

    if (voteError) {
      throw new Error(`Failed to submit vote: ${voteError.message}`);
    }

    // 10. Update invite tracking (skip for virtual invites).
    // Only set used_at if it's not already set — preserves the original
    // open time so dashboard "opened" vs "voted" can diverge meaningfully.
    if (!invite.isVirtual) {
      const now = new Date().toISOString();
      const trackingUpdate: Record<string, string> = {
        vote_submitted_at: now,
      };
      if (!invite.used_at) trackingUpdate.used_at = now;

      const { error: trackingError } = await supabase
        .from('invites')
        .update(trackingUpdate)
        .eq('code', finalInviteCode);

      if (trackingError) {
        console.error('Failed to update invite tracking:', trackingError);
      }
    }

    return vote as Vote;
  }
  
  /**
   * Validate invite code for this event.
   *
   * Resolution order:
   *  1. A real invite row matching the code (any visibility).
   *  2. Anonymous fall-through, only on public events that allow it.
   */
  private async validateInviteCode(
    eventId: string,
    code: string,
    eventCtx: { visibility: string; allowAnonymous: boolean }
  ): Promise<any> {
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

    // No real invite. Anonymous fall-through is only legal on public events
    // that haven't disabled anonymous participation.
    if (canFallThroughToAnonymous(eventCtx)) {
      return {
        event_id: eventId,
        code: code,
        invite_type: 'voting',
        created_at: new Date(),
        isVirtual: true,
      };
    }

    // For private/unlisted events, an invite code is required.
    throw new Error('Invalid invite code');
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

