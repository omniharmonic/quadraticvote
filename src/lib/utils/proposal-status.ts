/**
 * Pure helper for deciding a proposal's initial status from an event's
 * proposal_config. Lives outside proposal.service.ts so it can be unit
 * tested without the server-only Supabase client.
 *
 * Why both casings: proposal_config is JSONB. The frontend writes camelCase
 * (`moderationMode`); older rows or future migrations may use snake_case
 * (`moderation_mode`). Both must work or auto-approval silently fails.
 */
export type ProposalConfig = {
  moderation_mode?: string;
  moderationMode?: string;
} | null | undefined;

export type ProposalStatus =
  | 'draft'
  | 'pending_approval'
  | 'submitted'
  | 'approved'
  | 'rejected';

export function getInitialProposalStatus(
  proposalConfig: ProposalConfig
): ProposalStatus {
  if (!proposalConfig) return 'pending_approval';

  const mode = proposalConfig.moderation_mode ?? proposalConfig.moderationMode;

  switch (mode) {
    case 'pre_approval':
      return 'pending_approval';
    case 'post_approval':
    case 'post_moderation':
    case 'none':
      return 'approved';
    case 'threshold':
      return 'submitted';
    default:
      return 'pending_approval';
  }
}
