-- Postgres-backed sliding-window rate limiter.
--
-- Strategy: each (key, window_start) pair holds the count of requests
-- received during that bucket. The rate-limit check inserts-or-increments
-- the current bucket and returns the running count; if it exceeds the
-- caller's limit, the request is denied.
--
-- A periodic job (or a cleanup-on-write strategy) prunes old rows.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);

-- The rate_limits table is queried from the API layer using the service
-- role key. RLS is on for parity with other tables, but no policies are
-- created — only the service role (which bypasses RLS) should ever touch
-- this table.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- check_rate_limit(key, window_seconds, max_count)
--
-- Inserts/updates the current window's count atomically and returns
-- TRUE when the request is allowed, FALSE when it is over the limit.
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_count INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Bucket the current time into a window aligned to p_window_seconds.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limits AS rl (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE
    SET count = rl.count + 1
  RETURNING rl.count INTO v_count;

  RETURN QUERY SELECT (v_count <= p_max_count) AS allowed, v_count AS current_count;
END;
$$;

-- ============================================
-- prune_rate_limits(older_than_seconds)
-- Best run periodically (e.g. via Supabase pg_cron) to keep the table small.
-- ============================================
CREATE OR REPLACE FUNCTION public.prune_rate_limits(p_older_than_seconds INTEGER DEFAULT 86400)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - make_interval(secs => p_older_than_seconds);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
