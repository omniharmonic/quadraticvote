import 'server-only';
import { Resend } from 'resend';

// Read env at call time so tests (and post-boot config changes) take
// effect, and so a mocked `resend` module wins when vitest hoists vi.mock
// above this file's import.
function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://quadraticvote.xyz',
    fromAddress: fromEmail ? `Quadratic Vote <${fromEmail}>` : undefined,
    resend: apiKey ? new Resend(apiKey) : null,
  };
}

export type EmailSendResult = { sent: boolean; error?: string };

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function send(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailSendResult> {
  const { resend, fromAddress } = getResendConfig();
  if (!resend || !fromAddress) {
    console.warn('[email] RESEND_API_KEY or FROM_EMAIL not configured — skipping send');
    return { sent: false, error: 'email_not_configured' };
  }

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (error) {
      console.error('[email] Resend returned error:', error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] Send threw:', err);
    return { sent: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}

function formatDeadline(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}

export async function sendVoterInvite(args: {
  to: string;
  eventTitle: string;
  eventId: string;
  code: string;
  inviteType: 'voting' | 'proposal' | 'both' | 'proposal_submission';
  /** When set, email body warns the recipient they'll need to sign in. */
  requireEmailVerification?: boolean;
  /** When false, email body warns that the ballot is final on first submit. */
  allowVoteChanges?: boolean;
  /** ISO datetime — included as the closing deadline in the body. */
  endTime?: string;
}): Promise<EmailSendResult> {
  const { appUrl } = getResendConfig();
  const isProposal = args.inviteType === 'proposal_submission';
  const path = isProposal ? `/events/${args.eventId}/propose` : `/events/${args.eventId}/vote`;
  const inviteUrl = `${appUrl}${path}?code=${args.code}`;
  const safeTitle = escapeHtml(args.eventTitle);
  const safeUrl = escapeHtml(inviteUrl);
  const deadline = formatDeadline(args.endTime);

  const subject = isProposal
    ? `Submit a proposal for "${args.eventTitle}"`
    : `Vote on "${args.eventTitle}"`;

  const opener = isProposal
    ? `The community is collecting proposals for ${safeTitle}.`
    : `Your group is making a decision together on ${safeTitle} — and your voice is part of it.`;

  const cta = isProposal ? 'Submit a proposal' : 'Cast your vote';

  // Build conditional caveats — these are the bits that prevent the
  // "I clicked the link and got an unexpected gate" surprise.
  const caveatsHtml: string[] = [];
  const caveatsText: string[] = [];
  if (deadline) {
    caveatsHtml.push(`Voting closes <strong>${escapeHtml(deadline)}</strong>.`);
    caveatsText.push(`Voting closes ${deadline}.`);
  }
  if (args.requireEmailVerification) {
    caveatsHtml.push(
      `You&rsquo;ll be asked to sign in or create a free account so the organizer can confirm your email.`
    );
    caveatsText.push(
      "You'll be asked to sign in or create a free account so the organizer can confirm your email."
    );
  }
  if (args.allowVoteChanges === false) {
    caveatsHtml.push(
      `<strong>Heads up:</strong> the organizer has set the first ballot as final &mdash; once you submit, you can&rsquo;t edit it.`
    );
    caveatsText.push(
      'Heads up: the organizer has set the first ballot as final — once you submit, you cannot edit it.'
    );
  }

  const caveatsHtmlBlock = caveatsHtml.length
    ? `<ul style="color:#444;font-size:13.5px;margin:18px 0;padding-left:18px;">${caveatsHtml.map(c => `<li style="margin-bottom:6px;">${c}</li>`).join('')}</ul>`
    : '';
  const caveatsTextBlock = caveatsText.length
    ? '\n\n' + caveatsText.map(c => `  • ${c}`).join('\n')
    : '';

  const text =
    `${isProposal
      ? `The community is collecting proposals for "${args.eventTitle}".`
      : `Your group is making a decision together on "${args.eventTitle}" — and your voice is part of it.`}` +
    caveatsTextBlock +
    `\n\n${cta}: ${inviteUrl}\n\n` +
    `This link is yours alone. Please don't forward it.`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 560px; line-height: 1.55;">
      <p style="font-size:15px;">${opener}</p>
      ${caveatsHtmlBlock}
      <p style="margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:3px;font-weight:500;">${cta}</a></p>
      <p style="color:#666;font-size:13px;">Link not working? Paste this into your browser:<br/><code style="word-break:break-all;">${safeUrl}</code></p>
      <p style="color:#888;font-size:12px;margin-top:24px;">This link is yours alone — please don't forward it.</p>
    </div>
  `;

  return send({ to: args.to, subject, text, html });
}

export async function sendAdminInvite(args: {
  to: string;
  eventTitle: string;
  code: string;
  role: 'admin' | 'owner';
}): Promise<EmailSendResult> {
  const { appUrl } = getResendConfig();
  const inviteUrl = `${appUrl}/admin/invite?code=${args.code}`;
  const safeTitle = escapeHtml(args.eventTitle);
  const safeUrl = escapeHtml(inviteUrl);
  const roleLabel = args.role === 'owner' ? 'an owner' : 'an admin';

  const subject = `Help run "${args.eventTitle}"`;
  const text =
    `You've been added as ${roleLabel} on "${args.eventTitle}".\n\n` +
    `Accept and get started: ${inviteUrl}\n\n` +
    `This invite expires in 7 days.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 560px; line-height: 1.55;">
      <p style="font-size:15px;">You've been added as <strong>${roleLabel}</strong> on <strong>${safeTitle}</strong>.</p>
      <p style="margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:3px;font-weight:500;">Accept &amp; get started</a></p>
      <p style="color:#666;font-size:13px;">Link not working? Paste this into your browser:<br/><code style="word-break:break-all;">${safeUrl}</code></p>
      <p style="color:#888;font-size:12px;margin-top:24px;">This invite expires in 7 days.</p>
    </div>
  `;

  return send({ to: args.to, subject, text, html });
}
