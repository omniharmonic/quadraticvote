import { z } from 'zod';

// Proposal submission validation schema
export const submitProposalSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  imageUrl: z.string()
    .url('Invalid image URL')
    .optional()
    .or(z.literal('')),
  submitterEmail: z.string()
    .email('Invalid email address'),
  submitterWallet: z.string()
    .optional()
    .or(z.literal('')),
  eventId: z.string()
    .min(1, 'Event ID is required'),
  inviteCode: z.string()
    .optional()
    .or(z.literal(''))
});

// Event creation validation schema
export const createEventSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  startTime: z.string()
    .min(1, 'Start time is required'),
  endTime: z.string()
    .min(1, 'End time is required'),
  creditsPerVoter: z.number()
    .min(1, 'Credits per voter must be at least 1')
    .max(1000, 'Credits per voter must be 1000 or less'),
  decisionFramework: z.object({
    framework_type: z.enum(['binary_selection', 'proportional_distribution']),
    config: z.record(z.any())
  }),
  optionMode: z.enum(['admin_defined', 'community_proposals', 'hybrid']),
  options: z.array(z.object({
    title: z.string().min(1, 'Option title is required'),
    description: z.string().optional()
  })).optional(),
  voteSettings: z.object({
    allowVoteChanges: z.boolean().default(false),
    allowLateSubmissions: z.boolean().default(false),
    showLiveResults: z.boolean().default(false),
    requireEmailVerification: z.boolean().default(false)
  }).optional()
});

// Invite creation validation schema
export const createInviteSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  email: z.string().email('Invalid email address').optional(),
  sendEmail: z.boolean().default(false),
  expiresAt: z.string().optional()
});

// Vote submission validation schema
export const submitVoteSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  inviteCode: z.string().min(1, 'Invite code is required'),
  votes: z.array(z.object({
    optionId: z.string().min(1, 'Option ID is required'),
    credits: z.number().min(0, 'Credits must be non-negative')
  })).min(1, 'At least one vote is required')
});

export type SubmitProposalRequest = z.infer<typeof submitProposalSchema>;
export type CreateEventRequest = z.infer<typeof createEventSchema>;
export type CreateInviteRequest = z.infer<typeof createInviteSchema>;
export type SubmitVoteRequest = z.infer<typeof submitVoteSchema>;