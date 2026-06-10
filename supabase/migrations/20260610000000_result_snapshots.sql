-- Immutable result snapshots.
--
-- When an event closes, the first results read freezes the computed tally
-- into this table and subsequent reads serve the frozen row. This makes the
-- final outcome citable and reproducible instead of being recomputed (and
-- potentially drifting) on every request. A late ballot accepted under
-- allowLateSubmissions deletes the row so the next read re-freezes.

CREATE TABLE IF NOT EXISTS public.result_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  results JSONB NOT NULL,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_result_snapshots_event_id
  ON public.result_snapshots (event_id);

-- Only the service role (which bypasses RLS) reads/writes snapshots; the
-- public reaches them through the results API, which applies the event's
-- visibility rules.
ALTER TABLE public.result_snapshots ENABLE ROW LEVEL SECURITY;
