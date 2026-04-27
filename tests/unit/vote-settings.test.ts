import { describe, it, expect } from 'vitest';

// vote.service imports `server-only`, which blows up under vitest unless we
// neutralize it first. Keep this import order — the mock has to win the race
// with vote.service's own import statement.
import { vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    // Methods on the real client aren't called by the pure helpers we test,
    // so a no-op object is sufficient.
  }),
}));

import {
  readVoteSettings,
  assertWithinVotingWindow,
  assertEmailVerificationOk,
  canFallThroughToAnonymous,
} from '@/lib/services/vote.service';
import { DEFAULT_VOTE_SETTINGS } from '@/lib/services/event.service';

const NOW = new Date('2026-04-27T12:00:00Z');
const ONE_HOUR_MS = 60 * 60 * 1000;

const eventWindow = (offsetStartMs: number, offsetEndMs: number) => ({
  start_time: new Date(NOW.getTime() + offsetStartMs).toISOString(),
  end_time: new Date(NOW.getTime() + offsetEndMs).toISOString(),
});

describe('readVoteSettings', () => {
  it('falls back to defaults when vote_settings is missing', () => {
    expect(readVoteSettings({})).toEqual(DEFAULT_VOTE_SETTINGS);
    expect(readVoteSettings({ vote_settings: null })).toEqual(DEFAULT_VOTE_SETTINGS);
    expect(readVoteSettings({ vote_settings: 'garbage' })).toEqual(DEFAULT_VOTE_SETTINGS);
  });

  it('preserves explicit booleans, fills missing keys from defaults', () => {
    const settings = readVoteSettings({
      vote_settings: { allowAnonymous: false, allowLateSubmissions: true },
    });
    expect(settings).toEqual({
      ...DEFAULT_VOTE_SETTINGS,
      allowAnonymous: false,
      allowLateSubmissions: true,
    });
  });

  it('ignores non-boolean values for individual keys', () => {
    const settings = readVoteSettings({
      vote_settings: {
        allowVoteChanges: 'yes',
        allowAnonymous: 0,
        requireEmailVerification: null,
      },
    });
    expect(settings).toEqual(DEFAULT_VOTE_SETTINGS);
  });
});

describe('assertWithinVotingWindow', () => {
  it('rejects when now is before start', () => {
    const event = eventWindow(+ONE_HOUR_MS, +2 * ONE_HOUR_MS);
    expect(() =>
      assertWithinVotingWindow(event, { allowLateSubmissions: false }, NOW)
    ).toThrow(/has not started/);
  });

  it('accepts when now is inside the window', () => {
    const event = eventWindow(-ONE_HOUR_MS, +ONE_HOUR_MS);
    expect(() =>
      assertWithinVotingWindow(event, { allowLateSubmissions: false }, NOW)
    ).not.toThrow();
  });

  it('rejects when now is after end and allowLateSubmissions is off', () => {
    const event = eventWindow(-2 * ONE_HOUR_MS, -ONE_HOUR_MS);
    expect(() =>
      assertWithinVotingWindow(event, { allowLateSubmissions: false }, NOW)
    ).toThrow(/closed/i);
  });

  it('accepts late submissions when allowLateSubmissions is on', () => {
    const event = eventWindow(-2 * ONE_HOUR_MS, -ONE_HOUR_MS);
    expect(() =>
      assertWithinVotingWindow(event, { allowLateSubmissions: true }, NOW)
    ).not.toThrow();
  });

  it('still rejects pre-start ballots even when late submissions are on', () => {
    const event = eventWindow(+ONE_HOUR_MS, +2 * ONE_HOUR_MS);
    expect(() =>
      assertWithinVotingWindow(event, { allowLateSubmissions: true }, NOW)
    ).toThrow(/has not started/);
  });
});

describe('assertEmailVerificationOk', () => {
  it('is a no-op when the toggle is off', () => {
    expect(() =>
      assertEmailVerificationOk({ requireEmailVerification: false })
    ).not.toThrow();
    expect(() =>
      assertEmailVerificationOk({ requireEmailVerification: false }, undefined)
    ).not.toThrow();
  });

  it('rejects unauthenticated callers when the toggle is on', () => {
    expect(() =>
      assertEmailVerificationOk({ requireEmailVerification: true })
    ).toThrow(/verified email/i);
  });

  it('rejects authenticated callers without a verified email', () => {
    expect(() =>
      assertEmailVerificationOk(
        { requireEmailVerification: true },
        { userId: 'u1', email: 'a@b.test', emailVerified: false }
      )
    ).toThrow(/verified email/i);
  });

  it('accepts authenticated callers with a verified email', () => {
    expect(() =>
      assertEmailVerificationOk(
        { requireEmailVerification: true },
        { userId: 'u1', email: 'a@b.test', emailVerified: true }
      )
    ).not.toThrow();
  });
});

describe('canFallThroughToAnonymous', () => {
  it('allows fall-through on public + allowAnonymous', () => {
    expect(
      canFallThroughToAnonymous({ visibility: 'public', allowAnonymous: true })
    ).toBe(true);
  });

  it('rejects fall-through when public but anonymous voting is off', () => {
    expect(() =>
      canFallThroughToAnonymous({ visibility: 'public', allowAnonymous: false })
    ).toThrow(/anonymous voting/i);
  });

  it('returns false (caller will reject as Invalid code) for private events', () => {
    expect(
      canFallThroughToAnonymous({ visibility: 'private', allowAnonymous: true })
    ).toBe(false);
  });

  it('returns false for unlisted events too', () => {
    expect(
      canFallThroughToAnonymous({ visibility: 'unlisted', allowAnonymous: true })
    ).toBe(false);
  });
});
