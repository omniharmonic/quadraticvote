-- QuadraticVote Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table (syncs with Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- ============================================
-- Events Table
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',

  -- Decision Framework (JSONB for flexibility)
  decision_framework JSONB NOT NULL,

  -- Option Configuration
  option_mode TEXT NOT NULL CHECK (option_mode IN ('admin_defined', 'community_proposals', 'hybrid')),
  proposal_config JSONB,

  -- Voting Configuration
  credits_per_voter INTEGER NOT NULL DEFAULT 100,
  weighting_mode TEXT DEFAULT 'equal' CHECK (weighting_mode IN ('equal', 'token_balance', 'trust_score')),
  weighting_config JSONB,
  token_gating JSONB,

  -- Display Settings
  show_results_during_voting BOOLEAN DEFAULT FALSE,
  show_results_after_close BOOLEAN DEFAULT TRUE,

  -- Admin
  admin_code TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- ============================================
-- Options Table (voting choices)
-- ============================================
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'community')),
  created_by_proposal_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_options_event_id ON options(event_id);
CREATE INDEX IF NOT EXISTS idx_options_position ON options(event_id, position);

-- ============================================
-- Invites Table (voter invitations)
-- ============================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email TEXT,
  code TEXT NOT NULL,
  invite_type TEXT NOT NULL DEFAULT 'voting' CHECK (invite_type IN ('voting', 'proposal_submission', 'both')),

  -- Tracking
  sent_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  vote_submitted_at TIMESTAMPTZ,
  proposals_submitted INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(event_id, code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invites_event_id ON invites(event_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);

-- ============================================
-- Votes Table
-- ============================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,

  -- Vote data (JSONB: { optionId: credits })
  allocations JSONB NOT NULL DEFAULT '{}',
  total_credits_used INTEGER NOT NULL DEFAULT 0,

  -- Metadata for analytics/security
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, invite_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_votes_event_id ON votes(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_invite_code ON votes(invite_code);

-- ============================================
-- Proposals Table (community submissions)
-- ============================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Submitter info (anonymized for voting)
  submitter_email TEXT NOT NULL,
  submitter_wallet TEXT,
  payout_wallet TEXT,
  submitter_anonymous_id TEXT NOT NULL,

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('draft', 'pending_approval', 'submitted', 'approved', 'rejected', 'converted')),

  -- Moderation
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- Conversion to option
  converted_to_option_id UUID REFERENCES options(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposals_event_id ON proposals(event_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_submitter_anonymous_id ON proposals(submitter_anonymous_id);

-- ============================================
-- Event Admins Table
-- ============================================
CREATE TABLE IF NOT EXISTS event_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_admins_event_id ON event_admins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_user_id ON event_admins(user_id);

-- ============================================
-- Admin Invitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  invite_code TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Status
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_invitations_event_id ON admin_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_invite_code ON admin_invitations(invite_code);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Events policies (public events visible to all, private only to admins)
CREATE POLICY "Public events are viewable by everyone" ON events
  FOR SELECT USING (visibility = 'public' OR deleted_at IS NULL);

CREATE POLICY "Admins can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update their events" ON events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_admins
      WHERE event_admins.event_id = events.id
      AND event_admins.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Options policies
CREATE POLICY "Options are viewable for public events" ON options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = options.event_id
      AND (events.visibility = 'public' OR events.deleted_at IS NULL)
    )
  );

CREATE POLICY "Event admins can manage options" ON options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_admins
      WHERE event_admins.event_id = options.event_id
      AND event_admins.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Invites policies
CREATE POLICY "Event admins can manage invites" ON invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_admins
      WHERE event_admins.event_id = invites.event_id
      AND event_admins.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can verify invite codes" ON invites
  FOR SELECT USING (true);

-- Votes policies
CREATE POLICY "Anyone can submit votes" ON votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Event admins can view votes" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_admins
      WHERE event_admins.event_id = votes.event_id
      AND event_admins.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Proposals policies
CREATE POLICY "Anyone can submit proposals" ON proposals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Proposals are viewable for events" ON proposals
  FOR SELECT USING (true);

CREATE POLICY "Event admins can update proposals" ON proposals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_admins
      WHERE event_admins.event_id = proposals.event_id
      AND event_admins.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Event admins policies
CREATE POLICY "Users can view event admins for their events" ON event_admins
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM event_admins ea2
      WHERE ea2.event_id = event_admins.event_id
      AND ea2.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Event owners can manage admins" ON event_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_admins ea2
      WHERE ea2.event_id = event_admins.event_id
      AND ea2.role = 'owner'
      AND ea2.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Admin invitations policies
CREATE POLICY "Event admins can manage invitations" ON admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_admins
      WHERE event_admins.event_id = admin_invitations.event_id
      AND event_admins.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can view invitation by code" ON admin_invitations
  FOR SELECT USING (true);

-- ============================================
-- Triggers for updated_at timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_options_updated_at
  BEFORE UPDATE ON options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function to sync auth.users to public.users
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (auth_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Service Role Bypass (for API routes)
-- ============================================
-- Note: Service role key bypasses RLS automatically
-- These policies allow the service role full access

CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to events" ON events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to options" ON options
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to invites" ON invites
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to votes" ON votes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to proposals" ON proposals
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to event_admins" ON event_admins
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to admin_invitations" ON admin_invitations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
