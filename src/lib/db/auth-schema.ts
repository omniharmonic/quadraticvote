import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users, events } from './schema';

// Event Admins Association Table - Links users to events they can admin
export const eventAdmins = pgTable('event_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Role hierarchy: 'owner' > 'admin'
  // - owner: Can delete event, manage all admins
  // - admin: Can manage event settings, invite other admins
  role: varchar('role', { length: 20 }).notNull().default('admin'),

  // Audit trail
  invitedBy: uuid('invited_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  eventIdIdx: index('idx_event_admins_event_id').on(table.eventId),
  userIdIdx: index('idx_event_admins_user_id').on(table.userId),
  roleIdx: index('idx_event_admins_role').on(table.role),
  uniqueEventUser: uniqueIndex('idx_event_admins_unique').on(table.eventId, table.userId),
}));

// Admin Invitations Table - Pending admin invitations
export const adminInvitations = pgTable('admin_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),

  // Invitee info
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('admin'),

  // Invitation details
  inviteCode: varchar('invite_code', { length: 64 }).notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),

  // Status tracking
  acceptedAt: timestamp('accepted_at'),
  acceptedBy: uuid('accepted_by').references(() => users.id),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  eventIdIdx: index('idx_admin_invitations_event_id').on(table.eventId),
  emailIdx: index('idx_admin_invitations_email').on(table.email),
  codeIdx: uniqueIndex('idx_admin_invitations_code').on(table.inviteCode),
  invitedByIdx: index('idx_admin_invitations_invited_by').on(table.invitedBy),
  expiresAtIdx: index('idx_admin_invitations_expires_at').on(table.expiresAt),
}));

export type EventAdmin = typeof eventAdmins.$inferSelect;
export type NewEventAdmin = typeof eventAdmins.$inferInsert;
export type AdminInvitation = typeof adminInvitations.$inferSelect;
export type NewAdminInvitation = typeof adminInvitations.$inferInsert;