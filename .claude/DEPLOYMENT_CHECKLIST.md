# 🚀 Quick Deployment Checklist

Use this checklist to ensure you've completed all steps for deploying to Vercel with Supabase.

## ✅ Pre-Deployment Checklist

### 1. Dependencies
- [ ] Run `pnpm install` to install all dependencies
- [ ] Verify `@supabase/supabase-js` and `postgres` are installed
- [ ] Confirm no dependency conflicts or warnings

### 2. Supabase Setup
- [ ] Created Supabase account at https://supabase.com
- [ ] Created new project
- [ ] Noted down project password (you'll need it!)
- [ ] Copied **Connection Pooler URL** (port 6543) from Project Settings > Database
- [ ] Copied **Project URL** from Project Settings > API
- [ ] Copied **anon public key** from Project Settings > API
- [ ] Copied **service_role key** from Project Settings > API

### 3. Upstash Redis Setup
- [ ] Created Upstash account at https://upstash.com
- [ ] Created new Redis database (same region as Vercel)
- [ ] Copied REST URL
- [ ] Copied REST Token

### 4. Resend Setup (Optional but Recommended)
- [ ] Created Resend account at https://resend.com
- [ ] Created API key
- [ ] Configured domain (or using test domain)

### 5. Local Environment
- [ ] Created `.env.local` file in project root
- [ ] Added all required environment variables (see below)
- [ ] Generated encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Verified all values are correct

### 6. Database Schema
- [ ] Run `pnpm db:push` successfully
- [ ] Verified tables created in Supabase Dashboard > Table Editor
- [ ] Confirmed all 8 tables exist: users, events, options, proposals, invites, votes, proposal_flags, cached_results

### 7. Local Testing
- [ ] Started dev server: `pnpm dev`
- [ ] Application loads at http://localhost:3000
- [ ] No console errors in browser
- [ ] Tested event creation
- [ ] Tested voting flow
- [ ] Tested results display

### 8. Git Repository
- [ ] Code committed to Git
- [ ] Repository pushed to GitHub/GitLab/Bitbucket
- [ ] Repository is accessible (not private, or Vercel has access)
- [ ] `.env.local` is in `.gitignore` (not committed!)

## 🔐 Environment Variables Required

Create this in `.env.local` for local development:

```bash
# Database (Supabase Connection Pooler)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase API
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."

# Redis (Upstash)
REDIS_URL="https://your-redis.upstash.io"
REDIS_TOKEN="AXm..."

# Security (Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY="your-64-character-hex-string"

# Email (Optional)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@yourdomain.com"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional Features
ENABLE_ANALYTICS="false"
ENABLE_WEB3_WALLET="false"
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="60000"
```

## 🚀 Vercel Deployment Checklist

### 1. Create Vercel Project
- [ ] Logged into Vercel Dashboard
- [ ] Clicked "Add New" > "Project"
- [ ] Selected Git repository
- [ ] Configured Framework Preset: Next.js

### 2. Configure Build Settings
- [ ] Build Command: `pnpm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `pnpm install`
- [ ] Root Directory: `./` (project root)

### 3. Add Environment Variables in Vercel
Go to **Project Settings** > **Environment Variables** and add each:

#### Database (Required)
- [ ] `DATABASE_URL` = `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`

#### Supabase (Required)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://[PROJECT-REF].supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Your service role key

#### Redis (Required)
- [ ] `REDIS_URL` = Your Upstash Redis URL
- [ ] `REDIS_TOKEN` = Your Upstash token

#### Security (Required)
- [ ] `ENCRYPTION_KEY` = Your generated 64-char hex string

#### Email (Recommended)
- [ ] `RESEND_API_KEY` = Your Resend API key
- [ ] `FROM_EMAIL` = Your sender email

#### App Configuration (Required)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`

#### Optional Features
- [ ] `ENABLE_ANALYTICS` = `false`
- [ ] `ENABLE_WEB3_WALLET` = `false`
- [ ] `RATE_LIMIT_REQUESTS` = `100`
- [ ] `RATE_LIMIT_WINDOW` = `60000`

### 4. Deploy
- [ ] Clicked "Deploy"
- [ ] Build completed successfully (no errors)
- [ ] Deployment shows as "Ready"
- [ ] Got deployment URL: `https://your-app.vercel.app`

## ✅ Post-Deployment Verification

### 1. Basic Functionality
- [ ] Site loads without errors
- [ ] Homepage displays correctly
- [ ] No console errors in browser

### 2. API Testing
Test these endpoints:

- [ ] GET `https://your-app.vercel.app/api/events` - Returns empty array or events
- [ ] POST `https://your-app.vercel.app/api/events` - Creates event (test with curl or Postman)
- [ ] GET `https://your-app.vercel.app/api/events/[id]` - Returns event details

### 3. Full User Flow
- [ ] Navigate to event creation page
- [ ] Create a test event (both frameworks)
- [ ] View event details
- [ ] Cast votes on event
- [ ] View results
- [ ] Submit proposal (if enabled)

### 4. Performance
- [ ] Page load time < 3 seconds
- [ ] API responses < 1 second
- [ ] No "too many connections" database errors
- [ ] No Redis connection errors

### 5. Monitoring
- [ ] Check Vercel Dashboard > Analytics
- [ ] Check Vercel Dashboard > Logs (no errors)
- [ ] Check Supabase Dashboard > Database > Connections
- [ ] Check Upstash Dashboard > Redis > Metrics

## 🔧 Post-Deployment Configuration

### 1. Custom Domain (Optional)
- [ ] Added custom domain in Vercel
- [ ] Configured DNS records
- [ ] SSL certificate generated
- [ ] Updated `NEXT_PUBLIC_APP_URL` environment variable

### 2. Enable Features
- [ ] Verified email domain in Resend
- [ ] Tested email sending (if implemented)
- [ ] Configured analytics (if enabled)
- [ ] Set up monitoring alerts

### 3. Security
- [ ] Reviewed Vercel security settings
- [ ] Enabled Vercel Authentication (if needed)
- [ ] Reviewed Supabase RLS policies (if using)
- [ ] Confirmed all secrets are set as environment variables

## 📊 Success Criteria

You've successfully deployed when:

✅ **All environments are green in Vercel**
✅ **Site loads without errors**
✅ **Can create events via UI**
✅ **Can vote on events**
✅ **Results display correctly**
✅ **No database connection errors**
✅ **No Redis errors**
✅ **Monitoring shows healthy metrics**

## ❌ Common Issues & Solutions

### "Error: DATABASE_URL is not set"
**Solution:** Add DATABASE_URL to Vercel environment variables and redeploy

### "Error: too many connections"
**Solution:** Verify you're using Connection Pooler URL (port 6543) with `?pgbouncer=true`

### "Error: Cannot connect to Redis"
**Solution:** 
1. Check REDIS_URL and REDIS_TOKEN in Vercel
2. Verify Upstash database is active
3. Check region compatibility

### "Error: Module not found"
**Solution:**
1. Delete `node_modules` and `.next` locally
2. Run `pnpm install`
3. Commit `pnpm-lock.yaml`
4. Push and redeploy

### Build Timeout
**Solution:**
1. Check Vercel build logs for specific error
2. Verify all dependencies are in `package.json`
3. Try deploying again (sometimes it's a temporary issue)

### Environment Variables Not Working
**Solution:**
1. Make sure they're added to **all** environments (Production, Preview, Development)
2. After adding variables, trigger a new deployment
3. Variables only take effect on new deployments

## 🎯 Next Steps After Deployment

1. **Test thoroughly** - Go through all user flows
2. **Monitor** - Watch logs and metrics for first 24 hours
3. **Optimize** - Review performance and make adjustments
4. **Scale** - Plan for increased usage (upgrade tiers if needed)
5. **Iterate** - Add remaining features (email, moderation, analytics)

## 📚 Reference Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive deployment guide
- [VERCEL_SUPABASE_MIGRATION.md](./VERCEL_SUPABASE_MIGRATION.md) - Technical migration details
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Local development setup
- [README.md](./README.md) - Project overview

---

**Need Help?**

If you get stuck:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check Supabase project logs
4. Review the detailed [DEPLOYMENT.md](./DEPLOYMENT.md) guide
5. Verify all environment variables are set correctly

Good luck with your deployment! 🚀

