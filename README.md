# QuadraticVote.xyz

A full-stack platform for democratic decision-making using quadratic voting with dual decision frameworks.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ installed
- pnpm package manager (`npm install -g pnpm`)
- PostgreSQL database (Supabase recommended for production)
- Redis instance (local or Upstash recommended)

### Installation

1. **Install dependencies**
```bash
pnpm install
```

2. **Set up environment variables**

Create a `.env.local` file in the root directory:

```bash
# Database (Required - Use Supabase Connection Pooler)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase (Required - Get from Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Redis (Required - choose one)
# For local development:
REDIS_URL="redis://localhost:6379"

# OR for Upstash (recommended for production):
REDIS_URL="https://your-redis.upstash.io"
REDIS_TOKEN="your-upstash-token"

# Security (Required)
ENCRYPTION_KEY="your-64-character-hex-string"
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Email (Optional but recommended)
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@yourdomain.com"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Feature Flags (Optional)
ENABLE_ANALYTICS="false"
ENABLE_WEB3_WALLET="false"
```

3. **Apply database schema**

```bash
pnpm db:push
```

This will create all necessary tables in your PostgreSQL database.

4. **Start development server**

```bash
pnpm dev
```

Visit http://localhost:3000 to see the test dashboard.

## 🚢 Deployment

### Deploying to Vercel with Supabase

This project is optimized for deployment on **Vercel** with **Supabase** as the database backend. See the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide for:

- Setting up Supabase (database)
- Configuring Upstash Redis
- Setting up Resend (emails)
- Deploying to Vercel
- Environment variable configuration
- Post-deployment monitoring

**Quick Deploy:**

1. Push your code to GitHub
2. Import to Vercel
3. Add environment variables from your Supabase project
4. Deploy!

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🧪 Testing the System

### Using the Test Dashboard

1. Open http://localhost:3000
2. Click "Test Event Creation API" to create a sample event
3. Click "Test List Events API" to fetch all events
4. Check the response data to verify everything is working

### Manual API Testing

**Create an Event:**

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Community Budget Decision",
    "description": "Vote on how to allocate our community budget",
    "visibility": "public",
    "startTime": "2025-01-01T00:00:00Z",
    "endTime": "2025-12-31T23:59:59Z",
    "decisionFramework": {
      "framework_type": "binary_selection",
      "config": {
        "threshold_mode": "top_n",
        "top_n_count": 3,
        "tiebreaker": "timestamp"
      }
    },
    "optionMode": "admin_defined",
    "creditsPerVoter": 100,
    "initialOptions": [
      {"title": "Build a Park"},
      {"title": "Repair Roads"},
      {"title": "Community Center"}
    ]
  }'
```

**Get Event Details:**

```bash
curl http://localhost:3000/api/events/{event-id}
```

**Submit a Vote:**

First, you'll need an invite code. For testing, you can manually insert one into the database:

```sql
INSERT INTO invites (event_id, email, code, invite_type) 
VALUES ('your-event-id', 'test@example.com', 'test-code-123', 'voting');
```

Then submit a vote:

```bash
curl -X POST http://localhost:3000/api/events/{event-id}/votes \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "test-code-123",
    "allocations": {
      "option-id-1": 25,
      "option-id-2": 50,
      "option-id-3": 25
    }
  }'
```

**Get Results:**

```bash
curl http://localhost:3000/api/events/{event-id}/results
```

## 📁 Project Structure

```
quadraticvote/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   └── events/
│   │   ├── page.tsx              # Test dashboard
│   │   └── layout.tsx
│   └── lib/
│       ├── db/                   # Database
│       │   ├── schema.ts         # Drizzle schema
│       │   └── client.ts         # DB connection
│       ├── redis/                # Redis cache
│       │   └── client.ts
│       ├── services/             # Business logic
│       │   ├── event.service.ts
│       │   ├── vote.service.ts
│       │   └── result.service.ts
│       ├── utils/                # Utilities
│       │   ├── quadratic.ts
│       │   ├── auth.ts
│       │   └── rate-limit.ts
│       ├── validators/           # Zod schemas
│       │   └── index.ts
│       └── types/                # TypeScript types
│           └── index.ts
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

## 🎯 What's Implemented

### ✅ Phase 1 Foundation (100% Complete)

- [x] Next.js 14 project setup with TypeScript
- [x] Database schema with Drizzle ORM (8 tables)
- [x] Redis cache configuration
- [x] Core service layer (Event, Vote, Result, Proposal)
- [x] Quadratic voting calculations
- [x] Complete API endpoints (10+ routes)
- [x] Dual decision framework support:
  - Binary Selection (4 threshold modes)
  - Proportional Distribution (with Gini coefficient)
- [x] Rate limiting and security utilities
- [x] Test dashboard for verification

### ✅ Phase 2 Enhanced Features (60% Complete)

- [x] **Complete UI Component Library** (Shadcn UI)
  - Button, Card, Input, Label, Textarea, Slider, Progress, Badge, Dialog, Select, Toast
- [x] **Event Creation Wizard** (4-step process)
  - Basic info, Framework selection, Configuration, Options
- [x] **Voting Interface**
  - Credit allocation with sliders
  - Real-time quadratic calculation
  - Framework-specific previews
  - Mobile-optimized
- [x] **Results Dashboard** (Both Frameworks)
  - Binary: Rankings, selected/not selected, margins
  - Proportional: Allocations, percentages, Gini coefficient
- [x] **Proposal Submission System**
  - API endpoints for submission
  - Status management
  - Conversion to voting options
- [x] **Home Page & Navigation**
  - Landing page with event listing
  - Framework comparison
  - Responsive design

### 🚧 Phase 2 Remaining (40%)

- [ ] Email notification system (Resend integration)
- [ ] Admin moderation interface
- [ ] Advanced analytics & 3D visualizations

### ✅ Deployment Infrastructure (100% Complete)

- [x] **Vercel Deployment Configuration**
  - vercel.json with optimized settings
  - Environment variable setup
  - Serverless function configuration
- [x] **Supabase Database Integration**
  - Connection pooling for serverless
  - Drizzle ORM configuration
  - Migration support
- [x] **Supabase Storage Utilities**
  - File upload/delete helpers
  - Signed URLs for private files
  - Public URL generation
- [x] **Comprehensive Deployment Guide**
  - Step-by-step Supabase setup
  - Vercel deployment instructions
  - Environment configuration
  - Post-deployment checklist

### 🎯 Core Features

**Decision Frameworks:**
- **Binary Selection**: Choose top N winners using quadratic voting
  - Threshold modes: top_n, percentage, absolute_votes, above_average
  - Tiebreaker strategies
- **Proportional Distribution**: Allocate resources proportionally
  - Minimum allocation floors
  - Gini coefficient inequality measurement

**Voting System:**
- Quadratic voting formula (votes = √credits)
- Credit allocation validation
- Vote editing support
- Anonymous invite code authentication

**Results Calculation:**
- Real-time aggregation
- Cached results for performance
- Framework-specific result formats
- Participation statistics

## 🔧 Development Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server

# Database
pnpm db:generate      # Generate migrations
pnpm db:push          # Apply schema to database
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking

# Testing (to be implemented)
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
```

## 🏗️ Next Steps

The following features are planned for subsequent phases:

### Phase 2 - Enhanced Features (In Progress)
- [x] Frontend voting interface
- [x] Results visualization dashboards
- [x] Proposal submission system
- [ ] Email notification system (Resend)
- [ ] Advanced moderation tools
- [ ] Token gating (Web3 integration)

### Phase 3 - Advanced Features
- [ ] 3D cluster visualization
- [ ] Advanced analytics dashboard
- [ ] PDF report generation
- [ ] Public API with authentication
- [ ] Webhook system for integrations
- [ ] Multi-chain blockchain support
- [ ] Real-time collaboration features

## 🐛 Troubleshooting

**Database Connection Issues:**
```bash
# Verify your DATABASE_URL is correct
# For Supabase (use Connection Pooler), it should look like:
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Make sure you're using port 6543 (pooler) not 5432 (direct)
```

**Redis Connection Issues:**
```bash
# For local Redis, make sure it's running:
redis-cli ping
# Should return: PONG

# For Upstash, verify your credentials in the dashboard
```

**Environment Variables:**
```bash
# Generate encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Make sure .env.local exists and is not committed to git
```

## 📚 Documentation

- **Setup & Development:**
  - [Setup Guide](./SETUP_GUIDE.md) - Local development setup
  - [Deployment Guide](./DEPLOYMENT.md) - Vercel + Supabase deployment
  - [Progress Tracker](./PROGRESS.md) - Implementation progress
  - [Testing Guide](./TESTING.md) - Testing strategies

- **Project Specifications:**
  - [Product Requirements Document](/.claude/prd_quadraticvote.md)
  - [Technical Architecture](/.claude/technical_architecture_quadraticvote.md)
  - [Implementation Plan](/.claude/implementation_plan_quadraticvote.md)

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, Shadcn UI, Radix UI
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle ORM
- **Caching:** Upstash Redis
- **Authentication:** Custom invite code system
- **Email:** Resend
- **Deployment:** Vercel (serverless)
- **Storage:** Supabase Storage
- **Analytics:** Recharts (data visualization)

## 🤝 Contributing

This project follows the implementation plan outlined in the documentation. Each feature is tracked and implemented systematically.

## 📝 License

Private project - All rights reserved.

---

**Status:** Phase 2 Enhanced Features (60% Complete) 🚀

**Latest Updates:**
- ✅ Vercel + Supabase deployment infrastructure
- ✅ Complete UI component library (Shadcn UI)
- ✅ Event creation wizard
- ✅ Voting interface with credit allocation
- ✅ Results dashboard (both frameworks)
- ✅ Proposal submission system

**Next:** Email notifications, admin moderation, advanced analytics

