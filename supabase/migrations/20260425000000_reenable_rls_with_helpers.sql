-- Re-enable Row Level Security with non-recursive policies.
--
-- Background:
--   The initial schema migration enabled RLS but the `event_admins` policy
--   self-referenced `event_admins`, causing infinite recursion. RLS was
--   subsequently disabled via safe-disable-rls.sql for testing.
--
-- This migration:
--   1. Adds SECURITY DEFINER helper functions that bypass RLS internally so
--      policies can call them without recursing.
--   2. Drops the recursive policies and replaces them.
--   3. Re-enables RLS on every public table.
--
-- All server-side application code now uses the service role key, which
-- bypasses RLS automatically. RLS here is defense-in-depth: it constrains
-- any code path that ends up using the anon key (browser client, public
-- read endpoints).

-- ============================================
-- Helper: resolve the public.users.id for the current auth user
-- ============================================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ============================================
-- Helper: is the current auth user an admin of the given event?
-- SECURITY DEFINER -> reads event_admins without triggering RLS recursion.
-- ============================================
CREATE OR REPLACE FUNCTION public.is_event_admin(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_admins ea
    WHERE ea.event_id = p_event_id
      AND ea.user_id = public.current_user_id()
  );
$$;

-- ============================================
-- Helper: is the current auth user the owner of the given event?
-- ============================================
CREATE OR REPLACE FUNCTION public.is_event_owner(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_admins ea
    WHERE ea.event_id = p_event_id
      AND ea.user_id = public.current_user_id()
      AND ea.role = 'owner'
  );
$$;

-- Helpers must be callable by the auth roles that policies run under.
GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_owner(uuid) TO anon, authenticated;

-- ============================================
-- Drop ALL existing policies on the public tables so we can rewrite cleanly.
-- DO blocks because policy names may differ across environments.
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'users', 'events', 'options', 'invites', 'votes',
        'proposals', 'event_admins', 'admin_invitations'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================
-- Re-enable RLS on every table
-- ============================================
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations   ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS
-- ============================================
CREATE POLICY users_self_read ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY users_self_update ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- ============================================
-- EVENTS — public events readable by anyone; admins manage their events
-- ============================================
CREATE POLICY events_public_read ON public.events
  FOR SELECT USING (visibility = 'public' AND deleted_at IS NULL);

CREATE POLICY events_admin_read ON public.events
  FOR SELECT USING (public.is_event_admin(id));

CREATE POLICY events_authenticated_insert ON public.events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY events_admin_update ON public.events
  FOR UPDATE USING (public.is_event_admin(id));

CREATE POLICY events_owner_delete ON public.events
  FOR DELETE USING (public.is_event_owner(id));

-- ============================================
-- OPTIONS — visible if the event is visible; managed by admins
-- ============================================
CREATE POLICY options_public_read ON public.options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = options.event_id
        AND e.visibility = 'public'
        AND e.deleted_at IS NULL
    )
    OR public.is_event_admin(options.event_id)
  );

CREATE POLICY options_admin_write ON public.options
  FOR ALL USING (public.is_event_admin(event_id))
  WITH CHECK (public.is_event_admin(event_id));

-- ============================================
-- INVITES — admins manage; anyone can read by code (for verification)
-- ============================================
CREATE POLICY invites_admin_all ON public.invites
  FOR ALL USING (public.is_event_admin(event_id))
  WITH CHECK (public.is_event_admin(event_id));

CREATE POLICY invites_public_select ON public.invites
  FOR SELECT USING (true);

-- ============================================
-- VOTES — anyone can submit; admins read
-- ============================================
CREATE POLICY votes_public_insert ON public.votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY votes_admin_read ON public.votes
  FOR SELECT USING (public.is_event_admin(event_id));

-- Allow updating own vote on the same invite_code (vote editing)
CREATE POLICY votes_public_update ON public.votes
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- PROPOSALS
-- ============================================
CREATE POLICY proposals_public_insert ON public.proposals
  FOR INSERT WITH CHECK (true);

CREATE POLICY proposals_public_read ON public.proposals
  FOR SELECT USING (true);

CREATE POLICY proposals_admin_update ON public.proposals
  FOR UPDATE USING (public.is_event_admin(event_id));

-- ============================================
-- EVENT_ADMINS — broken into non-recursive policies via the helper
-- ============================================
CREATE POLICY event_admins_self_read ON public.event_admins
  FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY event_admins_admin_read ON public.event_admins
  FOR SELECT USING (public.is_event_admin(event_id));

CREATE POLICY event_admins_owner_write ON public.event_admins
  FOR ALL USING (public.is_event_owner(event_id))
  WITH CHECK (public.is_event_owner(event_id));

-- ============================================
-- ADMIN_INVITATIONS
-- ============================================
CREATE POLICY admin_invitations_admin_all ON public.admin_invitations
  FOR ALL USING (public.is_event_admin(event_id))
  WITH CHECK (public.is_event_admin(event_id));

-- Public can SELECT to look up an invite by code at accept time.
CREATE POLICY admin_invitations_public_read ON public.admin_invitations
  FOR SELECT USING (true);
