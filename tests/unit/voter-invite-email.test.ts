import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// The Resend mock has to be in place before the module under test loads,
// because email.service.ts captures Resend at import time. We capture the
// last `send` payload so each test can assert on the rendered html/text.
const sendMock = vi.fn(async () => ({ error: null }));
vi.mock('resend', () => ({
  Resend: class { emails = { send: sendMock }; },
}));

// email.service reads these at import time too.
process.env.RESEND_API_KEY = 'test-key';
process.env.FROM_EMAIL = 'no-reply@example.test';
process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';

import { sendVoterInvite } from '@/lib/services/email.service';

beforeEach(() => sendMock.mockClear());

describe('sendVoterInvite — context-aware caveats', () => {
  it('plain voting invite (defaults): no caveat block', async () => {
    await sendVoterInvite({
      to: 'a@b.test', eventTitle: 'Spring Budget', eventId: 'evt-1',
      code: 'abc-123', inviteType: 'voting',
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const args = (sendMock.mock.calls[0] as any[])[0] as { subject: string; html: string; text: string };
    expect(args.subject).toBe('Vote on "Spring Budget"');
    expect(args.html).toContain('Cast your vote');
    expect(args.html).toContain('https://app.test/events/evt-1/vote?code=abc-123');
    // None of the caveats fire when nothing was passed
    expect(args.html).not.toMatch(/sign in or create/i);
    expect(args.html).not.toMatch(/first ballot as final/i);
    expect(args.text).not.toMatch(/Voting closes/i);
  });

  it('requireEmailVerification=true: adds the sign-in caveat', async () => {
    await sendVoterInvite({
      to: 'a@b.test', eventTitle: 'Spring Budget', eventId: 'evt-1',
      code: 'abc-123', inviteType: 'voting',
      requireEmailVerification: true,
    });
    const args = (sendMock.mock.calls[0] as any[])[0] as { subject: string; html: string; text: string };
    expect(args.html).toMatch(/sign in or create a free account/i);
    expect(args.text).toMatch(/sign in or create a free account/i);
  });

  it('allowVoteChanges=false: warns ballot is final', async () => {
    await sendVoterInvite({
      to: 'a@b.test', eventTitle: 'Spring Budget', eventId: 'evt-1',
      code: 'abc-123', inviteType: 'voting',
      allowVoteChanges: false,
    });
    const args = (sendMock.mock.calls[0] as any[])[0] as { subject: string; html: string; text: string };
    expect(args.html).toMatch(/first ballot as final/i);
    expect(args.text).toMatch(/first ballot as final/i);
  });

  it('endTime: includes a localized closing deadline', async () => {
    await sendVoterInvite({
      to: 'a@b.test', eventTitle: 'Spring Budget', eventId: 'evt-1',
      code: 'abc-123', inviteType: 'voting',
      endTime: '2026-05-15T20:00:00Z',
    });
    const args = (sendMock.mock.calls[0] as any[])[0] as { subject: string; html: string; text: string };
    expect(args.html).toMatch(/Voting closes/i);
    expect(args.text).toMatch(/Voting closes/i);
  });

  it('proposal_submission: links to /propose with proposal-flavored copy', async () => {
    await sendVoterInvite({
      to: 'a@b.test', eventTitle: 'Spring Budget', eventId: 'evt-1',
      code: 'abc-123', inviteType: 'proposal_submission',
    });
    const args = (sendMock.mock.calls[0] as any[])[0] as { subject: string; html: string; text: string };
    expect(args.subject).toBe('Submit a proposal for "Spring Budget"');
    expect(args.html).toContain('https://app.test/events/evt-1/propose?code=abc-123');
    expect(args.html).toContain('Submit a proposal');
    expect(args.html).not.toContain('Cast your vote');
  });

  it('all toggles together: every caveat present, no duplication', async () => {
    await sendVoterInvite({
      to: 'a@b.test', eventTitle: 'Spring Budget', eventId: 'evt-1',
      code: 'abc-123', inviteType: 'voting',
      requireEmailVerification: true,
      allowVoteChanges: false,
      endTime: '2026-05-15T20:00:00Z',
    });
    const args = (sendMock.mock.calls[0] as any[])[0] as { subject: string; html: string; text: string };
    expect(args.html).toMatch(/Voting closes/i);
    expect(args.html).toMatch(/sign in or create/i);
    expect(args.html).toMatch(/first ballot as final/i);
    // Caveat list is rendered exactly once (one <ul>)
    expect((args.html.match(/<ul/g) || []).length).toBe(1);
  });
});
