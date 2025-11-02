// Decision Framework Types
export type DecisionFrameworkType = 'binary_selection' | 'proportional_distribution';

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

export type DecisionFramework = {
  framework_type: 'binary_selection';
  config: BinaryDecisionConfig;
} | {
  framework_type: 'proportional_distribution';
  config: ProportionalDistributionConfig;
};

// Event Types
export interface Event {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  visibility: 'public' | 'private' | 'unlisted';
  startTime: Date;
  endTime: Date;
  timezone: string;
  decisionFramework: DecisionFramework;
  optionMode: 'admin_defined' | 'community_proposals' | 'hybrid';
  proposalConfig?: any;
  creditsPerVoter: number;
  weightingMode?: string;
  weightingConfig?: any;
  tokenGating?: any;
  showResultsDuringVoting: boolean;
  showResultsAfterClose: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Option Types
export interface Option {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  position: number;
  source: 'admin' | 'community' | 'merged';
  createdByProposalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Vote Types
export interface Vote {
  id: string;
  eventId: string;
  inviteCode: string;
  allocations: Record<string, number>;
  totalCreditsUsed: number;
  submittedAt: Date;
  updatedAt: Date;
}

// Results Types
export interface OptionWithVotes {
  option_id: string;
  title: string;
  votes: number;
}

export interface BinaryOptionResult extends OptionWithVotes {
  rank: number;
  selected: boolean;
}

export interface BinaryResults {
  framework_type: 'binary_selection';
  threshold_mode: string;
  selected_options: BinaryOptionResult[];
  not_selected_options: BinaryOptionResult[];
  selected_count: number;
  selection_margin?: number;
}

export interface Distribution {
  option_id: string;
  title: string;
  votes: number;
  allocation_amount: number;
  allocation_percentage: number;
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
  framework_type: DecisionFrameworkType;
  results: BinaryResults | ProportionalResults;
  participation: {
    total_voters: number;
    total_credits_allocated: number;
    voting_start: Date;
    voting_end: Date;
    is_final: boolean;
  };
  calculated_at: Date;
}

// Proposal Types
export interface Proposal {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  submitterEmail: string;
  submitterWallet?: string;
  submitterAnonymousId: string;
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'merged';
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  editedByAdmin: boolean;
  adminEditLog: any;
  flagged: boolean;
  flagCount: number;
  convertedToOptionId?: string;
  mergedIntoProposalId?: string;
  mergeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Invite Types
export interface Invite {
  id: string;
  eventId: string;
  email: string;
  code: string;
  inviteType: 'voting' | 'proposal_submission' | 'both';
  metadata: any;
  sentAt?: Date;
  openedAt?: Date;
  usedAt?: Date;
  voteSubmittedAt?: Date;
  proposalsSubmitted: number;
  proposalIds: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

