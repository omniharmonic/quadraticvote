import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  integer,
  jsonb,
  inet,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

// Events table - core of the system
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Basic metadata
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  tags: text('tags').array(),
  imageUrl: text('image_url'),
  
  // Visibility
  visibility: varchar('visibility', { length: 20 }).notNull(),
  
  // Timing
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  
  // Decision Framework (CRITICAL)
  decisionFramework: jsonb('decision_framework').notNull(),
  
  // Option creation mode
  optionMode: varchar('option_mode', { length: 50 }).notNull(),
  
  // Proposal configuration
  proposalConfig: jsonb('proposal_config'),
  
  // Voting configuration
  creditsPerVoter: integer('credits_per_voter').notNull().default(100),
  weightingMode: varchar('weighting_mode', { length: 50 }).default('equal'),
  weightingConfig: jsonb('weighting_config'),
  
  // Token gating
  tokenGating: jsonb('token_gating'),
  
  // Results configuration
  showResultsDuringVoting: boolean('show_results_during_voting').default(false),
  showResultsAfterClose: boolean('show_results_after_close').default(true),
  
  // Ownership
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Soft delete
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  createdByIdx: index('idx_events_created_by').on(table.createdBy),
  startTimeIdx: index('idx_events_start_time').on(table.startTime),
  endTimeIdx: index('idx_events_end_time').on(table.endTime),
  visibilityIdx: index('idx_events_visibility').on(table.visibility),
}));

// Options table
export const options = pgTable('options', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  
  // Content
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  
  // Ordering
  position: integer('position').notNull(),
  
  // Source tracking
  source: varchar('source', { length: 20 }).notNull(),
  createdByProposalId: uuid('created_by_proposal_id'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  eventIdIdx: index('idx_options_event_id').on(table.eventId),
  sourceIdx: index('idx_options_source').on(table.source),
  uniquePosition: uniqueIndex('idx_options_event_position').on(table.eventId, table.position),
}));

// Proposals table
export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  
  // Content
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  
  // Submitter (anonymized)
  submitterEmail: varchar('submitter_email', { length: 255 }).notNull(),
  submitterWallet: varchar('submitter_wallet', { length: 42 }),
  submitterAnonymousId: varchar('submitter_anonymous_id', { length: 64 }).notNull(),
  
  // Status tracking
  status: varchar('status', { length: 30 }).notNull(),
  submittedAt: timestamp('submitted_at'),
  approvedAt: timestamp('approved_at'),
  approvedBy: uuid('approved_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  
  // Moderation
  editedByAdmin: boolean('edited_by_admin').default(false),
  adminEditLog: jsonb('admin_edit_log').default(sql`'[]'::jsonb`),
  flagged: boolean('flagged').default(false),
  flagCount: integer('flag_count').default(0),
  
  // Conversion
  convertedToOptionId: uuid('converted_to_option_id').references(() => options.id),
  mergedIntoProposalId: uuid('merged_into_proposal_id'),
  mergeReason: text('merge_reason'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  eventIdIdx: index('idx_proposals_event_id').on(table.eventId),
  statusIdx: index('idx_proposals_status').on(table.status),
  submitterEmailIdx: index('idx_proposals_submitter_email').on(table.submitterEmail),
  submittedAtIdx: index('idx_proposals_submitted_at').on(table.submittedAt),
}));

// Invites table
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  
  // Identity
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  
  // Purpose
  inviteType: varchar('invite_type', { length: 20 }).notNull(),
  
  // Metadata
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  
  // Tracking
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  usedAt: timestamp('used_at'),
  voteSubmittedAt: timestamp('vote_submitted_at'),
  
  // Proposal tracking
  proposalsSubmitted: integer('proposals_submitted').default(0),
  proposalIds: uuid('proposal_ids').array().default(sql`'{}'::uuid[]`),
  
  // Security
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex('idx_invites_code').on(table.code),
  eventIdIdx: index('idx_invites_event_id').on(table.eventId),
  emailIdx: index('idx_invites_email').on(table.email),
  inviteTypeIdx: index('idx_invites_invite_type').on(table.inviteType),
}));

// Votes table
export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  inviteCode: varchar('invite_code', { length: 64 }).notNull().references(() => invites.code),
  
  // Allocations: { option_id: credits_allocated }
  allocations: jsonb('allocations').notNull(),
  
  // Pre-calculated for performance
  totalCreditsUsed: integer('total_credits_used').notNull(),
  
  // Timestamps
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Security
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}, (table) => ({
  eventIdIdx: index('idx_votes_event_id').on(table.eventId),
  inviteCodeIdx: index('idx_votes_invite_code').on(table.inviteCode),
  submittedAtIdx: index('idx_votes_submitted_at').on(table.submittedAt),
  uniqueVote: uniqueIndex('idx_votes_event_code').on(table.eventId, table.inviteCode),
}));

// Proposal flags table
export const proposalFlags = pgTable('proposal_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').notNull().references(() => proposals.id, { onDelete: 'cascade' }),
  
  // Flagger (can be anonymous)
  flaggerEmail: varchar('flagger_email', { length: 255 }),
  flaggerIpHash: varchar('flagger_ip_hash', { length: 64 }).notNull(),
  
  // Reason
  reason: varchar('reason', { length: 30 }),
  reasonText: text('reason_text'),
  
  // Metadata
  flaggedAt: timestamp('flagged_at').defaultNow(),
}, (table) => ({
  proposalIdIdx: index('idx_proposal_flags_proposal_id').on(table.proposalId),
  flaggerIpHashIdx: index('idx_proposal_flags_flagger_ip_hash').on(table.flaggerIpHash),
}));

// Cached results table (optional but recommended)
export const cachedResults = pgTable('cached_results', {
  eventId: uuid('event_id').primaryKey().references(() => events.id, { onDelete: 'cascade' }),
  
  // Results data (framework-specific structure)
  results: jsonb('results').notNull(),
  
  // Cache metadata
  calculatedAt: timestamp('calculated_at').defaultNow(),
  voteCount: integer('vote_count').notNull(),
  isFinal: boolean('is_final').default(false),
  
  // TTL (for cache invalidation)
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  expiresAtIdx: index('idx_cached_results_expires_at').on(table.expiresAt),
}));

