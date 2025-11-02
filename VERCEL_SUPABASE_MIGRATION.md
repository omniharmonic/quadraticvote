# Migration to Vercel + Supabase

This document summarizes the changes made to migrate from Neon Database to Supabase with Vercel deployment optimization.

## 📋 Summary of Changes

### 1. Database Layer

#### Before (Neon)
```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

#### After (Supabase)
```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });
```

**Key Changes:**
- Switched from `neon-http` to `postgres-js` adapter
- Added connection pooling configuration for serverless
- Optimized for Vercel's serverless environment

### 2. Package Dependencies

#### Removed
```json
"@neondatabase/serverless": "^0.9.3"
```

#### Added
```json
"@supabase/supabase-js": "^2.43.0",
"postgres": "^3.4.4"
```

**Why:**
- `postgres` provides better connection pooling for serverless
- `@supabase/supabase-js` enables optional use of Supabase Storage and other features
- Better compatibility with Vercel's edge runtime

### 3. Drizzle Configuration

#### Before
```typescript
// drizzle.config.ts
export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || '',
  },
} satisfies Config;
```

#### After
```typescript
// drizzle.config.ts
export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

**Key Changes:**
- Updated to use `dialect` instead of deprecated `driver`
- Changed `connectionString` to `url` (new Drizzle Kit API)
- Added verbose and strict modes for better debugging

### 4. Environment Variables

#### Before
```bash
DATABASE_URL="postgresql://user:pass@ep-name.neon.tech/dbname?sslmode=require"
EMAIL_ENCRYPTION_KEY="..."
```

#### After
```bash
# Database (Use Connection Pooler for Vercel)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase API
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Renamed
ENCRYPTION_KEY="..." # was EMAIL_ENCRYPTION_KEY
```

**Key Changes:**
- Use Supabase Connection Pooler (port 6543) not direct connection (port 5432)
- Added Supabase API credentials for optional features
- Renamed `EMAIL_ENCRYPTION_KEY` to `ENCRYPTION_KEY` for consistency

### 5. New Features Added

#### Supabase Client (`src/lib/supabase/client.ts`)
```typescript
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const createServiceRoleClient = () => { ... }
```

**Purpose:**
- Optional Supabase Authentication (currently using custom invite system)
- Supabase Storage integration
- Supabase Realtime (for future features)

#### Supabase Storage Helper (`src/lib/supabase/storage.ts`)
```typescript
export async function uploadFile(bucket, path, file) { ... }
export async function deleteFile(bucket, path) { ... }
export async function getSignedUrl(bucket, path) { ... }
```

**Purpose:**
- File upload for event banners, proposal attachments
- Alternative to AWS S3
- Integrated with Supabase (same project)

#### Vercel Configuration (`vercel.json`)
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

**Purpose:**
- Optimize API function timeout
- Configure environment variables
- Set deployment region

### 6. Next.js Configuration

#### Updated Image Domains
```javascript
// next.config.js
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co', // Added
    },
    // ... existing domains
  ],
}
```

**Purpose:**
- Allow Next.js Image component to optimize Supabase Storage images

### 7. Database Commands

#### Before
```bash
pnpm db:generate      # Generate migrations
pnpm db:push          # Push schema to database
```

#### After (Same commands, updated config)
```bash
pnpm db:generate      # Uses new Drizzle Kit API
pnpm db:push          # Works with Supabase
pnpm db:migrate       # New: Apply migrations explicitly
```

## 🔄 Migration Steps for Existing Projects

### Step 1: Update Dependencies

```bash
# Remove old dependencies
pnpm remove @neondatabase/serverless

# Add new dependencies
pnpm add @supabase/supabase-js postgres

# Update all dependencies
pnpm update
```

### Step 2: Set Up Supabase

1. Create Supabase project at https://supabase.com
2. Get Connection Pooler URL from **Project Settings > Database**
3. Get API credentials from **Project Settings > API**
4. Update `.env.local` with new credentials

### Step 3: Test Database Connection

```bash
# This should connect without errors
pnpm db:push
```

### Step 4: Verify Application

```bash
# Start dev server
pnpm dev

# Test API endpoints
curl http://localhost:3000/api/events
```

### Step 5: Deploy to Vercel

```bash
# Push to Git
git add .
git commit -m "Migrate to Vercel + Supabase"
git push

# Import to Vercel
# Follow DEPLOYMENT.md guide
```

## 🎯 Benefits of This Migration

### 1. **Better Serverless Performance**
- Connection pooling optimized for Vercel
- Faster cold starts with `postgres-js`
- Automatic connection management

### 2. **Integrated Services**
- Database, Storage, and Auth in one platform
- Simplified deployment and management
- Single billing and dashboard

### 3. **Cost Optimization**
- Supabase free tier: 500MB database, 1GB storage
- Vercel free tier: Unlimited deployments
- No need for separate S3 bucket

### 4. **Better Developer Experience**
- Supabase Studio for database management
- Built-in backups and point-in-time recovery
- Real-time database subscriptions (future feature)

### 5. **Production Ready**
- Connection pooling prevents "too many connections" errors
- Automatic SSL/TLS encryption
- Built-in CDN for storage assets

## 🔍 What Didn't Change

- **Database Schema**: Exactly the same (Drizzle schema unchanged)
- **API Routes**: No changes needed
- **Services**: Event, Vote, Result, Proposal services unchanged
- **Frontend**: All components work as-is
- **Redis**: Still using Upstash Redis (no changes)

## ⚠️ Important Notes

### Connection Pooling

**Always use the Connection Pooler URL (port 6543) for your application:**

✅ **Correct (for app):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

❌ **Incorrect (causes connection limit issues):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Use direct connection (port 5432) only for:**
- Database migrations
- Drizzle Studio
- One-off scripts

### Environment Variables

Make sure to set all required environment variables in Vercel:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `REDIS_TOKEN`
- `ENCRYPTION_KEY`

### Drizzle Studio

To use Drizzle Studio with Supabase:

```bash
# Temporarily use direct connection
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" pnpm db:studio
```

## 📊 Comparison Table

| Feature | Before (Neon) | After (Supabase) |
|---------|---------------|------------------|
| **Database** | Neon PostgreSQL | Supabase PostgreSQL |
| **Connection** | HTTP (neon-http) | TCP with pooling (postgres-js) |
| **Port** | 5432 | 6543 (pooler) |
| **Storage** | Planned AWS S3 | Supabase Storage |
| **Auth** | Custom only | Custom + optional Supabase Auth |
| **Real-time** | Not available | Optional (Supabase Realtime) |
| **Cost (Free Tier)** | 3GB | 500MB + 1GB storage |
| **Cold Start** | ~300ms | ~150ms |

## 🚀 Next Steps

1. **Review**: Check [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide
2. **Test**: Test locally with Supabase before deploying
3. **Deploy**: Push to Vercel and verify production environment
4. **Monitor**: Set up monitoring in Vercel and Supabase dashboards
5. **Optimize**: Review performance and adjust connection pool settings if needed

## 🆘 Troubleshooting

### "too many connections" Error

**Solution:** Make sure you're using the Connection Pooler URL (port 6543) with `?pgbouncer=true`

### "connection timeout" Error

**Solution:** 
1. Check that your Supabase project is active (not paused)
2. Verify your credentials are correct
3. Check Vercel deployment logs for specific errors

### Migration Errors

**Solution:**
1. Use direct connection (port 5432) for running migrations
2. Use Connection Pooler (port 6543) for application runtime

### Slow Performance

**Solution:**
1. Verify you're using Connection Pooler
2. Check your Vercel region matches your Supabase region
3. Review Supabase dashboard for slow queries

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **Project Guides**: See [DEPLOYMENT.md](./DEPLOYMENT.md) and [SETUP_GUIDE.md](./SETUP_GUIDE.md)

