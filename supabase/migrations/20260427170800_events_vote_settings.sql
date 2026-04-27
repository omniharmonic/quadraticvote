-- Add vote_settings JSONB to events.
--
-- Carries the four runtime toggles surfaced in the create-event wizard and
-- editable from the event settings page. Defaults match the historical
-- pre-toggle behavior so existing rows don't change semantics:
--
--   allowVoteChanges:          true   (votes are upsertable)
--   allowLateSubmissions:      false  (server enforces window strictly)
--   requireEmailVerification:  false  (no auth requirement on /votes)
--   allowAnonymous:            true   (public events allow anon ballots)
--
-- Enforcement lives in vote.service.ts; persistence in event.service.ts.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS vote_settings JSONB NOT NULL DEFAULT jsonb_build_object(
    'allowVoteChanges',         true,
    'allowLateSubmissions',     false,
    'requireEmailVerification', false,
    'allowAnonymous',           true
  );
