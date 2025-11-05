# QuadraticVote.xyz - Setup Guide

## 🎯 Quick Setup Checklist

Follow these steps to get your development environment running:

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Set Up Database

**Option A: Use Supabase (Recommended - Production Ready)**

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Wait for the project to be ready (takes ~2 minutes)
4. Go to **Project Settings** > **Database**
5. Copy the **Connection Pooling** connection string (Transaction mode, port 6543)
6. It should look like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`

**Option B: Use Local PostgreSQL**

```bash
# Install PostgreSQL (macOS with Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb quadraticvote

# Your connection string:
DATABASE_URL="postgresql://localhost:5432/quadraticvote"
```

### Step 3: Set Up Redis

**Option A: Use Upstash (Recommended for serverless)**

1. Go to https://upstash.com and create a free account
2. Create a new Redis database
3. Copy the REST URL and token from the dashboard
4. Add to your `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token-here"
   ```

**Option B: Use Local Redis**

```bash
# Install Redis (macOS with Homebrew)
brew install redis
brew services start redis

# Verify it's running
redis-cli ping
# Should output: PONG

# Add to your .env.local:
REDIS_URL="redis://localhost:6379"
```

### Step 4: Create Environment File

Create `.env.local` in the project root:

```bash
# Copy the example
cp env.example .env.local

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit `.env.local` with your values:

```env
# Database (Supabase Connection Pooling)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase (Get from Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Redis (choose one)
REDIS_URL="redis://localhost:6379"
# OR for Upstash
REDIS_URL="your-upstash-url"
REDIS_TOKEN="your-upstash-token"

# Security (paste the generated key)
ENCRYPTION_KEY="paste-64-char-hex-string-here"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@yourdomain.com"
```

### Step 5: Apply Database Schema

```bash
pnpm db:push
```

This will create all tables in your database. You should see output like:
```
✓ Schema pushed to database successfully
```

### Step 6: Start Development Server

```bash
pnpm dev
```

Open http://localhost:3000 - you should see the test dashboard!

## ✅ Verification

### Test 1: Check the Test Dashboard

1. Go to http://localhost:3000
2. You should see a clean interface with test buttons

### Test 2: Create a Test Event

1. Click "Test Event Creation API"
2. You should see: "✅ Event created successfully!"
3. The response should show event details with an ID

### Test 3: List Events

1. Click "Test List Events API"
2. You should see your created event in the response

### Test 4: Manual Database Check (Optional)

If you have Drizzle Studio installed:

```bash
pnpm db:studio
```

This opens a visual database browser where you can see:
- Your created events
- Database schema
- All tables

## 🔧 Troubleshooting

### Issue: "DATABASE_URL environment variable is not set"

**Solution:** Make sure `.env.local` exists and contains `DATABASE_URL`

### Issue: "ECONNREFUSED" when connecting to database

**Solution:**
- For Supabase: Check your connection string includes `?pgbouncer=true` and uses port 6543
- For local: Verify PostgreSQL is running with `pg_isready`
- Make sure you're using the **Connection Pooler** URL, not the direct connection URL

### Issue: Redis connection fails

**Solution:**
- For Upstash: Verify your REST URL and token are correct
- For local: Check Redis is running with `redis-cli ping`

### Issue: "Cannot find module" errors

**Solution:**
```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev
```

## 🎓 Next Steps

Once everything is working:

1. **Explore the API:**
   - Check out the API routes in `src/app/api/`
   - Test endpoints with curl or Postman

2. **Understand the Code:**
   - Review services in `src/lib/services/`
   - Look at the database schema in `src/lib/db/schema.ts`
   - Understand the dual framework system

3. **Create Real Events:**
   - Try both Binary Selection and Proportional Distribution frameworks
   - Test with different threshold modes
   - Experiment with vote allocations

4. **Read the Documentation:**
   - Product Requirements: `.claude/prd_quadraticvote.md`
   - Technical Architecture: `.claude/technical_architecture_quadraticvote.md`
   - Implementation Plan: `.claude/implementation_plan_quadraticvote.md`

## 📊 What You Have Now

✅ **Complete Backend:**
- Database schema with all tables
- Event creation and management
- Vote submission and validation
- Results calculation (both frameworks)
- Quadratic voting math
- Rate limiting and security

✅ **Working API:**
- POST /api/events (create event)
- GET /api/events (list events)
- GET /api/events/:id (get event)
- POST /api/events/:id/votes (submit vote)
- GET /api/events/:id/votes (get vote)
- GET /api/events/:id/results (get results)

✅ **Core Features:**
- Dual decision frameworks
- Invite code system
- Redis caching
- Rate limiting
- Security utilities

## 🚀 Ready to Build More

You now have a solid foundation. The next phase involves:
- Frontend voting interfaces
- Results visualization
- Email notifications
- Proposal submission
- And much more!

Check the Implementation Plan for the complete roadmap.

---

**Need Help?**

If you encounter any issues:
1. Check this guide's troubleshooting section
2. Review the main README.md
3. Check the technical architecture document
4. Examine the example code in the test dashboard

Happy building! 🎉

