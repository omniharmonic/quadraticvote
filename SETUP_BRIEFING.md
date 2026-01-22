# QuadraticVote Setup Briefing

This document provides step-by-step instructions for completing the project setup. The codebase has been cleaned up and is ready for deployment.

## Current State

- **Build Status**: Passes (`pnpm build` succeeds)
- **Type Check**: Passes (`pnpm type-check` succeeds)
- **Unit Tests**: Pass (`pnpm test` - 4 tests)
- **Database**: Schema ready at `supabase/schema.sql`
- **Dependencies**: Cleaned (removed Drizzle ORM, Redis)

## Step 1: Create Supabase Project

Using the Supabase CLI (already authenticated):

```bash
# Create a new Supabase project
supabase projects create quadraticvote --org-id <your-org-id> --region us-east-1

# Or list existing projects
supabase projects list
```

If using the dashboard instead: https://supabase.com/dashboard/projects

## Step 2: Get Project Credentials

```bash
# Get project ref and API keys
supabase projects api-keys --project-ref <project-ref>
```

You need:
- `NEXT_PUBLIC_SUPABASE_URL` - Project URL (https://[ref].supabase.co)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - service_role key (keep secret!)

## Step 3: Run Database Schema

The schema file is at `supabase/schema.sql`. Run it in Supabase:

```bash
# Option 1: Using Supabase CLI with local link
supabase link --project-ref <project-ref>
supabase db push

# Option 2: Direct SQL execution via dashboard
# Go to SQL Editor in Supabase Dashboard and paste contents of supabase/schema.sql
```

The schema creates:
- `users` - User profiles (syncs with Supabase Auth)
- `events` - Voting events
- `options` - Voting choices
- `invites` - Voter invitations
- `votes` - Cast votes
- `proposals` - Community proposals
- `event_admins` - Admin roles
- `admin_invitations` - Admin invites

Plus Row Level Security (RLS) policies and triggers.

## Step 4: Create Environment File

```bash
cp env.example .env.local
```

Fill in `.env.local`:

```bash
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[your-project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[your-service-role-key]"

# Required - App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENCRYPTION_KEY="[generate-32-char-random-key]"

# Generate encryption key with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Optional - Email (Resend)
RESEND_API_KEY=""
FROM_EMAIL="noreply@yourdomain.com"

# Optional - Blockchain (disabled by default)
ALCHEMY_ETH_RPC=""
ALCHEMY_POLYGON_RPC=""
ENABLE_WEB3_WALLET="false"
```

## Step 5: Verify Local Development

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000 and verify:
- [ ] Homepage loads
- [ ] Can navigate to /events/create
- [ ] Auth pages load (/auth/login, /auth/signup)

## Step 6: Deploy to Vercel

Using Vercel CLI (already authenticated):

```bash
# Link to existing project or create new
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel env add ENCRYPTION_KEY

# Deploy
vercel --prod
```

Or push to GitHub and let Vercel auto-deploy if connected.

## Step 7: Configure Supabase Auth Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

1. **Site URL**: Set to your production URL (e.g., https://quadraticvote.xyz)
2. **Redirect URLs**: Add:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

## What Still Needs Testing

### Critical User Flows

1. **Authentication**
   - [ ] Sign up with email
   - [ ] Sign in with email
   - [ ] Password reset
   - [ ] Session persistence

2. **Event Creation**
   - [ ] Create binary selection event
   - [ ] Create proportional distribution event
   - [ ] Add options during creation
   - [ ] Set voting period

3. **Voting Flow**
   - [ ] Access event via invite code
   - [ ] Allocate credits (quadratic cost display)
   - [ ] Submit vote
   - [ ] Edit existing vote

4. **Results**
   - [ ] View results page
   - [ ] Binary selection winners displayed
   - [ ] Proportional allocations calculated

5. **Admin Features**
   - [ ] Manage event options
   - [ ] Generate invite codes
   - [ ] View analytics
   - [ ] Approve/reject proposals

### API Endpoints to Test

```bash
# Create event (requires auth)
POST /api/events

# Get event details
GET /api/events/[id]

# Submit vote
POST /api/events/[id]/votes

# Get results
GET /api/events/[id]/results

# Verify invite
POST /api/events/[id]/invites/verify
```

## Known Warnings (Non-blocking)

These are lint warnings that don't affect functionality:

1. **React Hook useEffect dependencies** (~15 warnings)
   - Functions defined inside components should use useCallback
   - Not critical for MVP

2. **`<img>` instead of `<Image>`** (2 warnings)
   - For user-uploaded images in proposals
   - Can optimize later

## Architecture Notes

### Database Access Pattern

All database access uses Supabase client directly:
- `src/lib/supabase.ts` - Client initialization
- `src/lib/services/*.ts` - Service layer for business logic

### Authentication

- Supabase Auth handles user management
- `src/contexts/AuthContext.tsx` - React context for auth state
- `src/lib/services/auth.service.ts` - Auth operations

### API Routes

All under `src/app/api/`:
- Uses Next.js App Router API routes
- Service layer pattern for business logic
- Zod validation for request bodies

### Rate Limiting

Currently disabled (was using Redis). The rate limit functions return `allowed: true` for all requests. To re-enable:
- Set up Upstash Redis
- Update `src/lib/utils/rate-limit.ts`

## Commands Reference

```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server

# Quality
pnpm type-check   # TypeScript check
pnpm lint         # ESLint
pnpm test         # Unit tests (Vitest)
pnpm test:e2e     # E2E tests (Playwright)

# Database (if using Supabase CLI)
supabase db push  # Push schema changes
supabase db diff  # Show pending changes
```

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   ├── auth/              # Auth pages
│   └── events/            # Event pages
├── components/            # React components
├── contexts/              # React contexts
└── lib/
    ├── services/          # Business logic
    ├── utils/             # Utilities
    ├── validators/        # Zod schemas
    ├── supabase.ts        # DB client
    └── types.ts           # TypeScript types

supabase/
└── schema.sql             # Database schema

tests/
├── unit/                  # Vitest unit tests
└── e2e/                   # Playwright E2E tests
```

## Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Check Vercel function logs
3. Ensure all env vars are set correctly
4. Verify RLS policies aren't blocking requests (service role key bypasses RLS)
