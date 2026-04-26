import 'server-only';
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quadraticvote.xyz';
const fromAddress = fromEmail ? `Quadratic Vote <${fromEmail}>` : undefined;

const resend = apiKey ? new Resend(apiKey) : null;

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

export async function sendVoterInvite(args: {
  to: string;
  eventTitle: string;
  eventId: string;
  code: string;
  inviteType: 'voting' | 'proposal' | 'both' | 'proposal_submission';
}): Promise<EmailSendResult> {
  const inviteUrl = `${appUrl}/events/${args.eventId}/vote?code=${args.code}`;
  const safeTitle = escapeHtml(args.eventTitle);
  const safeUrl = escapeHtml(inviteUrl);

  const subject = `Vote on "${args.eventTitle}"`;
  const text =
    `Your group is making a decision together — and your voice is part of it.\n\n` +
    `Cast your vote: ${inviteUrl}\n\n` +
    `This link is yours alone. Please don't forward it.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 560px; line-height: 1.55;">
      <p style="font-size:15px;">Your group is making a decision together on <strong>${safeTitle}</strong> — and your voice is part of it.</p>
      <p style="margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:3px;font-weight:500;">Cast your vote</a></p>
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
