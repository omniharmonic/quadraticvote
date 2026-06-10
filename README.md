# QuadraticVote.xyz

A platform for democratic decision-making using **quadratic voting**, with two
decision frameworks built into its core:

- **Binary Selection** — competitive: voters choose which options win
  (top-N, percentage-of-max, absolute-votes, or above-average thresholds,
  with configurable tie-breaking).
- **Proportional Distribution** — collaborative: voters steer how a shared
  resource pool (budget, tokens, hours…) is divided, with optional
  minimum-allocation floors and zero-vote handling.

Ballots allocate credits per option; votes are `√credits`, so expressing an
intense preference for one option costs quadratically more than spreading
support. Events are ephemeral, invite-gated or public, and anonymous by
default.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Radix UI · Recharts ·
Supabase (Postgres + Auth, accessed via a service-role API layer) · Resend
(optional email) · Vitest + Playwright.

## Quick start

```bash
pnpm install
cp env.example .env.local   # fill in your Supabase project values
pnpm dev                    # http://localhost:3000
```

Required environment (see `env.example` for the full annotated list):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key (API routes; bypasses RLS) |
| `RESEND_API_KEY`, `FROM_EMAIL` | Optional — invite emails degrade gracefully without them |
| `NEXT_PUBLIC_APP_URL` | Public base URL (also scopes CORS/CSP) |

Apply the database schema by running the migrations in
`supabase/migrations/` (in filename order) against your project — via
`supabase db push` with the Supabase CLI, or by pasting them into the SQL
editor. **Migrations are the source of truth for the schema.**

### Run locally without a Supabase project

The repo ships an in-memory mock of the Supabase stack
(PostgREST + GoTrue subset) used by the e2e suite. You can develop against
it too:

```bash
node tests/mocks/supabase-mock.mjs &
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key \
SUPABASE_SERVICE_ROLE_KEY=mock-service-role-key \
pnpm dev
```

State is in-memory and wiped on restart (`GET /__reset` wipes it on demand;
`GET /__dump` inspects it).

## Testing

```bash
pnpm type-check          # tsc
pnpm test -- run         # Vitest unit tests (result engine, standings,
                         #   clustering, vote settings, emails)
pnpm test:e2e            # Playwright — fully hermetic: boots the supabase
                         #   mock + next dev itself; no secrets, no Docker
```

The unit suite covers the highest-risk logic: every binary threshold mode
and tiebreaker, proportional floors/normalization/Gini, zero-vote handling,
live-standing computation, and voter clustering. The e2e suite exercises
both framework lifecycles end-to-end (create → vote → results → exports),
the voting UI, access control, the proposal-PII gate, and result snapshots.

## Architecture notes

```
src/
├── app/                    # App Router pages + API routes
│   ├── api/                #   service-role API layer (all authz here)
│   ├── events/             #   create wizard, event, vote, results, propose
│   ├── admin/              #   organizer dashboards
│   └── auth/               #   Supabase Auth flows
├── components/             # UI (schematic design system, charts, radix)
├── contexts/               # Auth/Admin React contexts
└── lib/
    ├── services/           # event/vote/result/proposal/admin/email services
    ├── utils/              # pure logic: result-engine, binary-standing,
    │                       #   voter-clusters, quadratic, rate-limit, auth
    └── validators/         # zod schemas for every mutating endpoint
supabase/migrations/        # canonical schema (incl. RLS + result_snapshots)
tests/                      # unit/ (vitest), e2e/ (playwright), mocks/
```

Design decisions worth knowing:

- **All server routes use the service-role key**; authorization is enforced
  in the route/middleware layer (`withAuth` / `withEventAdmin` /
  `withEventOwner` / `withProposalAdmin`). RLS exists as defense-in-depth
  for anything touching the anon key.
- **Results are recomputed live while voting is open.** The first read after
  close freezes the tally into `result_snapshots` and serves it verbatim —
  the published outcome is immutable. Late ballots (when enabled)
  invalidate and re-freeze.
- **Supabase fetches are `cache: 'no-store'`** — Next.js would otherwise
  cache REST GETs in route handlers and serve stale ballots.
- **Anonymous voting** dedupes by a per-event hash of IP + user-agent. That
  is best-effort only — treat anonymous public events as straw polls and
  use invite codes when the outcome matters.
- Proposal submitter PII (email, wallets) is only ever returned to verified
  admins of that event; voter identifiers never leave the API (analytics
  uses anonymized labels).

## Deployment

Optimized for Vercel + Supabase. Set the environment variables above in the
Vercel project, run the migrations against your Supabase database, and
deploy. Security headers (CSP, HSTS, X-Frame-Options…) are configured in
`next.config.js`; API function timeout is set in `vercel.json`.

## License

MIT
