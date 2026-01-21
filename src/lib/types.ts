// Core type definitions for QuadraticVote

// ============================================
// Decision Framework Types
// ============================================

export interface BinaryDecisionConfig {
  threshold_mode: 'top_n' | 'percentage' | 'absolute_votes' | 'above_average';
  top_n_count?: number;
  percentage_threshold?: number;
  absolute_vote_threshold?: number;
  tiebreaker: 'timestamp' | 'random' | 'alphabetical';
}

export interface ProportionalDistributionConfig {
  resource_name: string;
  resource_symbol: string;
  total_pool_amount: number;
  minimum_allocation_enabled?: boolean;
  minimum_allocation_percentage?: number;
  decimal_places?: number;
}

export type DecisionFramework =
  | { framework_type: 'binary_selection'; config: BinaryDecisionConfig }
  | { framework_type: 'proportional_distribution'; config: ProportionalDistributionConfig };

// ============================================
// Proposal Configuration Types
// ============================================

export interface ProposalConfig {
  enabled: boolean;
  submission_start?: string;
  submission_end?: string;
  submissionStart?: string; // camelCase alias
  submissionEnd?: string; // camelCase alias
  moderation_mode?: 'pre_approval' | 'post_approval' | 'none' | 'threshold';
  moderationMode?: string; // camelCase alias
  access_control?: 'public' | 'invite_only';
  accessControl?: string; // camelCase alias
  max_proposals_per_user?: number;
  maxProposalsPerUser?: number; // camelCase alias
}

// ============================================
// Event Types
// ============================================

export interface Event {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  visibility: 'public' | 'private' | 'unlisted';
  startTime: string;
  endTime: string;
  timezone: string;
  decisionFramework: DecisionFramework;
  optionMode: 'admin_defined' | 'community_proposals' | 'hybrid';
  proposalConfig?: ProposalConfig;
  creditsPerVoter: number;
  weightingMode?: 'equal' | 'token_balance' | 'trust_score';
  weightingConfig?: Record<string, unknown>;
  tokenGating?: Record<string, unknown>;
  showResultsDuringVoting: boolean;
  showResultsAfterClose: boolean;
  createdBy?: string;
  adminCode?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Option Types
// ============================================

export interface Option {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  image_url?: string;
  position: number;
  source: 'admin' | 'community';
  created_by_proposal_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Vote Types
// ============================================

export interface Vote {
  id: string;
  event_id: string;
  invite_code: string;
  allocations: Record<string, number>;
  total_credits_used: number;
  ip_address?: string;
  user_agent?: string;
  submitted_at: string;
  updated_at: string;
}

// ============================================
// Proposal Types
// ============================================

export type ProposalStatus =
  | 'draft'
  | 'pending_approval'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'converted';

export interface Proposal {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  image_url?: string;
  submitter_email: string;
  submitter_wallet?: string;
  payout_wallet?: string;
  submitter_anonymous_id: string;
  status: ProposalStatus;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  converted_to_option_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Invite Types
// ============================================

export type InviteType = 'voting' | 'proposal_submission' | 'both';

export interface Invite {
  id: string;
  event_id: string;
  email?: string;
  code: string;
  invite_type: InviteType;
  sent_at?: string;
  used_at?: string;
  vote_submitted_at?: string;
  proposals_submitted: number;
  created_at: string;
  expires_at?: string;
}

// ============================================
// Result Types
// ============================================

export interface OptionWithVotes {
  option_id: string;
  title: string;
  votes: number;
}

export interface BinaryOptionResult extends OptionWithVotes {
  rank: number;
  selected: boolean;
}

export interface Distribution {
  option_id: string;
  title: string;
  votes: number;
  allocation_amount: number;
  allocation_percentage: number;
}

export interface BinaryResults {
  framework_type: 'binary_selection';
  threshold_mode: string;
  selected_options: BinaryOptionResult[];
  not_selected_options: BinaryOptionResult[];
  selected_count: number;
  selection_margin?: number;
}

export interface ProportionalResults {
  framework_type: 'proportional_distribution';
  resource_name: string;
  resource_symbol: string;
  total_pool: number;
  distributions: Distribution[];
  total_allocated: number;
  gini_coefficient: number;
}

export interface EventResults {
  event_id: string;
  framework_type: string;
  results: BinaryResults | ProportionalResults;
  participation: {
    total_voters: number;
    total_credits_allocated: number;
    voting_start: string;
    voting_end: string;
    is_final: boolean;
  };
  calculated_at: Date;
}

// Legacy result types for compatibility
export interface OptionResult {
  optionId: string;
  title: string;
  totalCredits: number;
  quadraticVotes: number;
  voterCount: number;
  percentage: number;
  isWinner?: boolean;
  allocation?: number;
}

// ============================================
// Analytics Types
// ============================================

export interface EventAnalytics {
  eventId: string;
  totalVotes: number;
  totalInvites: number;
  usedInvites: number;
  participationRate: number;
  averageCreditsUsed: number;
  votesOverTime: Array<{ date: string; count: number }>;
  optionBreakdown: Array<{ optionId: string; title: string; votes: number }>;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
