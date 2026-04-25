# QuadraticVote App Reset - January 21, 2026

## What Was Done

### Supabase Project Recreation

The previous Supabase project was deleted, and a brand new one was created from scratch.

#### New Supabase Project Details

| Property | Value |
|----------|-------|
| Project Name | `quadraticvote` |
| Project Reference ID | `zxkgkzehbvheazspbmks` |
| Region | East US (North Virginia) / `us-east-1` |
| Organization ID | `owdokdiiaxilkmtvvtsy` |
| Dashboard URL | https://supabase.com/dashboard/project/zxkgkzehbvheazspbmks |
| API URL | https://zxkgkzehbvheazspbmks.supabase.co |

### Steps Completed

1. **Created new Supabase project** via CLI:
   ```bash
   supabase projects create quadraticvote --org-id owdokdiiaxilkmtvvtsy --region us-east-1
   ```

2. **Linked project locally**:
   ```bash
   supabase link --project-ref zxkgkzehbvheazspbmks
   ```

3. **Initialized Supabase in the project**:
   ```bash
   supabase init
   ```

4. **Updated `.env.local`** with new credentials:
   - `DATABASE_URL` - PostgreSQL connection string (using pooler on port 6543)
   - `NEXT_PUBLIC_SUPABASE_URL` - New project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - New anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - New service role key

5. **Created database migration** from `supabase/schema.sql`:
   - Copied schema to `supabase/migrations/20260121185913_initial_schema.sql`
   - Modified to use `gen_random_uuid()` instead of `uuid_generate_v4()` for compatibility

6. **Applied database schema**:
   ```bash
   supabase db push
   ```

### Database Tables Created

The following tables were created in the new Supabase database:

- `users` - User profiles (synced with Supabase Auth)
- `events` - Voting events/elections
- `options` - Voting options/choices for each event
- `invites` - Voter invitations with codes
- `votes` - Individual vote records
- `vote_allocations` - Credit allocations per option
- `proposals` - Community-submitted proposals
- `results` - Cached voting results
- `analytics_events` - Analytics tracking

## Current Project State

### Working

- Supabase project is live and connected
- Database schema is applied
- Environment variables are configured
- Dev server runs on http://localhost:3002
- Basic pages load (home, test dashboard, auth pages)

### Configuration Files

| File | Status |
|------|--------|
| `.env.local` | Updated with new Supabase credentials |
| `supabase/config.toml` | Created (local Supabase config) |
| `supabase/migrations/` | Contains initial schema migration |

### Environment Variables

```env
# Database (Supabase PostgreSQL with Connection Pooling)
DATABASE_URL=postgresql://postgres.zxkgkzehbvheazspbmks:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase API
NEXT_PUBLIC_SUPABASE_URL=https://zxkgkzehbvheazspbmks.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Redis - Currently disabled
# REDIS_URL, REDIS_TOKEN are commented out

# Other configs remain unchanged
```

## Next Steps

### Immediate

1. **Verify tables in Supabase Dashboard**: Visit the Table Editor to confirm all tables exist
2. **Test API endpoints**: Use the test dashboard at `/test` to verify database connectivity
3. **Restart dev server** if experiencing connection issues (new project may need a moment to fully initialize)

### Recommended

1. **Set up Row Level Security (RLS)**: The schema creates tables but RLS policies may need to be configured in Supabase Dashboard
2. **Configure Auth providers**: Set up email/password or OAuth providers in Supabase Auth settings
3. **Re-enable Redis**: If caching is needed, set up a new Upstash Redis instance or local Redis

## Useful Commands

```bash
# Start dev server
pnpm dev

# Push schema changes to Supabase
supabase db push

# Pull remote schema changes
supabase db pull

# View Supabase project status
supabase projects list

# Open Supabase Dashboard
open "https://supabase.com/dashboard/project/zxkgkzehbvheazspbmks"
```

## Notes

- The database password was set via the Supabase Dashboard and stored in `.env.local`
- The project uses the connection pooler (port 6543 with `pgbouncer=true`) for better serverless compatibility
- Redis/Upstash is currently disabled - the app should handle this gracefully with fallbacks
- The Supabase CLI version used is v2.45.5 (a newer version v2.72.7 is available)
