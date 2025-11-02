# QuadraticVote.xyz - Technical Architecture Document
## Version 1.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [API Specifications](#7-api-specifications)
8. [Authentication & Security](#8-authentication--security)
9. [Blockchain Integration](#9-blockchain-integration)
10. [Email & Notification System](#10-email--notification-system)
11. [Real-Time Features](#11-real-time-features)
12. [File Storage & CDN](#12-file-storage--cdn)
13. [Analytics & Visualization](#13-analytics--visualization)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Performance & Scaling](#16-performance--scaling)
17. [Monitoring & Observability](#17-monitoring--observability)
18. [Security Implementation](#18-security-implementation)
19. [Development Workflow](#19-development-workflow)
20. [Migration & Versioning](#20-migration--versioning)

---

## 1. System Overview

### 1.1 Purpose

QuadraticVote.xyz is a full-stack web application enabling ephemeral, anonymous, and secure quadratic voting events with two distinct decision frameworks:
- **Binary Selection**: Threshold-based winner selection
- **Proportional Distribution**: Resource allocation across options

### 1.2 Key Characteristics

- **Stateless by Design**: Events are ephemeral and self-contained
- **Framework-Agnostic Core**: Voting mechanics identical across frameworks
- **Framework-Specific Results**: Calculation and presentation vary by framework
- **Anonymous & Secure**: Code-based identity system
- **Modular**: Extensible for integration into larger governance ecosystems

### 1.3 System Boundaries

**In Scope:**
- Event creation and management
- Proposal submission and moderation
- Anonymous voting with invite codes
- Token-gated access control
- Results calculation and visualization
- Data export functionality
- Email notifications

**Out of Scope (Future Phases):**
- On-chain vote storage
- Delegation mechanisms
- Multi-stage voting rounds
- Mobile native applications
- Real-time collaboration tools

---

## 2. Technology Stack

### 2.1 Frontend Stack

```yaml
Framework: Next.js 14+ (App Router)
Language: TypeScript 5.0+
UI Framework: React 18+
Styling: Tailwind CSS 3.x
Component Library: Shadcn UI (Radix UI primitives)
State Management: Zustand 4.x
Forms: React Hook Form + Zod validation
Charts: Recharts (2D), Three.js + React-Three-Fiber (3D)
Markdown: React Markdown + Remark plugins
Web3: Wagmi 2.x + Viem 2.x
Wallet Connection: WalletConnect v2 (via Wagmi)
HTTP Client: TanStack Query (React Query)
```

**Rationale:**
- **Next.js**: SSR/SSG for SEO, API routes for backend, great DX
- **TypeScript**: Type safety across full stack
- **Tailwind + Shadcn**: Rapid UI development with consistent design system
- **Zustand**: Lightweight state management, simpler than Redux
- **Wagmi/Viem**: Modern, type-safe Web3 libraries

### 2.2 Backend Stack

```yaml
Framework: Next.js API Routes (serverless functions)
Language: TypeScript 5.0+
ORM: Drizzle ORM
Database: PostgreSQL 15+ (Supabase with connection pooling)
Cache: Redis 7.x (Upstash for serverless)
Storage: Supabase Storage (integrated file storage)
Search: PostgreSQL Full-Text Search (pg_trgm extension)
Session: JWT tokens (short-lived for proposal/vote sessions)
Validation: Zod schemas (shared with frontend)
```

**Rationale:**
- **Next.js API Routes**: Unified codebase, easy deployment, cold-start optimized
- **Drizzle ORM**: Type-safe, performant, SQL-first approach
- **PostgreSQL (Supabase)**: ACID compliance, JSONB support, full-text search, built-in connection pooling for serverless
- **Redis (Upstash)**: Session caching, rate limiting, real-time vote aggregation
- **Supabase Storage**: Integrated file storage, no separate S3 setup required

### 2.3 Infrastructure Stack

```yaml
Hosting: Vercel (frontend + serverless functions)
Database: Supabase PostgreSQL (connection pooling optimized for serverless)
Cache: Upstash Redis (serverless-compatible)
Storage: Supabase Storage (integrated file storage)
CDN: Vercel Edge Network + Supabase CDN (automatic for storage)
Email: Resend (modern API, great DX)
Blockchain RPC: Alchemy (primary), Infura (fallback)
Analytics: Plausible (privacy-focused) or PostHog
Error Tracking: Sentry
Logging: Axiom or Baselime (serverless-optimized)
```

**Rationale:**
- **Vercel**: Zero-config deployment, edge functions, preview deployments, optimized for Next.js
- **Supabase**: Serverless Postgres with built-in connection pooling (PgBouncer), integrated Storage, unified dashboard
- **Upstash**: Serverless Redis with per-request pricing, REST API compatibility
- **Supabase Storage**: Integrated with database, no separate S3 configuration, automatic CDN
- **Resend**: Developer-friendly email API, good deliverability

### 2.4 Development Tools

```yaml
Package Manager: pnpm (faster than npm/yarn)
Linting: ESLint + Prettier
Type Checking: TypeScript strict mode
Testing: Vitest (unit), Playwright (e2e)
Git Hooks: Husky + lint-staged
CI/CD: GitHub Actions
Schema Management: Drizzle Kit (migrations)
API Documentation: OpenAPI 3.1 (generated from Zod schemas)
```

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (React)                                 │   │
│  │  - Event Creation Wizard                                  │   │
│  │  - Proposal Submission Forms                              │   │
│  │  - Voting Interface                                       │   │
│  │  - Results Dashboard                                      │   │
│  │  - Admin Moderation Panel                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↕                                   │
│                    TanStack Query (HTTP)                         │
│                    Wagmi/Viem (Web3)                             │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js API Routes (Serverless Functions)                │   │
│  │                                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │Event Service │  │Vote Service  │  │Result Service│   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │Proposal Svc  │  │Auth Service  │  │Email Service │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │Token Svc     │  │Export Service│  │Analytics Svc │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Supabase     │  │   Redis      │  │ Supabase     │          │
│  │ PostgreSQL   │  │ (Upstash)    │  │  Storage     │          │
│  │ (Pooled)     │  │   (Cache)    │  │  (Files)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Alchemy    │  │   Resend     │  │  Cloudflare  │          │
│  │ (Blockchain) │  │   (Email)    │  │    (CDN)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Request Flow Examples

#### 3.2.1 Event Creation Flow

```
1. User fills event creation form (Frontend)
   ↓
2. POST /api/events with event configuration (API Route)
   ↓
3. Validate schema with Zod (Middleware)
   ↓
4. Insert event into PostgreSQL (Event Service)
   ↓
5. If proposal mode: Create proposal config (Proposal Service)
   ↓
6. Generate invite codes if provided (Auth Service)
   ↓
7. Store invite codes in DB with hashed emails
   ↓
8. If auto-send: Queue emails (Email Service)
   ↓
9. Return event ID and URL
   ↓
10. Redirect user to event management dashboard
```

#### 3.2.2 Vote Submission Flow

```
1. User allocates credits via sliders (Frontend)
   ↓
2. Real-time preview calculates quadratic votes (Client-side)
   ↓
3. User clicks "Submit" → POST /api/events/:id/votes (API Route)
   ↓
4. Validate invite code (Auth Service)
   ↓
5. Check if already voted → If yes, allow edit (Vote Service)
   ↓
6. Validate credit allocation sum ≤ voter's total (Vote Service)
   ↓
7. Calculate quadratic votes for verification (Vote Service)
   ↓
8. Insert/update vote in PostgreSQL (Vote Service)
   ↓
9. Invalidate cached results (Redis)
   ↓
10. If real-time enabled: Broadcast update (WebSocket/SSE)
   ↓
11. Return success + receipt code
```

#### 3.2.3 Results Calculation Flow

```
1. User requests results page (Frontend)
   ↓
2. GET /api/events/:id/results (API Route)
   ↓
3. Check if results cached (Redis)
   ↓ (miss)
4. Fetch all votes from PostgreSQL (Vote Service)
   ↓
5. Aggregate quadratic votes per option (Result Service)
   ↓
6. Determine framework type from event config
   ↓
7a. Binary: Calculate rankings, apply threshold (Result Service)
7b. Proportional: Calculate distributions, normalize (Result Service)
   ↓
8. Calculate cluster analysis (t-SNE/UMAP) (Analytics Service)
   ↓
9. Cache results in Redis (TTL: 5 minutes during voting, ∞ after close)
   ↓
10. Return results JSON
   ↓
11. Frontend renders framework-specific dashboard
```

---

## 4. Data Architecture

### 4.1 Database Schema (PostgreSQL)

#### 4.1.1 Core Tables

**`users` Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**`events` Table**
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic metadata
  title VARCHAR(200) NOT NULL,
  description TEXT,
  tags TEXT[],
  image_url TEXT,
  
  -- Visibility
  visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('public', 'private', 'unlisted')),
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Decision Framework (CRITICAL)
  decision_framework JSONB NOT NULL,
  -- Structure: { framework_type: 'binary_selection' | 'proportional_distribution', config: {...} }
  
  -- Option creation mode
  option_mode VARCHAR(50) NOT NULL CHECK (option_mode IN ('admin_defined', 'community_proposals', 'hybrid')),
  
  -- Proposal configuration (if applicable)
  proposal_config JSONB,
  -- Structure: { enabled, submission_start, submission_end, moderation_mode, ... }
  
  -- Voting configuration
  credits_per_voter INTEGER NOT NULL DEFAULT 100,
  weighting_mode VARCHAR(50) DEFAULT 'equal',
  weighting_config JSONB,
  
  -- Token gating
  token_gating JSONB,
  -- Structure: { enabled, token_address, chain, min_balance, ... }
  
  -- Results configuration
  show_results_during_voting BOOLEAN DEFAULT FALSE,
  show_results_after_close BOOLEAN DEFAULT TRUE,
  
  -- Ownership
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_framework_type ON events((decision_framework->>'framework_type'));
CREATE INDEX idx_events_visibility ON events(visibility) WHERE deleted_at IS NULL;

-- Full-text search on title and description
CREATE INDEX idx_events_search ON events USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

**`options` Table**
```sql
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Content
  title VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Ordering
  position INTEGER NOT NULL,
  
  -- Source tracking
  source VARCHAR(20) NOT NULL CHECK (source IN ('admin', 'community', 'merged')),
  created_by_proposal_id UUID, -- References proposals(id) if source = 'community'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, position)
);

CREATE INDEX idx_options_event_id ON options(event_id);
CREATE INDEX idx_options_source ON options(source);
```

**`proposals` Table**
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Content
  title VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Submitter (anonymized)
  submitter_email VARCHAR(255) NOT NULL, -- Encrypted at rest
  submitter_wallet VARCHAR(42), -- Ethereum address if token-gated
  submitter_anonymous_id VARCHAR(64) NOT NULL, -- SHA256 hash for exports
  
  -- Status tracking
  status VARCHAR(30) NOT NULL CHECK (status IN ('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'merged')),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Moderation
  edited_by_admin BOOLEAN DEFAULT FALSE,
  admin_edit_log JSONB DEFAULT '[]'::jsonb,
  flagged BOOLEAN DEFAULT FALSE,
  flag_count INTEGER DEFAULT 0,
  
  -- Conversion
  converted_to_option_id UUID REFERENCES options(id),
  merged_into_proposal_id UUID REFERENCES proposals(id),
  merge_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_proposals_event_id ON proposals(event_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_submitter_email ON proposals(submitter_email);
CREATE INDEX idx_proposals_submitted_at ON proposals(submitted_at);
```

**`invites` Table**
```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Identity
  email VARCHAR(255) NOT NULL, -- Encrypted at rest
  code VARCHAR(64) NOT NULL UNIQUE, -- UUID or custom format
  
  -- Purpose
  invite_type VARCHAR(20) NOT NULL CHECK (invite_type IN ('voting', 'proposal_submission', 'both')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Can include: { wallet_address, trust_score, custom_credits, etc. }
  
  -- Tracking
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  used_at TIMESTAMP,
  vote_submitted_at TIMESTAMP,
  
  -- Proposal tracking
  proposals_submitted INTEGER DEFAULT 0,
  proposal_ids UUID[] DEFAULT '{}',
  
  -- Security
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_event_id ON invites(event_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_invite_type ON invites(invite_type);
```

**`votes` Table**
```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_code VARCHAR(64) NOT NULL REFERENCES invites(code),
  
  -- Allocations: { option_id: credits_allocated }
  allocations JSONB NOT NULL,
  
  -- Pre-calculated for performance
  total_credits_used INTEGER NOT NULL,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Security
  ip_address INET,
  user_agent TEXT,
  
  UNIQUE(event_id, invite_code) -- One vote per code per event
);

CREATE INDEX idx_votes_event_id ON votes(event_id);
CREATE INDEX idx_votes_invite_code ON votes(invite_code);
CREATE INDEX idx_votes_submitted_at ON votes(submitted_at);

-- GIN index for querying allocations JSONB
CREATE INDEX idx_votes_allocations ON votes USING GIN(allocations);
```

**`proposal_flags` Table**
```sql
CREATE TABLE proposal_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  
  -- Flagger (can be anonymous)
  flagger_email VARCHAR(255),
  flagger_ip_hash VARCHAR(64) NOT NULL, -- SHA256 of IP
  
  -- Reason
  reason VARCHAR(30) CHECK (reason IN ('spam', 'inappropriate', 'duplicate', 'other')),
  reason_text TEXT,
  
  -- Metadata
  flagged_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_proposal_flags_proposal_id ON proposal_flags(proposal_id);
CREATE INDEX idx_proposal_flags_flagger_ip_hash ON proposal_flags(flagger_ip_hash);
```

#### 4.1.2 Results Caching Table (Optional)

**`cached_results` Table**
```sql
CREATE TABLE cached_results (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  
  -- Results data (framework-specific structure)
  results JSONB NOT NULL,
  
  -- Cache metadata
  calculated_at TIMESTAMP DEFAULT NOW(),
  vote_count INTEGER NOT NULL,
  is_final BOOLEAN DEFAULT FALSE, -- TRUE if event closed
  
  -- TTL (for cache invalidation)
  expires_at TIMESTAMP
);

CREATE INDEX idx_cached_results_expires_at ON cached_results(expires_at);
```

### 4.2 Redis Data Structures

**Key Patterns:**

```redis
# Session data (invite code validation)
session:{invite_code} → {event_id, email, expires_at} [TTL: event.end_time]

# Rate limiting (vote attempts)
ratelimit:vote:{ip_address} → count [TTL: 60 seconds]
ratelimit:proposal:{email} → count [TTL: 3600 seconds]

# Real-time vote aggregation (during voting)
votes:live:{event_id} → {option_id: quadratic_votes} [Hash]

# Results cache (after calculation)
results:{event_id} → JSON [TTL: 300 seconds during voting, no expiry after close]

# Duplicate detection (proposal titles)
proposals:titles:{event_id} → Set of title hashes [TTL: submission_end_time]

# WebSocket connections (if real-time)
ws:connections:{event_id} → Set of connection IDs [TTL: end_time]
```

### 4.3 File Storage Structure (Supabase Storage)

**Supabase Storage Buckets:**
```
Storage Buckets:
├── event-images/          (Public bucket)
│   └── {event_id}/
│       └── banner.{ext}
├── option-images/         (Public bucket)
│   └── {option_id}/
│       └── image.{ext}
├── proposal-images/       (Public bucket)
│   └── {proposal_id}/
│       └── image.{ext}
└── exports/               (Private bucket)
    └── {event_id}/
        ├── results.csv
        ├── results.json
        └── report.pdf
```

**Access Control:**
- Event banners: Public read (public bucket)
- Option/proposal images: Public read (public bucket, if event is public)
- Exports: Private bucket with signed URLs, 1-hour expiry
- Storage policies: Configurable via Supabase RLS (Row Level Security)

---

## 5. Backend Architecture

### 5.1 Service Layer Organization

```
src/
├── lib/
│   ├── db/
│   │   ├── client.ts              # Database connection (Supabase PostgreSQL with pooling)
│   │   ├── schema.ts              # Drizzle schema definitions
│   │   └── migrations/            # SQL migration files
│   ├── supabase/
│   │   ├── client.ts              # Supabase client (for Storage, optional Auth)
│   │   └── storage.ts              # Supabase Storage utilities
│   ├── redis/
│   │   ├── client.ts              # Redis connection (Upstash)
│   │   └── keys.ts                # Key pattern functions
│   ├── services/
│   │   ├── events/
│   │   │   ├── event.service.ts
│   │   │   ├── event.types.ts
│   │   │   └── event.validators.ts
│   │   ├── proposals/
│   │   │   ├── proposal.service.ts
│   │   │   ├── moderation.service.ts
│   │   │   └── duplicate-detection.ts
│   │   ├── votes/
│   │   │   ├── vote.service.ts
│   │   │   ├── vote.validators.ts
│   │   │   └── quadratic-calc.ts
│   │   ├── results/
│   │   │   ├── result.service.ts
│   │   │   ├── binary-calculator.ts
│   │   │   ├── proportional-calculator.ts
│   │   │   └── cluster-analysis.ts
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── invite-code.ts
│   │   │   └── rate-limiter.ts
│   │   ├── blockchain/
│   │   │   ├── token-verifier.ts
│   │   │   ├── wallet-connector.ts
│   │   │   └── chain-config.ts
│   │   ├── email/
│   │   │   ├── email.service.ts
│   │   │   ├── templates/
│   │   │   └── queue.ts
│   │   ├── export/
│   │   │   ├── export.service.ts
│   │   │   ├── csv-generator.ts
│   │   │   ├── json-generator.ts
│   │   │   └── pdf-generator.ts
│   │   └── analytics/
│   │       ├── analytics.service.ts
│   │       ├── cluster-calc.ts
│   │       └── metrics.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── encryption.ts
│   │   ├── hashing.ts
│   │   └── dates.ts
│   └── config/
│       ├── env.ts
│       └── constants.ts
└── app/
    └── api/
        └── [routes]/              # API route handlers
```

### 5.2 Core Service Implementations

#### 5.2.1 Event Service

**`src/lib/services/events/event.service.ts`**

```typescript
import { db } from '@/lib/db/client';
import { events, options, invites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateInviteCode } from '../auth/invite-code';
import type { CreateEventInput, Event } from './event.types';

export class EventService {
  /**
   * Create a new event with full configuration
   */
  async createEvent(input: CreateEventInput, userId: string): Promise<Event> {
    // Validate decision framework
    this.validateDecisionFramework(input.decision_framework);
    
    // Begin transaction
    return await db.transaction(async (tx) => {
      // 1. Insert event
      const [event] = await tx.insert(events).values({
        ...input,
        created_by: userId,
      }).returning();
      
      // 2. If admin-defined options, insert them
      if (input.option_mode !== 'community_proposals' && input.initial_options) {
        await tx.insert(options).values(
          input.initial_options.map((opt, index) => ({
            event_id: event.id,
            title: opt.title,
            description: opt.description,
            image_url: opt.image_url,
            position: index,
            source: 'admin' as const,
          }))
        );
      }
      
      // 3. If invite list provided, generate codes
      if (input.invite_emails && input.invite_emails.length > 0) {
        const inviteRecords = input.invite_emails.map(email => ({
          event_id: event.id,
          email: email,
          code: generateInviteCode(),
          invite_type: this.determineInviteType(input),
        }));
        
        await tx.insert(invites).values(inviteRecords);
      }
      
      return event;
    });
  }
  
  /**
   * Validate decision framework configuration
   */
  private validateDecisionFramework(framework: any): void {
    const { framework_type, config } = framework;
    
    if (framework_type === 'binary_selection') {
      const { threshold_mode } = config;
      
      if (threshold_mode === 'top_n' && !config.top_n_count) {
        throw new Error('top_n_count required for top_n threshold mode');
      }
      if (threshold_mode === 'percentage' && !config.percentage_threshold) {
        throw new Error('percentage_threshold required for percentage mode');
      }
      if (threshold_mode === 'absolute_votes' && !config.absolute_vote_threshold) {
        throw new Error('absolute_vote_threshold required for absolute_votes mode');
      }
    } else if (framework_type === 'proportional_distribution') {
      const { resource_name, total_pool_amount } = config;
      
      if (!resource_name || !total_pool_amount) {
        throw new Error('resource_name and total_pool_amount required for proportional distribution');
      }
      if (total_pool_amount <= 0) {
        throw new Error('total_pool_amount must be positive');
      }
    } else {
      throw new Error('Invalid framework_type');
    }
  }
  
  /**
   * Determine invite type based on event configuration
   */
  private determineInviteType(input: CreateEventInput): 'voting' | 'proposal_submission' | 'both' {
    const hasProposals = input.option_mode === 'community_proposals' || input.option_mode === 'hybrid';
    
    if (hasProposals && input.proposal_config?.access_control === 'invite_only') {
      return 'both';
    }
    return 'voting';
  }
  
  /**
   * Get event by ID with related data
   */
  async getEventById(eventId: string): Promise<Event | null> {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
      with: {
        options: true,
      },
    });
    
    return event ?? null;
  }
  
  /**
   * Check if event is currently active
   */
  isEventActive(event: Event): boolean {
    const now = new Date();
    return now >= event.start_time && now <= event.end_time;
  }
  
  /**
   * Check if proposals are currently open
   */
  areProposalsOpen(event: Event): boolean {
    if (event.option_mode === 'admin_defined') return false;
    
    const config = event.proposal_config;
    if (!config || !config.enabled) return false;
    
    const now = new Date();
    return now >= config.submission_start && now <= config.submission_end;
  }
}

export const eventService = new EventService();
```

#### 5.2.2 Vote Service

**`src/lib/services/votes/vote.service.ts`**

```typescript
import { db } from '@/lib/db/client';
import { votes, invites, events } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redis } from '@/lib/redis/client';
import { calculateQuadraticVotes } from './quadratic-calc';
import type { VoteAllocation, VoteSubmission } from './vote.types';

export class VoteService {
  /**
   * Submit or update a vote
   */
  async submitVote(
    eventId: string,
    inviteCode: string,
    allocations: Record<string, number>,
    metadata: { ip_address?: string; user_agent?: string }
  ): Promise<void> {
    // 1. Validate invite code
    const invite = await this.validateInviteCode(eventId, inviteCode);
    
    // 2. Validate event is active
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    
    if (!event) throw new Error('Event not found');
    if (!this.isVotingOpen(event)) throw new Error('Voting is closed');
    
    // 3. Validate credit allocation
    await this.validateAllocations(event, allocations);
    
    // 4. Calculate total credits used
    const totalCredits = Object.values(allocations).reduce((sum, c) => sum + c, 0);
    
    // 5. Insert or update vote
    await db.insert(votes)
      .values({
        event_id: eventId,
        invite_code: inviteCode,
        allocations: allocations,
        total_credits_used: totalCredits,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
      })
      .onConflictDoUpdate({
        target: [votes.event_id, votes.invite_code],
        set: {
          allocations: allocations,
          total_credits_used: totalCredits,
          updated_at: new Date(),
        },
      });
    
    // 6. Update invite tracking
    await db.update(invites)
      .set({ 
        vote_submitted_at: new Date(),
        used_at: new Date(),
      })
      .where(eq(invites.code, inviteCode));
    
    // 7. Invalidate cached results
    await redis.del(`results:${eventId}`);
    
    // 8. Update live aggregation (if real-time enabled)
    if (event.show_results_during_voting) {
      await this.updateLiveAggregation(eventId, allocations);
    }
  }
  
  /**
   * Validate invite code for this event
   */
  private async validateInviteCode(eventId: string, code: string): Promise<any> {
    const invite = await db.query.invites.findFirst({
      where: and(
        eq(invites.event_id, eventId),
        eq(invites.code, code)
      ),
    });
    
    if (!invite) throw new Error('Invalid invite code');
    if (invite.invite_type === 'proposal_submission') {
      throw new Error('This code is only for proposal submission');
    }
    
    return invite;
  }
  
  /**
   * Check if voting is currently open
   */
  private isVotingOpen(event: any): boolean {
    const now = new Date();
    return now >= event.start_time && now <= event.end_time;
  }
  
  /**
   * Validate vote allocations
   */
  private async validateAllocations(
    event: any,
    allocations: Record<string, number>
  ): Promise<void> {
    // Get valid option IDs for this event
    const validOptions = await db.query.options.findMany({
      where: eq(options.event_id, event.id),
      columns: { id: true },
    });
    
    const validOptionIds = new Set(validOptions.map(o => o.id));
    
    // Check all allocated option IDs are valid
    for (const optionId of Object.keys(allocations)) {
      if (!validOptionIds.has(optionId)) {
        throw new Error(`Invalid option ID: ${optionId}`);
      }
    }
    
    // Check credit sum
    const totalCredits = Object.values(allocations).reduce((sum, c) => sum + c, 0);
    if (totalCredits > event.credits_per_voter) {
      throw new Error(`Total credits (${totalCredits}) exceeds limit (${event.credits_per_voter})`);
    }
    
    // Check all values are non-negative integers
    for (const [optionId, credits] of Object.entries(allocations)) {
      if (credits < 0 || !Number.isInteger(credits)) {
        throw new Error(`Invalid credit allocation for option ${optionId}`);
      }
    }
  }
  
  /**
   * Update live vote aggregation in Redis
   */
  private async updateLiveAggregation(
    eventId: string,
    allocations: Record<string, number>
  ): Promise<void> {
    // Calculate quadratic votes
    const quadraticVotes = calculateQuadraticVotes(allocations);
    
    // Update Redis hash
    const key = `votes:live:${eventId}`;
    for (const [optionId, votes] of Object.entries(quadraticVotes)) {
      await redis.hincrbyfloat(key, optionId, votes);
    }
  }
  
  /**
   * Get voter's current allocation
   */
  async getVoteByCode(eventId: string, inviteCode: string): Promise<VoteAllocation | null> {
    const vote = await db.query.votes.findFirst({
      where: and(
        eq(votes.event_id, eventId),
        eq(votes.invite_code, inviteCode)
      ),
    });
    
    return vote ?? null;
  }
  
  /**
   * Get all votes for an event (for results calculation)
   */
  async getVotesByEventId(eventId: string): Promise<VoteAllocation[]> {
    return await db.query.votes.findMany({
      where: eq(votes.event_id, eventId),
    });
  }
}

export const voteService = new VoteService();
```

**`src/lib/services/votes/quadratic-calc.ts`**

```typescript
/**
 * Calculate quadratic votes from credit allocations
 */
export function calculateQuadraticVotes(
  allocations: Record<string, number>
): Record<string, number> {
  const quadraticVotes: Record<string, number> = {};
  
  for (const [optionId, credits] of Object.entries(allocations)) {
    quadraticVotes[optionId] = Math.sqrt(credits);
  }
  
  return quadraticVotes;
}

/**
 * Aggregate votes across all voters
 */
export function aggregateVotes(
  allVotes: Array<{ allocations: Record<string, number> }>
): Record<string, number> {
  const totals: Record<string, number> = {};
  
  for (const vote of allVotes) {
    const quadraticVotes = calculateQuadraticVotes(vote.allocations);
    
    for (const [optionId, votes] of Object.entries(quadraticVotes)) {
      totals[optionId] = (totals[optionId] || 0) + votes;
    }
  }
  
  return totals;
}
```

#### 5.2.3 Results Service

**`src/lib/services/results/result.service.ts`**

```typescript
import { db } from '@/lib/db/client';
import { events, votes, options } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '@/lib/redis/client';
import { calculateBinaryResults } from './binary-calculator';
import { calculateProportionalResults } from './proportional-calculator';
import { aggregateVotes } from '../votes/quadratic-calc';
import type { EventResults, BinaryResults, ProportionalResults } from './result.types';

export class ResultService {
  /**
   * Get results for an event (with caching)
   */
  async getResults(eventId: string): Promise<EventResults> {
    // 1. Check cache
    const cached = await redis.get(`results:${eventId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 2. Calculate fresh results
    const results = await this.calculateResults(eventId);
    
    // 3. Cache results
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    
    if (event) {
      const ttl = this.isEventClosed(event) ? 0 : 300; // 5 min TTL during voting, no expiry after
      await redis.set(`results:${eventId}`, JSON.stringify(results), 'EX', ttl);
    }
    
    return results;
  }
  
  /**
   * Calculate results from scratch
   */
  private async calculateResults(eventId: string): Promise<EventResults> {
    // 1. Fetch event configuration
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
      with: {
        options: true,
      },
    });
    
    if (!event) throw new Error('Event not found');
    
    // 2. Fetch all votes
    const allVotes = await db.query.votes.findMany({
      where: eq(votes.event_id, eventId),
    });
    
    // 3. Aggregate quadratic votes
    const voteTotals = aggregateVotes(allVotes);
    
    // 4. Calculate results based on framework
    const framework = event.decision_framework.framework_type;
    
    let frameworkResults: BinaryResults | ProportionalResults;
    
    if (framework === 'binary_selection') {
      frameworkResults = calculateBinaryResults(
        event.decision_framework.config,
        voteTotals,
        event.options
      );
    } else if (framework === 'proportional_distribution') {
      frameworkResults = calculateProportionalResults(
        event.decision_framework.config,
        voteTotals,
        event.options
      );
    } else {
      throw new Error('Unknown framework type');
    }
    
    // 5. Add participation metadata
    return {
      event_id: eventId,
      framework_type: framework,
      results: frameworkResults,
      participation: {
        total_voters: allVotes.length,
        total_credits_allocated: allVotes.reduce((sum, v) => sum + v.total_credits_used, 0),
        voting_start: event.start_time,
        voting_end: event.end_time,
        is_final: this.isEventClosed(event),
      },
      calculated_at: new Date(),
    };
  }
  
  /**
   * Check if event is closed
   */
  private isEventClosed(event: any): boolean {
    return new Date() > event.end_time;
  }
  
  /**
   * Invalidate results cache (called when new vote submitted)
   */
  async invalidateCache(eventId: string): Promise<void> {
    await redis.del(`results:${eventId}`);
  }
}

export const resultService = new ResultService();
```

**`src/lib/services/results/binary-calculator.ts`**

```typescript
import type { BinaryDecisionConfig, BinaryResults, OptionWithVotes } from './result.types';

export function calculateBinaryResults(
  config: BinaryDecisionConfig,
  voteTotals: Record<string, number>,
  options: Array<{ id: string; title: string }>
): BinaryResults {
  // Convert vote totals to array with option details
  const optionsWithVotes: OptionWithVotes[] = options.map(opt => ({
    option_id: opt.id,
    title: opt.title,
    votes: voteTotals[opt.id] || 0,
  }));
  
  // Sort by votes descending
  const sorted = optionsWithVotes.sort((a, b) => b.votes - a.votes);
  
  // Determine selected options based on threshold mode
  let selectedOptionIds: Set<string>;
  let selectionMargin: number | undefined;
  
  switch (config.threshold_mode) {
    case 'top_n':
      selectedOptionIds = new Set(
        sorted.slice(0, config.top_n_count).map(o => o.option_id)
      );
      // Calculate margin between last selected and first not selected
      if (sorted.length > config.top_n_count) {
        selectionMargin = sorted[config.top_n_count - 1].votes - sorted[config.top_n_count].votes;
      }
      break;
    
    case 'percentage':
      const maxVotes = sorted[0]?.votes || 0;
      const threshold = maxVotes * (config.percentage_threshold! / 100);
      selectedOptionIds = new Set(
        sorted.filter(o => o.votes >= threshold).map(o => o.option_id)
      );
      break;
    
    case 'absolute_votes':
      selectedOptionIds = new Set(
        sorted.filter(o => o.votes >= config.absolute_vote_threshold!).map(o => o.option_id)
      );
      break;
    
    case 'above_average':
      const avgVotes = sorted.reduce((sum, o) => sum + o.votes, 0) / sorted.length;
      selectedOptionIds = new Set(
        sorted.filter(o => o.votes >= avgVotes).map(o => o.option_id)
      );
      break;
    
    default:
      throw new Error('Unknown threshold mode');
  }
  
  // Add selection status and rank to each option
  const results = sorted.map((opt, index) => ({
    ...opt,
    rank: index + 1,
    selected: selectedOptionIds.has(opt.option_id),
  }));
  
  // Separate selected and not selected
  const selectedOptions = results.filter(r => r.selected);
  const notSelectedOptions = results.filter(r => !r.selected);
  
  return {
    framework_type: 'binary_selection',
    threshold_mode: config.threshold_mode,
    selected_options: selectedOptions,
    not_selected_options: notSelectedOptions,
    selected_count: selectedOptions.length,
    selection_margin: selectionMargin,
  };
}
```

**`src/lib/services/results/proportional-calculator.ts`**

```typescript
import type { ProportionalDistributionConfig, ProportionalResults, Distribution } from './result.types';

export function calculateProportionalResults(
  config: ProportionalDistributionConfig,
  voteTotals: Record<string, number>,
  options: Array<{ id: string; title: string }>
): ProportionalResults {
  // Calculate total votes
  const totalVotes = Object.values(voteTotals).reduce((sum, v) => sum + v, 0);
  
  if (totalVotes === 0) {
    // No votes yet, return equal distribution or zeros based on config
    return {
      framework_type: 'proportional_distribution',
      resource_name: config.resource_name,
      resource_symbol: config.resource_symbol,
      total_pool: config.total_pool_amount,
      distributions: options.map(opt => ({
        option_id: opt.id,
        title: opt.title,
        votes: 0,
        allocation_amount: 0,
        allocation_percentage: 0,
      })),
      total_allocated: 0,
      gini_coefficient: 0,
    };
  }
  
  // Calculate initial proportional distributions
  let distributions: Distribution[] = options.map(opt => {
    const votes = voteTotals[opt.id] || 0;
    const percentage = votes / totalVotes;
    let allocation = percentage * config.total_pool_amount;
    
    return {
      option_id: opt.id,
      title: opt.title,
      votes: votes,
      allocation_amount: allocation,
      allocation_percentage: percentage * 100,
    };
  });
  
  // Apply minimum allocation floor if enabled
  if (config.minimum_allocation_enabled && config.minimum_allocation_percentage) {
    const minAllocation = (config.minimum_allocation_percentage / 100) * config.total_pool_amount;
    
    for (const dist of distributions) {
      if (dist.votes > 0 && dist.allocation_amount < minAllocation) {
        dist.allocation_amount = minAllocation;
      }
    }
  }
  
  // Normalize if over-allocated due to minimums
  const totalAllocated = distributions.reduce((sum, d) => sum + d.allocation_amount, 0);
  
  if (totalAllocated > config.total_pool_amount) {
    const normalizationFactor = config.total_pool_amount / totalAllocated;
    distributions = distributions.map(d => ({
      ...d,
      allocation_amount: d.allocation_amount * normalizationFactor,
      allocation_percentage: (d.allocation_amount * normalizationFactor / config.total_pool_amount) * 100,
    }));
  }
  
  // Sort by allocation descending
  distributions.sort((a, b) => b.allocation_amount - a.allocation_amount);
  
  // Calculate Gini coefficient (measure of inequality)
  const gini = calculateGiniCoefficient(distributions.map(d => d.allocation_amount));
  
  return {
    framework_type: 'proportional_distribution',
    resource_name: config.resource_name,
    resource_symbol: config.resource_symbol,
    total_pool: config.total_pool_amount,
    distributions: distributions,
    total_allocated: distributions.reduce((sum, d) => sum + d.allocation_amount, 0),
    gini_coefficient: gini,
  };
}

/**
 * Calculate Gini coefficient (0 = perfect equality, 1 = perfect inequality)
 */
function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((sum, val) => sum + val, 0);
  
  if (total === 0) return 0;
  
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i + 1) * sorted[i];
  }
  
  return (2 * numerator) / (n * total) - (n + 1) / n;
}
```

#### 5.2.4 Proposal Service

**`src/lib/services/proposals/proposal.service.ts`**

```typescript
import { db } from '@/lib/db/client';
import { proposals, events, invites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { detectDuplicates } from './duplicate-detection';
import type { CreateProposalInput, Proposal } from './proposal.types';

export class ProposalService {
  /**
   * Submit a new proposal
   */
  async submitProposal(input: CreateProposalInput): Promise<Proposal> {
    // 1. Validate event accepts proposals
    const event = await db.query.events.findFirst({
      where: eq(events.id, input.event_id),
    });
    
    if (!event) throw new Error('Event not found');
    if (!this.areProposalsOpen(event)) throw new Error('Proposal submission is closed');
    
    // 2. Validate submitter authorization
    await this.validateSubmitter(event, input.submitter_email, input.invite_code);
    
    // 3. Check rate limits
    await this.checkRateLimit(input.event_id, input.submitter_email);
    
    // 4. Detect duplicates
    const duplicates = await detectDuplicates(input.event_id, input.title);
    if (duplicates.length > 0) {
      // Warn but allow submission (or reject based on config)
      console.warn(`Potential duplicate proposal: ${input.title}`);
    }
    
    // 5. Generate anonymous ID
    const anonymousId = this.generateAnonymousId(input.submitter_email);
    
    // 6. Determine initial status based on moderation mode
    const initialStatus = this.getInitialStatus(event.proposal_config);
    
    // 7. Insert proposal
    const [proposal] = await db.insert(proposals).values({
      event_id: input.event_id,
      title: input.title,
      description: input.description,
      image_url: input.image_url,
      submitter_email: input.submitter_email, // Will be encrypted at rest
      submitter_wallet: input.submitter_wallet,
      submitter_anonymous_id: anonymousId,
      status: initialStatus,
      submitted_at: initialStatus !== 'draft' ? new Date() : null,
    }).returning();
    
    // 8. Update invite tracking
    if (input.invite_code) {
      await db.update(invites)
        .set({ 
          proposals_submitted: db.raw('proposals_submitted + 1'),
          proposal_ids: db.raw(`array_append(proposal_ids, '${proposal.id}')`),
        })
        .where(eq(invites.code, input.invite_code));
    }
    
    return proposal;
  }
  
  /**
   * Check if proposals are currently open
   */
  private areProposalsOpen(event: any): boolean {
    if (!event.proposal_config?.enabled) return false;
    
    const now = new Date();
    const { submission_start, submission_end } = event.proposal_config;
    
    return now >= new Date(submission_start) && now <= new Date(submission_end);
  }
  
  /**
   * Validate submitter is authorized
   */
  private async validateSubmitter(
    event: any,
    email: string,
    inviteCode?: string
  ): Promise<void> {
    const { access_control } = event.proposal_config;
    
    if (access_control === 'invite_only') {
      if (!inviteCode) throw new Error('Invite code required');
      
      const invite = await db.query.invites.findFirst({
        where: and(
          eq(invites.event_id, event.id),
          eq(invites.code, inviteCode),
          eq(invites.email, email)
        ),
      });
      
      if (!invite) throw new Error('Invalid invite code');
      if (invite.invite_type === 'voting') {
        throw new Error('This code is only for voting');
      }
    }
    
    // Token-gating validation would happen at frontend before calling this
  }
  
  /**
   * Check proposal submission rate limit
   */
  private async checkRateLimit(eventId: string, email: string): Promise<void> {
    const key = `ratelimit:proposal:${eventId}:${email}`;
    const count = await redis.incr(key);
    await redis.expire(key, 3600); // 1 hour window
    
    if (count > 3) { // Max 3 proposals per hour per email
      throw new Error('Rate limit exceeded. Please try again later.');
    }
  }
  
  /**
   * Generate anonymous ID from email (SHA256 hash)
   */
  private generateAnonymousId(email: string): string {
    return createHash('sha256').update(email).digest('hex');
  }
  
  /**
   * Determine initial proposal status based on moderation mode
   */
  private getInitialStatus(proposalConfig: any): string {
    const { moderation_mode } = proposalConfig;
    
    switch (moderation_mode) {
      case 'pre_approval':
        return 'pending_approval';
      case 'post_approval':
      case 'none':
        return 'approved';
      case 'threshold':
        return 'submitted'; // Needs community upvotes
      default:
        return 'pending_approval';
    }
  }
  
  /**
   * Get proposals for an event (with status filter)
   */
  async getProposalsByEventId(
    eventId: string,
    status?: string
  ): Promise<Proposal[]> {
    const whereClause = status
      ? and(eq(proposals.event_id, eventId), eq(proposals.status, status))
      : eq(proposals.event_id, eventId);
    
    return await db.query.proposals.findMany({
      where: whereClause,
      orderBy: (proposals, { desc }) => [desc(proposals.submitted_at)],
    });
  }
  
  /**
   * Approve proposal (admin action)
   */
  async approveProposal(proposalId: string, adminUserId: string): Promise<void> {
    await db.update(proposals)
      .set({
        status: 'approved',
        approved_at: new Date(),
        approved_by: adminUserId,
      })
      .where(eq(proposals.id, proposalId));
  }
  
  /**
   * Reject proposal (admin action)
   */
  async rejectProposal(
    proposalId: string,
    adminUserId: string,
    reason: string
  ): Promise<void> {
    await db.update(proposals)
      .set({
        status: 'rejected',
        rejected_at: new Date(),
        rejection_reason: reason,
      })
      .where(eq(proposals.id, proposalId));
  }
  
  /**
   * Convert approved proposals to voting options
   */
  async convertProposalsToOptions(eventId: string): Promise<void> {
    // Get all approved proposals
    const approvedProposals = await this.getProposalsByEventId(eventId, 'approved');
    
    await db.transaction(async (tx) => {
      for (const proposal of approvedProposals) {
        // Insert as option
        const [option] = await tx.insert(options).values({
          event_id: eventId,
          title: proposal.title,
          description: proposal.description,
          image_url: proposal.image_url,
          position: 999, // Will be reordered
          source: 'community',
          created_by_proposal_id: proposal.id,
        }).returning();
        
        // Update proposal with option ID
        await tx.update(proposals)
          .set({ converted_to_option_id: option.id })
          .where(eq(proposals.id, proposal.id));
      }
    });
  }
}

export const proposalService = new ProposalService();
```

**`src/lib/services/proposals/duplicate-detection.ts`**

```typescript
import { db } from '@/lib/db/client';
import { proposals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate similarity ratio (0-1)
 */
function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

/**
 * Detect duplicate proposals by title similarity
 */
export async function detectDuplicates(
  eventId: string,
  newTitle: string,
  threshold: number = 0.85
): Promise<Array<{ id: string; title: string; similarity: number }>> {
  // Get existing proposals for this event
  const existingProposals = await db.query.proposals.findMany({
    where: and(
      eq(proposals.event_id, eventId),
      // Only check against submitted/approved proposals
      or(
        eq(proposals.status, 'submitted'),
        eq(proposals.status, 'pending_approval'),
        eq(proposals.status, 'approved')
      )
    ),
    columns: {
      id: true,
      title: true,
    },
  });
  
  const duplicates: Array<{ id: string; title: string; similarity: number }> = [];
  
  for (const existing of existingProposals) {
    const similarity = similarityRatio(newTitle, existing.title);
    if (similarity >= threshold) {
      duplicates.push({
        id: existing.id,
        title: existing.title,
        similarity: similarity,
      });
    }
  }
  
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}
```

---

## 6. Frontend Architecture

### 6.1 Component Structure

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Auth-related routes
│   ├── (marketing)/               # Landing, about, etc.
│   ├── events/
│   │   ├── create/
│   │   │   └── page.tsx           # Event creation wizard
│   │   ├── [eventId]/
│   │   │   ├── page.tsx           # Event detail page
│   │   │   ├── vote/
│   │   │   │   └── page.tsx       # Voting interface
│   │   │   ├── proposals/
│   │   │   │   ├── page.tsx       # Proposal list
│   │   │   │   └── submit/
│   │   │   │       └── page.tsx   # Proposal submission
│   │   │   ├── results/
│   │   │   │   └── page.tsx       # Results dashboard
│   │   │   └── manage/
│   │   │       └── page.tsx       # Admin panel
│   │   └── page.tsx               # Event listing
│   ├── layout.tsx                 # Root layout
│   └── providers.tsx              # React providers
├── components/
│   ├── ui/                        # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── slider.tsx
│   │   └── ...
│   ├── event/
│   │   ├── EventCard.tsx
│   │   ├── EventHeader.tsx
│   │   └── EventStatus.tsx
│   ├── voting/
│   │   ├── VotingInterface.tsx
│   │   ├── OptionCard.tsx
│   │   ├── CreditSlider.tsx
│   │   ├── VotingBar.tsx
│   │   ├── BinaryPreview.tsx
│   │   └── ProportionalPreview.tsx
│   ├── results/
│   │   ├── BinaryResultsDashboard.tsx
│   │   ├── ProportionalResultsDashboard.tsx
│   │   ├── ClusterVisualization.tsx
│   │   ├── ResultsCharts.tsx
│   │   └── ExportPanel.tsx
│   ├── proposals/
│   │   ├── ProposalSubmissionForm.tsx
│   │   ├── ProposalCard.tsx
│   │   ├── ProposalModerationPanel.tsx
│   │   └── DuplicateWarning.tsx
│   ├── wizard/
│   │   ├── EventCreationWizard.tsx
│   │   ├── BasicInfoStep.tsx
│   │   ├── DecisionFrameworkStep.tsx
│   │   ├── OptionCreationStep.tsx
│   │   └── ReviewStep.tsx
│   └── shared/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── Toast.tsx
├── lib/
│   ├── api/                       # API client functions
│   │   ├── events.ts
│   │   ├── votes.ts
│   │   ├── proposals.ts
│   │   └── results.ts
│   ├── hooks/                     # Custom React hooks
│   │   ├── useEvent.ts
│   │   ├── useVoting.ts
│   │   ├── useResults.ts
│   │   └── useProposals.ts
│   ├── stores/                    # Zustand stores
│   │   ├── votingStore.ts
│   │   ├── eventStore.ts
│   │   └── uiStore.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── calculations.ts
│   └── types/
│       ├── event.ts
│       ├── vote.ts
│       ├── proposal.ts
│       └── results.ts
└── styles/
    └── globals.css                # Tailwind imports + custom styles
```

### 6.2 Key Frontend Components

#### 6.2.1 Voting Interface Component

**`src/components/voting/VotingInterface.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useVotingStore } from '@/lib/stores/votingStore';
import { OptionCard } from './OptionCard';
import { VotingBar } from './VotingBar';
import { EventHeader } from '../event/EventHeader';
import { calculateQuadraticVotes } from '@/lib/utils/calculations';
import type { Event, Option } from '@/lib/types';

interface VotingInterfaceProps {
  event: Event;
  options: Option[];
  inviteCode: string;
}

export function VotingInterface({ event, options, inviteCode }: VotingInterfaceProps) {
  const {
    allocations,
    setAllocation,
    resetAllocations,
    loadExistingVote,
  } = useVotingStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load existing vote if present
  useEffect(() => {
    loadExistingVote(event.id, inviteCode);
  }, [event.id, inviteCode]);
  
  // Calculate credits used
  const totalCreditsUsed = Object.values(allocations).reduce((sum, c) => sum + c, 0);
  const remainingCredits = event.credits_per_voter - totalCreditsUsed;
  
  // Calculate quadratic votes
  const quadraticVotes = calculateQuadraticVotes(allocations);
  
  // Handle submission
  const handleSubmit = async () => {
    if (totalCreditsUsed > event.credits_per_voter) {
      toast.error('Total credits exceed limit');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await submitVote(event.id, inviteCode, allocations);
      toast.success('Vote submitted successfully!');
      // Optionally redirect to results
    } catch (error) {
      toast.error('Failed to submit vote');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Event header - sticky */}
      <EventHeader 
        event={event} 
        framework={event.decision_framework}
      />
      
      {/* Options list - scrollable */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {options.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              credits={allocations[option.id] || 0}
              votes={quadraticVotes[option.id] || 0}
              framework={event.decision_framework}
              onAllocate={(credits) => setAllocation(option.id, credits)}
            />
          ))}
        </div>
      </div>
      
      {/* Voting bar - fixed bottom */}
      <VotingBar
        framework={event.decision_framework}
        allocations={allocations}
        totalCredits={event.credits_per_voter}
        usedCredits={totalCreditsUsed}
        remainingCredits={remainingCredits}
        onSubmit={handleSubmit}
        onReset={resetAllocations}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

**`src/components/voting/OptionCard.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { Option, DecisionFramework } from '@/lib/types';

interface OptionCardProps {
  option: Option;
  credits: number;
  votes: number;
  framework: DecisionFramework;
  onAllocate: (credits: number) => void;
}

export function OptionCard({ option, credits, votes, framework, onAllocate }: OptionCardProps) {
  const [localValue, setLocalValue] = useState(credits);
  
  const handleSliderChange = (value: number[]) => {
    setLocalValue(value[0]);
  };
  
  const handleSliderCommit = (value: number[]) => {
    onAllocate(value[0]);
  };
  
  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{option.title}</CardTitle>
            {option.source === 'community' && (
              <Badge variant="secondary" className="mt-1">
                Community Proposal
              </Badge>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-primary">
              {votes.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              votes (√{credits})
            </div>
          </div>
        </div>
        {option.description && (
          <CardDescription className="mt-2">
            {option.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Credit allocation slider */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Credits allocated</span>
              <span className="font-medium">{localValue}</span>
            </div>
            <Slider
              value={[localValue]}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              max={100}
              step={1}
              className="cursor-pointer"
            />
          </div>
          
          {/* Framework-specific preview */}
          {framework.framework_type === 'proportional_distribution' && credits > 0 && (
            <div className="text-sm text-muted-foreground">
              This contributes {votes.toFixed(1)} votes to this option's allocation
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**`src/components/voting/VotingBar.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BinaryPreview } from './BinaryPreview';
import { ProportionalPreview } from './ProportionalPreview';
import type { DecisionFramework } from '@/lib/types';

interface VotingBarProps {
  framework: DecisionFramework;
  allocations: Record<string, number>;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  onSubmit: () => void;
  onReset: () => void;
  isSubmitting: boolean;
}

export function VotingBar({
  framework,
  allocations,
  totalCredits,
  usedCredits,
  remainingCredits,
  onSubmit,
  onReset,
  isSubmitting,
}: VotingBarProps) {
  const percentUsed = (usedCredits / totalCredits) * 100;
  const isOverBudget = usedCredits > totalCredits;
  const canSubmit = usedCredits > 0 && !isOverBudget;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Credits display */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">
              {remainingCredits} credits remaining
            </span>
            <span className={isOverBudget ? 'text-destructive font-bold' : 'text-muted-foreground'}>
              {usedCredits} / {totalCredits} used
            </span>
          </div>
          <Progress 
            value={percentUsed} 
            className={isOverBudget ? 'bg-destructive/20' : ''}
          />
        </div>
        
        {/* Framework-specific preview */}
        {framework.framework_type === 'binary_selection' && (
          <BinaryPreview 
            allocations={allocations}
            framework={framework}
          />
        )}
        
        {framework.framework_type === 'proportional_distribution' && (
          <ProportionalPreview
            allocations={allocations}
            framework={framework}
          />
        )}
        
        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={usedCredits === 0 || isSubmitting}
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Votes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### 6.2.2 Results Dashboard Components

**`src/components/results/BinaryResultsDashboard.tsx`**

```typescript
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { BinaryResults } from '@/lib/types';

interface BinaryResultsDashboardProps {
  results: BinaryResults;
}

export function BinaryResultsDashboard({ results }: BinaryResultsDashboardProps) {
  // Prepare chart data
  const chartData = [
    ...results.selected_options.map(opt => ({
      name: opt.title,
      votes: opt.votes,
      selected: true,
    })),
    ...results.not_selected_options.map(opt => ({
      name: opt.title,
      votes: opt.votes,
      selected: false,
    })),
  ];
  
  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle>Selection Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-primary">
              {results.selected_count} options selected
            </p>
            <p className="text-muted-foreground">
              Based on {results.threshold_mode.replace('_', ' ')} threshold
            </p>
            {results.selection_margin !== undefined && (
              <p className="text-sm">
                Selection margin: {results.selection_margin.toFixed(1)} votes
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Selected options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="text-green-500" />
            Selected Options ({results.selected_count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.selected_options.map((option) => (
              <div 
                key={option.option_id}
                className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div>
                  <div className="font-medium">{option.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Rank #{option.rank}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{option.votes.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">votes</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Not selected options (collapsible) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="text-gray-400" />
            Not Selected ({results.not_selected_options.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Collapsed by default with "Show all" button */}
          {/* Implementation similar to above */}
        </CardContent>
      </Card>
      
      {/* Vote distribution chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vote Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey="votes" 
                fill={(entry) => entry.selected ? '#22c55e' : '#94a3b8'}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

**`src/components/results/ProportionalResultsDashboard.tsx`**

```typescript
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { ProportionalResults } from '@/lib/types';

interface ProportionalResultsDashboardProps {
  results: ProportionalResults;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export function ProportionalResultsDashboard({ results }: ProportionalResultsDashboardProps) {
  // Prepare pie chart data
  const pieData = results.distributions.map((dist, index) => ({
    name: dist.title,
    value: dist.allocation_amount,
    percentage: dist.allocation_percentage,
    color: COLORS[index % COLORS.length],
  }));
  
  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-primary">
              {results.resource_symbol}{results.total_allocated.toLocaleString()}
            </p>
            <p className="text-muted-foreground">
              Total {results.resource_name} allocated
            </p>
            <p className="text-sm">
              Gini coefficient: {results.gini_coefficient.toFixed(3)} 
              <span className="text-muted-foreground ml-1">
                (0 = equal, 1 = unequal)
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Allocation table */}
      <Card>
        <CardHeader>
          <CardTitle>Final Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Option</th>
                  <th className="text-right py-2">Votes</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {results.distributions.map((dist, index) => (
                  <tr key={dist.option_id} className="border-b">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {dist.title}
                      </div>
                    </td>
                    <td className="text-right font-mono">{dist.votes.toFixed(1)}</td>
                    <td className="text-right font-mono">
                      {results.resource_symbol}{dist.allocation_amount.toLocaleString()}
                    </td>
                    <td className="text-right font-mono">
                      {dist.allocation_percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="py-3">TOTAL</td>
                  <td></td>
                  <td className="text-right">
                    {results.resource_symbol}{results.total_allocated.toLocaleString()}
                  </td>
                  <td className="text-right">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Pie chart */}
      <Card>
        <CardHeader>
          <CardTitle>Visual Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `${results.resource_symbol}${value.toLocaleString()}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.3 State Management (Zustand)

**`src/lib/stores/votingStore.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VotingState {
  allocations: Record<string, number>; // option_id -> credits
  eventId: string | null;
  inviteCode: string | null;
  
  // Actions
  setAllocation: (optionId: string, credits: number) => void;
  resetAllocations: () => void;
  loadExistingVote: (eventId: string, inviteCode: string) => Promise<void>;
  setEventContext: (eventId: string, inviteCode: string) => void;
}

export const useVotingStore = create<VotingState>()(
  persist(
    (set, get) => ({
      allocations: {},
      eventId: null,
      inviteCode: null,
      
      setAllocation: (optionId, credits) => {
        set((state) => ({
          allocations: {
            ...state.allocations,
            [optionId]: credits,
          },
        }));
      },
      
      resetAllocations: () => {
        set({ allocations: {} });
      },
      
      loadExistingVote: async (eventId, inviteCode) => {
        try {
          const response = await fetch(`/api/events/${eventId}/votes?code=${inviteCode}`);
          if (response.ok) {
            const data = await response.json();
            if (data.vote) {
              set({ 
                allocations: data.vote.allocations,
                eventId,
                inviteCode,
              });
            }
          }
        } catch (error) {
          console.error('Failed to load existing vote:', error);
        }
      },
      
      setEventContext: (eventId, inviteCode) => {
        set({ eventId, inviteCode });
      },
    }),
    {
      name: 'voting-storage',
      partialize: (state) => ({ 
        allocations: state.allocations,
        eventId: state.eventId,
        inviteCode: state.inviteCode,
      }),
    }
  )
);
```

---

## 7. API Specifications

### 7.1 API Route Structure

```
/api/
├── events/
│   ├── POST /                      # Create event
│   ├── GET /:id                    # Get event details
│   ├── PATCH /:id                  # Update event
│   ├── DELETE /:id                 # Delete event
│   ├── POST /:id/invites           # Generate invites
│   ├── POST /:id/invites/send      # Send invite emails
│   ├── GET /:id/options            # Get options
│   ├── POST /:id/options           # Add option (admin)
│   ├── POST /:id/votes             # Submit vote
│   ├── GET /:id/votes              # Get voter's vote (by code)
│   ├── GET /:id/results            # Get results
│   ├── GET /:id/results/export     # Export results
│   └── POST /:id/proposals/convert # Convert proposals to options
├── proposals/
│   ├── POST /                      # Submit proposal
│   ├── GET /                       # List proposals (with filters)
│   ├── GET /:id                    # Get proposal details
│   ├── PATCH /:id                  # Update proposal (submitter)
│   ├── PATCH /:id/approve          # Approve proposal (admin)
│   ├── PATCH /:id/reject           # Reject proposal (admin)
│   ├── PATCH /:id/merge            # Merge proposals (admin)
│   └── POST /:id/flag              # Flag proposal
├── auth/
│   ├── POST /validate-code         # Validate invite code
│   ├── POST /validate-token        # Validate token balance (Web3)
│   └── POST /email-verification    # Send email verification
└── export/
    ├── GET /events/:id/csv         # Export CSV
    ├── GET /events/:id/json        # Export JSON
    └── GET /events/:id/pdf         # Export PDF
```

### 7.2 API Endpoint Details

#### 7.2.1 Create Event

**POST `/api/events`**

```typescript
// Request
{
  title: string;
  description?: string;
  tags?: string[];
  image_url?: string;
  visibility: 'public' | 'private' | 'unlisted';
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  
  // Decision framework
  decision_framework: {
    framework_type: 'binary_selection' | 'proportional_distribution';
    config: BinaryDecisionConfig | ProportionalDistributionConfig;
  };
  
  // Option mode
  option_mode: 'admin_defined' | 'community_proposals' | 'hybrid';
  initial_options?: Array<{
    title: string;
    description?: string;
    image_url?: string;
  }>;
  
  // Proposal config (if applicable)
  proposal_config?: {
    enabled: boolean;
    submission_start: string;
    submission_end: string;
    moderation_mode: 'pre_approval' | 'post_approval' | 'threshold' | 'none';
    access_control: 'open' | 'invite_only' | 'token_gated';
    max_proposals_per_user: number;
    // ... other settings
  };
  
  // Voting config
  credits_per_voter: number;
  weighting_mode?: 'equal' | 'token_balance' | 'trust_score';
  
  // Token gating
  token_gating?: {
    enabled: boolean;
    token_address?: string;
    chain?: string;
    min_balance?: number;
    // ... other settings
  };
  
  // Invites (optional on creation)
  invite_emails?: string[];
}

// Response
{
  success: true;
  event: {
    id: string;
    url: string; // Public URL for event
    // ... full event object
  };
}
```

#### 7.2.2 Submit Vote

**POST `/api/events/:id/votes`**

```typescript
// Request
{
  invite_code: string;
  allocations: Record<string, number>; // { option_id: credits }
}

// Response
{
  success: true;
  vote: {
    id: string;
    receipt_code: string; // For returning to edit
    submitted_at: string;
  };
}

// Errors
{
  error: 'Invalid invite code' | 'Voting closed' | 'Credit limit exceeded' | 'Invalid option';
  message: string;
}
```

#### 7.2.3 Get Results

**GET `/api/events/:id/results`**

```typescript
// Response (Binary Selection)
{
  event_id: string;
  framework_type: 'binary_selection';
  results: {
    threshold_mode: string;
    selected_options: Array<{
      option_id: string;
      title: string;
      votes: number;
      rank: number;
      selected: true;
    }>;
    not_selected_options: Array<{...}>;
    selected_count: number;
    selection_margin?: number;
  };
  participation: {
    total_voters: number;
    total_credits_allocated: number;
    is_final: boolean;
  };
  calculated_at: string;
}

// Response (Proportional Distribution)
{
  event_id: string;
  framework_type: 'proportional_distribution';
  results: {
    resource_name: string;
    resource_symbol: string;
    total_pool: number;
    distributions: Array<{
      option_id: string;
      title: string;
      votes: number;
      allocation_amount: number;
      allocation_percentage: number;
    }>;
    total_allocated: number;
    gini_coefficient: number;
  };
  participation: {
    total_voters: number;
    total_credits_allocated: number;
    is_final: boolean;
  };
  calculated_at: string;
}
```

#### 7.2.4 Submit Proposal

**POST `/api/proposals`**

```typescript
// Request
{
  event_id: string;
  title: string;
  description?: string;
  image_url?: string;
  submitter_email: string;
  submitter_wallet?: string; // If token-gated
  invite_code?: string; // If invite-only
}

// Response
{
  success: true;
  proposal: {
    id: string;
    status: 'draft' | 'submitted' | 'pending_approval' | 'approved';
    tracking_url: string; // URL to check status
  };
}
```

#### 7.2.5 Export Results

**GET `/api/events/:id/results/export?format=csv|json|pdf`**

```typescript
// Query params
{
  format: 'csv' | 'json' | 'pdf';
  include_voter_ids?: boolean;
  include_timestamps?: boolean;
  include_proposals?: boolean;
}

// Response
// Returns file download with appropriate content-type
// - CSV: text/csv
// - JSON: application/json
// - PDF: application/pdf
```

---

## 8. Authentication & Security

### 8.1 Invite Code System

**Code Generation:**
```typescript
import { randomBytes } from 'crypto';

export function generateInviteCode(): string {
  // Generate 32-byte random string, base64url encoded
  return randomBytes(32).toString('base64url');
  // Example: "Kx3J9fG2pL8vN4mQ1wR5tY7uI0oP6aS8dF"
}
```

**Code Validation:**
```typescript
export async function validateInviteCode(
  eventId: string,
  code: string
): Promise<{ valid: boolean; invite?: Invite }> {
  // 1. Check Redis cache first
  const cached = await redis.get(`session:${code}`);
  if (cached) {
    const session = JSON.parse(cached);
    if (session.event_id === eventId) {
      return { valid: true, invite: session };
    }
  }
  
  // 2. Query database
  const invite = await db.query.invites.findFirst({
    where: and(
      eq(invites.event_id, eventId),
      eq(invites.code, code)
    ),
  });
  
  if (!invite) {
    return { valid: false };
  }
  
  // 3. Cache for subsequent requests
  await redis.setex(
    `session:${code}`,
    3600, // 1 hour TTL
    JSON.stringify({ event_id: eventId, email: invite.email })
  );
  
  return { valid: true, invite };
}
```

### 8.2 Email Encryption

**Encryption at Rest:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptEmail(email: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptEmail(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 8.3 Rate Limiting

**Implementation:**
```typescript
import { redis } from '@/lib/redis/client';

export async function checkRateLimit(
  key: string,
  limit: number,
  window: number // seconds
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, window);
  }
  
  if (count > limit) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: limit - count };
}

// Usage in API route
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, remaining } = await checkRateLimit(
    `ratelimit:vote:${ip}`,
    10, // max 10 votes
    60  // per 60 seconds
  );
  
  if (!allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // Process request...
}
```

### 8.4 CSRF Protection

**Next.js Implementation:**
```typescript
// Using next-safe-action or similar
import { createServerAction } from '@/lib/actions';

export const submitVote = createServerAction()
  .input(voteSchema)
  .handler(async ({ input }) => {
    // CSRF token automatically validated
    // Process vote...
  });
```

---

## 9. Blockchain Integration

### 9.1 Token Verification Service

**`src/lib/services/blockchain/token-verifier.ts`**

```typescript
import { createPublicClient, http } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';

const chains = {
  ethereum: mainnet,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
};

// RPC clients with fallbacks
const clients = {
  ethereum: createPublicClient({
    chain: mainnet,
    transport: http(process.env.ALCHEMY_ETH_RPC, {
      batch: true,
      retryCount: 3,
    }),
  }),
  // ... similar for other chains
};

export async function verifyTokenBalance(
  walletAddress: string,
  tokenAddress: string,
  chain: keyof typeof chains,
  minBalance: bigint
): Promise<{ valid: boolean; balance: bigint }> {
  try {
    const client = clients[chain];
    
    // ERC-20 balanceOf function signature
    const balance = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });
    
    return {
      valid: balance >= minBalance,
      balance: balance,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Unable to verify token balance');
  }
}

// Cache token balances to avoid repeated RPC calls
export async function verifyTokenBalanceCached(
  walletAddress: string,
  tokenAddress: string,
  chain: string,
  minBalance: bigint
): Promise<boolean> {
  const cacheKey = `token:${chain}:${tokenAddress}:${walletAddress}`;
  
  // Check cache (5 min TTL)
  const cached = await redis.get(cacheKey);
  if (cached) {
    const cachedBalance = BigInt(cached);
    return cachedBalance >= minBalance;
  }
  
  // Verify on-chain
  const { valid, balance } = await verifyTokenBalance(
    walletAddress,
    tokenAddress,
    chain as any,
    minBalance
  );
  
  // Cache result
  await redis.setex(cacheKey, 300, balance.toString());
  
  return valid;
}
```

### 9.2 Frontend Web3 Integration

**`src/components/auth/WalletConnect.tsx`**

```typescript
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="w-full"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect with {connector.name}
        </Button>
      ))}
    </div>
  );
}
```

---

## 10. Email & Notification System

### 10.1 Email Service

**`src/lib/services/email/email.service.ts`**

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  /**
   * Send invite email
   */
  async sendInviteEmail(
    to: string,
    eventTitle: string,
    inviteCode: string,
    eventUrl: string,
    inviteType: 'voting' | 'proposal_submission' | 'both'
  ): Promise<void> {
    const subject = `You're invited: ${eventTitle}`;
    const html = this.generateInviteEmailHtml({
      eventTitle,
      inviteCode,
      eventUrl,
      inviteType,
    });
    
    await resend.emails.send({
      from: 'QuadraticVote <noreply@quadraticvote.xyz>',
      to: to,
      subject: subject,
      html: html,
    });
  }
  
  /**
   * Send proposal status update
   */
  async sendProposalStatusEmail(
    to: string,
    proposalTitle: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    const subject = status === 'approved'
      ? `Your proposal "${proposalTitle}" was approved!`
      : `Update on your proposal "${proposalTitle}"`;
    
    const html = this.generateProposalStatusEmailHtml({
      proposalTitle,
      status,
      reason,
    });
    
    await resend.emails.send({
      from: 'QuadraticVote <noreply@quadraticvote.xyz>',
      to: to,
      subject: subject,
      html: html,
    });
  }
  
  /**
   * Generate invite email HTML
   */
  private generateInviteEmailHtml(params: {
    eventTitle: string;
    inviteCode: string;
    eventUrl: string;
    inviteType: string;
  }): string {
    const { eventTitle, inviteCode, eventUrl, inviteType } = params;
    
    let action = 'participate in voting';
    if (inviteType === 'proposal_submission') action = 'submit proposals';
    if (inviteType === 'both') action = 'submit proposals and vote';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .code { font-family: monospace; font-size: 18px; background: white; padding: 15px; border: 2px dashed #667eea; text-align: center; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <p>You've been invited to ${action} for:</p>
            <h2>${eventTitle}</h2>
            
            <p>Your unique invite code:</p>
            <div class="code">${inviteCode}</div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${eventUrl}?code=${inviteCode}" class="button">
                Get Started
              </a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Keep this code private. It can only be used by you.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  // Similar methods for other email types...
}

export const emailService = new EmailService();
```

### 10.2 Email Queue (for bulk sends)

**Using BullMQ with Redis:**

```typescript
import { Queue, Worker } from 'bullmq';
import { redis } from '@/lib/redis/client';

// Create queue
export const emailQueue = new Queue('email-queue', {
  connection: redis,
});

// Worker to process emails
const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { to, type, data } = job.data;
    
    switch (type) {
      case 'invite':
        await emailService.sendInviteEmail(to, ...data);
        break;
      case 'proposal_status':
        await emailService.sendProposalStatusEmail(to, ...data);
        break;
      // ... other types
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 emails at a time
  }
);

// Add emails to queue
export async function queueInviteEmails(
  invites: Array<{ email: string; code: string }>,
  event: Event
): Promise<void> {
  const jobs = invites.map((invite) => ({
    name: 'send-invite',
    data: {
      to: invite.email,
      type: 'invite',
      data: [event.title, invite.code, event.url, 'voting'],
    },
  }));
  
  await emailQueue.addBulk(jobs);
}
```

---

## 11. Real-Time Features

### 11.1 Server-Sent Events (SSE) for Live Results

**API Route:**

```typescript
// app/api/events/[id]/results/stream/route.ts

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;
  
  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial results
      const results = await resultService.getResults(eventId);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(results)}\n\n`)
      );
      
      // Subscribe to Redis pub/sub for updates
      const subscriber = redis.duplicate();
      await subscriber.subscribe(`results:${eventId}:updates`);
      
      subscriber.on('message', (channel, message) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      });
      
      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        subscriber.unsubscribe();
        subscriber.quit();
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Frontend Hook:**

```typescript
// src/lib/hooks/useRealTimeResults.ts

import { useEffect, useState } from 'react';

export function useRealTimeResults(eventId: string, enabled: boolean) {
  const [results, setResults] = useState<EventResults | null>(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    const eventSource = new EventSource(`/api/events/${eventId}/results/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setResults(data);
    };
    
    eventSource.onerror = () => {
      eventSource.close();
    };
    
    return () => {
      eventSource.close();
    };
  }, [eventId, enabled]);
  
  return results;
}
```

---

## 12. File Storage & CDN

### 12.1 Supabase Storage Service

**`src/lib/supabase/storage.ts`**

```typescript
import { supabase, createServiceRoleClient } from './client';

export class StorageService {
  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Blob
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get signed URL for private file (exports)
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * List files in storage bucket
   */
  async listFiles(bucket: string, path: string = '') {
    const { data, error } = await supabase.storage.from(bucket).list(path);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
  }
}

export const storageService = new StorageService();
```

**Image Upload Flow:**

1. Frontend requests upload: `POST /api/upload` with file
2. Server uploads directly to Supabase Storage bucket
3. Server returns public URL (for public buckets) or signed URL (for private)
4. Frontend uses URL when creating event/proposal/option

**Alternative Flow (Direct Client Upload):**
1. Frontend gets temporary upload token from API
2. Frontend uploads directly to Supabase Storage using client SDK
3. Frontend sends storage path to API when creating event/proposal/option

---

## 13. Analytics & Visualization

### 13.1 Cluster Analysis (t-SNE)

**`src/lib/services/analytics/cluster-calc.ts`**

```typescript
import { TSNE } from 'tsne-js';

interface VoteVector {
  voter_id: string;
  allocations: number[]; // Vector of credits per option
}

export function calculateClusterVisualization(
  votes: Array<{ invite_code: string; allocations: Record<string, number> }>,
  options: Array<{ id: string }>
): Array<{ voter_id: string; x: number; y: number; z: number }> {
  // 1. Create vote vectors (N voters x M options matrix)
  const optionIds = options.map(o => o.id);
  const vectors: number[][] = votes.map(vote => {
    return optionIds.map(optionId => vote.allocations[optionId] || 0);
  });
  
  // 2. Normalize vectors
  const normalized = vectors.map(vec => {
    const sum = vec.reduce((a, b) => a + b, 0);
    return sum > 0 ? vec.map(v => v / sum) : vec;
  });
  
  // 3. Run t-SNE for 3D projection
  const tsne = new TSNE({
    dim: 3,
    perplexity: 30,
    earlyExaggeration: 4.0,
    learningRate: 100,
    nIter: 1000,
  });
  
  tsne.init({
    data: normalized,
    type: 'dense',
  });
  
  // Run async
  tsne.run();
  
  const output = tsne.getOutput();
  
  // 4. Map back to voter IDs
  return votes.map((vote, index) => ({
    voter_id: vote.invite_code, // Use code as anonymous ID
    x: output[index][0],
    y: output[index][1],
    z: output[index][2],
  }));
}
```

### 13.2 3D Visualization Component

**`src/components/results/ClusterVisualization.tsx`**

```typescript
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useMemo } from 'react';

interface ClusterVisualizationProps {
  clusterData: Array<{ voter_id: string; x: number; y: number; z: number }>;
}

function VoterPoints({ data }: { data: ClusterVisualizationProps['clusterData'] }) {
  const positions = useMemo(() => {
    return new Float32Array(data.flatMap(d => [d.x, d.y, d.z]));
  }, [data]);
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={data.length}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#667eea" />
    </points>
  );
}

export function ClusterVisualization({ clusterData }: ClusterVisualizationProps) {
  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <OrbitControls enableDamping />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <VoterPoints data={clusterData} />
        <gridHelper args={[20, 20]} />
      </Canvas>
    </div>
  );
}
```

---

## 14. Testing Strategy

### 14.1 Unit Tests (Vitest)

**Vote Calculation Tests:**

```typescript
// src/lib/services/votes/__tests__/quadratic-calc.test.ts

import { describe, it, expect } from 'vitest';
import { calculateQuadraticVotes, aggregateVotes } from '../quadratic-calc';

describe('calculateQuadraticVotes', () => {
  it('should calculate quadratic votes correctly', () => {
    const allocations = {
      'option-1': 25,
      'option-2': 16,
      'option-3': 9,
    };
    
    const result = calculateQuadraticVotes(allocations);
    
    expect(result['option-1']).toBe(5);   // √25 = 5
    expect(result['option-2']).toBe(4);   // √16 = 4
    expect(result['option-3']).toBe(3);   // √9 = 3
  });
  
  it('should handle zero allocations', () => {
    const allocations = { 'option-1': 0 };
    const result = calculateQuadraticVotes(allocations);
    expect(result['option-1']).toBe(0);
  });
});

describe('aggregateVotes', () => {
  it('should aggregate votes across multiple voters', () => {
    const votes = [
      { allocations: { 'opt-1': 25, 'opt-2': 16 } },
      { allocations: { 'opt-1': 16, 'opt-2': 9 } },
    ];
    
    const result = aggregateVotes(votes);
    
    expect(result['opt-1']).toBe(9);  // 5 + 4
    expect(result['opt-2']).toBe(7);  // 4 + 3
  });
});
```

**Binary Results Tests:**

```typescript
// src/lib/services/results/__tests__/binary-calculator.test.ts

import { describe, it, expect } from 'vitest';
import { calculateBinaryResults } from '../binary-calculator';

describe('Binary Results - Top N Mode', () => {
  it('should select top 3 options', () => {
    const config = {
      threshold_mode: 'top_n' as const,
      top_n_count: 3,
      tiebreaker: 'timestamp' as const,
    };
    
    const voteTotals = {
      'opt-1': 100,
      'opt-2': 80,
      'opt-3': 60,
      'opt-4': 40,
      'opt-5': 20,
    };
    
    const options = [
      { id: 'opt-1', title: 'Option 1' },
      { id: 'opt-2', title: 'Option 2' },
      { id: 'opt-3', title: 'Option 3' },
      { id: 'opt-4', title: 'Option 4' },
      { id: 'opt-5', title: 'Option 5' },
    ];
    
    const result = calculateBinaryResults(config, voteTotals, options);
    
    expect(result.selected_count).toBe(3);
    expect(result.selected_options.map(o => o.option_id)).toEqual([
      'opt-1', 'opt-2', 'opt-3'
    ]);
    expect(result.selection_margin).toBe(20); // 60 - 40
  });
});
```

### 14.2 Integration Tests (Playwright)

**Vote Submission Flow:**

```typescript
// tests/e2e/vote-submission.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Vote Submission', () => {
  test('should submit vote successfully', async ({ page }) => {
    // 1. Navigate to event page with invite code
    await page.goto('/events/test-event-id?code=TEST_CODE');
    
    // 2. Allocate credits to options
    await page.getByRole('slider', { name: /Option 1/ }).fill('25');
    await page.getByRole('slider', { name: /Option 2/ }).fill('50');
    await page.getByRole('slider', { name: /Option 3/ }).fill('25');
    
    // 3. Check credits display
    await expect(page.getByText('0 credits remaining')).toBeVisible();
    
    // 4. Submit vote
    await page.getByRole('button', { name: 'Submit Votes' }).click();
    
    // 5. Verify success
    await expect(page.getByText('Vote submitted successfully')).toBeVisible();
  });
  
  test('should prevent over-allocation', async ({ page }) => {
    await page.goto('/events/test-event-id?code=TEST_CODE');
    
    // Try to allocate more than 100 credits
    await page.getByRole('slider', { name: /Option 1/ }).fill('60');
    await page.getByRole('slider', { name: /Option 2/ }).fill('60');
    
    // Submit should be disabled
    await expect(page.getByRole('button', { name: 'Submit Votes' })).toBeDisabled();
  });
});
```

---

## 15. Deployment Architecture

### 15.1 Vercel Deployment

**Configuration:**

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "regions": ["iad1"], // Single region (match Supabase region for low latency)
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "REDIS_URL": "@redis_url",
    "REDIS_TOKEN": "@redis_token",
    "RESEND_API_KEY": "@resend_api_key",
    "ENCRYPTION_KEY": "@encryption_key",
    "ALCHEMY_ETH_RPC": "@alchemy_eth_rpc"
  }
}
```

**Database: Supabase PostgreSQL**
- Connection pooling via PgBouncer (port 6543 for app, port 5432 for migrations)
- Auto-scaling based on load
- Built-in connection pooler optimized for serverless
- Unified dashboard for database, storage, and logs

**Storage: Supabase Storage**
- Integrated with database project
- Automatic CDN for public assets
- Built-in access control policies
- Signed URLs for private files

**Cache: Upstash Redis**
- Per-request pricing (serverless-friendly)
- Multi-region replication
- REST API fallback if Redis unavailable
- Region matching with Vercel deployment for low latency

### 15.2 Environment Variables

```bash
# Database (Supabase - Use Connection Pooler for app)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase API (for Storage and optional Auth)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Redis (Upstash)
REDIS_URL="https://your-redis.upstash.io"
REDIS_TOKEN="your-upstash-token"

# Email
RESEND_API_KEY="re_..."

# Blockchain
ALCHEMY_ETH_RPC="https://eth-mainnet.g.alchemy.com/v2/..."
ALCHEMY_POLYGON_RPC="..."
# ... other chains

# Security
ENCRYPTION_KEY="..." # 32-byte hex string (renamed from EMAIL_ENCRYPTION_KEY)

# App Configuration
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# Feature Flags
ENABLE_REAL_TIME_RESULTS="true"
ENABLE_TOKEN_GATING="true"

# External Services
SENTRY_DSN="..."
PLAUSIBLE_DOMAIN="quadraticvote.xyz"
```

---

## 16. Performance & Scaling

### 16.1 Database Optimization

**Indexes:**
```sql
-- Critical indexes for query performance
CREATE INDEX CONCURRENTLY idx_votes_event_id ON votes(event_id);
CREATE INDEX CONCURRENTLY idx_votes_submitted_at ON votes(event_id, submitted_at);
CREATE INDEX CONCURRENTLY idx_options_event_id ON options(event_id);
CREATE INDEX CONCURRENTLY idx_proposals_event_status ON proposals(event_id, status);

-- Partial indexes for common queries
CREATE INDEX idx_events_active ON events(id) 
  WHERE end_time > NOW() AND deleted_at IS NULL;

CREATE INDEX idx_proposals_pending ON proposals(event_id) 
  WHERE status = 'pending_approval';

-- GIN indexes for JSONB queries
CREATE INDEX idx_votes_allocations_gin ON votes USING GIN(allocations);
```

**Query Optimization:**
```typescript
// BAD: N+1 query
for (const event of events) {
  const options = await db.select().from(options).where(eq(options.event_id, event.id));
}

// GOOD: Single query with join
const eventsWithOptions = await db.query.events.findMany({
  with: {
    options: true,
  },
});
```

### 16.2 Caching Strategy

**Layer 1: Browser (Client-side)**
- React Query with stale-while-revalidate
- LocalStorage for vote drafts

**Layer 2: CDN (Vercel Edge + Supabase CDN)**
- Static assets: Vercel Edge Network (Max-Age 1 year)
- Supabase Storage: Automatic CDN for public assets
- API responses for closed events: Max-Age 1 hour

**Layer 3: Redis**
- Results cache: 5 min TTL during voting, infinite after close
- Session data: TTL = event end time
- Rate limits: Short TTL (60 seconds)

**Layer 4: PostgreSQL (Supabase)**
- Built-in query cache
- Connection pooling (PgBouncer via Supabase)
- Optimized connection pooler for serverless environments

### 16.3 Scaling Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Database connections | >80% | Upgrade Supabase tier or optimize pooling |
| Redis memory | >75% | Upgrade Upstash tier |
| API response time | >1s p95 | Investigate slow queries, add indexes |
| Vote submission rate | >100/sec | Implement queue system |
| Concurrent voters | >1000 | Enable edge caching for results |

---

## 17. Monitoring & Observability

### 17.1 Logging (Axiom)

**Structured Logging:**
```typescript
import { Logger } from '@axiom-ai/js';

const logger = new Logger({
  token: process.env.AXIOM_TOKEN,
  dataset: 'quadraticvote',
});

export function logVoteSubmission(data: {
  event_id: string;
  voter_id: string;
  total_credits: number;
  timestamp: Date;
}) {
  logger.info('vote_submitted', data);
}

export function logError(error: Error, context: Record<string, any>) {
  logger.error('application_error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
}
```

### 17.2 Error Tracking (Sentry)

**Setup:**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  
  beforeSend(event, hint) {
    // Filter out known errors
    if (hint.originalException?.message?.includes('Network error')) {
      return null;
    }
    return event;
  },
});
```

### 17.3 Metrics Dashboard

**Key Metrics to Track:**
- Vote submission rate (votes/minute)
- API response times (p50, p95, p99)
- Error rates by endpoint
- Cache hit rates (Redis, CDN)
- Database query performance
- Email delivery rates
- Token verification success rate

**Alerting Rules:**
- Alert if API p95 > 2 seconds for 5 minutes
- Alert if error rate > 5% for 2 minutes
- Alert if vote queue > 1000 pending
- Alert if database CPU > 80% for 5 minutes

---

## 18. Security Implementation

### 18.1 Input Validation

**Zod Schemas:**
```typescript
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  decision_framework: z.object({
    framework_type: z.enum(['binary_selection', 'proportional_distribution']),
    config: z.record(z.any()), // Framework-specific validation
  }),
  credits_per_voter: z.number().int().min(10).max(10000),
  // ... other fields
});

export const submitVoteSchema = z.object({
  invite_code: z.string().length(43), // Base64url length for 32 bytes
  allocations: z.record(
    z.string().uuid(),
    z.number().int().min(0)
  ),
});
```

### 18.2 SQL Injection Prevention

**Using Drizzle ORM (parameterized queries):**
```typescript
// SAFE: Drizzle automatically parameterizes
const event = await db.select()
  .from(events)
  .where(eq(events.id, userInput));

// UNSAFE: Never do this
const query = `SELECT * FROM events WHERE id = '${userInput}'`;
```

### 18.3 XSS Prevention

**React Automatically Escapes:**
```typescript
// Safe by default
<div>{userSubmittedTitle}</div>

// Dangerous (avoid)
<div dangerouslySetInnerHTML={{ __html: userSubmittedHtml }} />

// For markdown, use sanitization
import DOMPurify from 'isomorphic-dompurify';
const cleanHtml = DOMPurify.sanitize(markdownToHtml(userMarkdown));
```

### 18.4 CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## 19. Development Workflow

### 19.1 Git Workflow

```
main (production)
  └─ develop (staging)
      ├─ feature/event-creation
      ├─ feature/proposal-system
      └─ bugfix/vote-validation
```

**Branch Naming:**
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Production hotfixes
- `refactor/description` - Code refactoring

### 19.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Lint
        run: pnpm lint
      
      - name: Type check
        run: pnpm type-check
      
      - name: Run unit tests
        run: pnpm test
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Build
        run: pnpm build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 19.3 Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/org/quadraticvote.git
cd quadraticvote

# 2. Install dependencies
pnpm install

# 3. Set up Supabase project
# - Create Supabase project at https://supabase.com
# - Get Connection Pooler URL (port 6543) from Project Settings > Database
# - Get API credentials from Project Settings > API

# 4. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials:
# - DATABASE_URL (Connection Pooler URL with ?pgbouncer=true)
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

# 5. Set up Upstash Redis (or use local Redis)
# - Create Redis instance at https://upstash.com
# - Add REDIS_URL and REDIS_TOKEN to .env.local

# 6. Push database schema to Supabase
pnpm db:push

# 7. Start development server
pnpm dev

# Open http://localhost:3000
```

---

## 20. Migration & Versioning

### 20.1 Database Migrations

**Drizzle Kit:**
```bash
# Generate migration from schema changes
pnpm db:generate  # Uses new Drizzle Kit API

# Apply migrations to database
pnpm db:push  # Uses Supabase connection (connection pooler for app, direct for migrations)

# Open Drizzle Studio (use direct connection port 5432)
pnpm db:studio
```

**Example Migration:**
```sql
-- migrations/0001_add_gini_coefficient.sql
ALTER TABLE cached_results 
ADD COLUMN gini_coefficient DECIMAL(5,4);

-- Backfill for existing results
UPDATE cached_results 
SET gini_coefficient = 0 
WHERE gini_coefficient IS NULL;
```

### 20.2 API Versioning

**URL-based versioning (if needed in future):**
```
/api/v1/events/:id
/api/v2/events/:id  # Breaking changes
```

**Current approach:** Maintain backward compatibility in single API version
- Add optional fields rather than changing required fields
- Deprecate old fields gradually with warnings
- Use feature flags for experimental features

### 20.3 Data Model Versioning

**JSONB fields include version:**
```typescript
{
  decision_framework: {
    version: 1,
    framework_type: 'binary_selection',
    config: { ... }
  }
}

// When reading, check version and migrate if needed
function migrateFrameworkConfig(data: any) {
  if (data.version === 1) {
    // Current version, no migration
    return data;
  }
  // Apply migrations for older versions
}
```

---

## Appendices

### Appendix A: Technology Alternatives Considered

| Component | Chosen | Alternatives Considered | Rationale |
|-----------|--------|-------------------------|-----------|
| Framework | Next.js | Remix, SvelteKit | Best ecosystem, Vercel integration |
| Database | Supabase PostgreSQL | Neon, MySQL, MongoDB, Self-hosted | ACID compliance, JSONB support, built-in connection pooling for serverless, integrated Storage |
| ORM | Drizzle | Prisma, TypeORM | Performance, SQL-first approach |
| Cache | Upstash Redis | Memcached, Self-hosted Redis | Serverless-compatible, per-request pricing, REST API fallback |
| Storage | Supabase Storage | AWS S3, Cloudflare R2 | Integrated with database, no separate setup, automatic CDN |
| Email | Resend | SendGrid, AWS SES | Developer experience, pricing |
| Hosting | Vercel | AWS, Netlify, Self-hosted | Zero-config deployment, optimized for Next.js, edge functions, preview deployments |

### Appendix B: Estimated Resource Usage

**Small Event (100 voters):**
- Database: ~50 MB storage
- Redis: ~10 MB
- Supabase Storage: ~20 MB (images)
- Bandwidth: ~500 MB/month

**Large Event (10,000 voters):**
- Database: ~5 GB storage
- Redis: ~100 MB
- Supabase Storage: ~500 MB
- Bandwidth: ~50 GB/month

### Appendix C: Cost Estimates (Monthly)

**MVP Tier (up to 1,000 voters/month):**
- Vercel: $0 (Free tier)
- Supabase: $0 (Free tier: 500MB DB, 1GB Storage)
- Upstash: $0 (Free tier: 10K commands/day)
- Resend: $0 (Free tier: 100 emails/day)
- **Total: $0/month**

**Production Tier (up to 10,000 voters/month):**
- Vercel: $20 (Pro)
- Supabase: $25 (Pro)
- Upstash: $10 (Pay as you go)
- Resend: $20 (50k emails)
- **Total: ~$75/month**

### Appendix D: Glossary

- **Quadratic Voting**: Voting system where cost of votes = square of vote count
- **Binary Selection**: Decision framework for choosing winners (yes/no outcomes)
- **Proportional Distribution**: Decision framework for allocating resources
- **Invite Code**: Unique identifier for anonymous voter authentication
- **Ephemeral**: Temporary, designed to be short-lived
- **Framework-Agnostic**: Independent of specific decision framework
- **t-SNE**: Dimensionality reduction algorithm for visualization
- **Gini Coefficient**: Measure of inequality (0=equal, 1=unequal)

---

## Conclusion

This technical architecture provides a comprehensive blueprint for implementing QuadraticVote.xyz as a production-ready platform. The architecture prioritizes:

1. **Dual Framework Support**: Binary selection and proportional distribution are first-class citizens
2. **Scalability**: Designed to handle 10,000+ concurrent voters
3. **Security**: Multiple layers of protection for anonymous voting
4. **Developer Experience**: Type-safe, well-tested, easy to maintain
5. **Cost Efficiency**: Serverless-first approach minimizes infrastructure costs

**Next Steps:**
1. Review and approve this architecture
2. Set up development environment
3. Create initial database schema
4. Implement core voting logic (MVP)
5. Build frontend components
6. Conduct security audit
7. Deploy to staging
8. Beta testing with select communities
9. Production launch

**Timeline Estimate:** 6-8 months to feature-complete v1.0 with team of 2-3 engineers.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-01  
**Author:** Technical Architecture Team  
**Status:** Approved for Implementation