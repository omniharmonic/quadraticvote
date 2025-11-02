import { z } from 'zod';

// Decision Framework Schemas
export const binaryDecisionConfigSchema = z.object({
  threshold_mode: z.enum(['top_n', 'percentage', 'absolute_votes', 'above_average']),
  top_n_count: z.number().int().positive().optional(),
  percentage_threshold: z.number().min(0).max(100).optional(),
  absolute_vote_threshold: z.number().positive().optional(),
  tiebreaker: z.enum(['timestamp', 'random', 'alphabetical']),
});

export const proportionalDistributionConfigSchema = z.object({
  resource_name: z.string().min(1).max(50),
  resource_symbol: z.string().min(1).max(10),
  total_pool_amount: z.number().positive(),
  minimum_allocation_enabled: z.boolean().optional(),
  minimum_allocation_percentage: z.number().min(0).max(100).optional(),
  decimal_places: z.number().int().min(0).max(8).optional(),
});

export const decisionFrameworkSchema = z.discriminatedUnion('framework_type', [
  z.object({
    framework_type: z.literal('binary_selection'),
    config: binaryDecisionConfigSchema,
  }),
  z.object({
    framework_type: z.literal('proportional_distribution'),
    config: proportionalDistributionConfigSchema,
  }),
]);

// Event Creation Schema
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().default('UTC'),
  decisionFramework: decisionFrameworkSchema,
  optionMode: z.enum(['admin_defined', 'community_proposals', 'hybrid']),
  proposalConfig: z.any().optional(),
  creditsPerVoter: z.number().int().min(10).max(10000).default(100),
  weightingMode: z.enum(['equal', 'token_balance', 'trust_score']).optional(),
  weightingConfig: z.any().optional(),
  tokenGating: z.any().optional(),
  showResultsDuringVoting: z.boolean().default(false),
  showResultsAfterClose: z.boolean().default(true),
  initialOptions: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    imageUrl: z.string().url().optional(),
  })).optional(),
  inviteEmails: z.array(z.string().email()).optional(),
});

// Vote Submission Schema
export const submitVoteSchema = z.object({
  inviteCode: z.string().min(1),
  allocations: z.record(z.string().uuid(), z.number().int().min(0)),
});

// Proposal Submission Schema
export const submitProposalSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  submitterEmail: z.string().email(),
  submitterWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  inviteCode: z.string().optional(),
});

// Export types
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type SubmitVoteInput = z.infer<typeof submitVoteSchema>;
export type SubmitProposalInput = z.infer<typeof submitProposalSchema>;

