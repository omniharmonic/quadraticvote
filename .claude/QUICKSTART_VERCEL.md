# ⚡ Quick Start: Deploy to Vercel in 15 Minutes

This guide gets you from zero to deployed in ~15 minutes.

## 📋 What You'll Need

- GitHub account
- Vercel account (sign up with GitHub at https://vercel.com)
- Supabase account (sign up at https://supabase.com)
- Upstash account (sign up at https://upstash.com)

## 🚀 Step-by-Step

### 1️⃣ Set Up Supabase (5 minutes)

1. Go to https://supabase.com → Sign up
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Create or select
   - **Name**: `quadraticvote`
   - **Database Password**: Generate strong password (SAVE THIS!)
   - **Region**: Choose closest to you
4. Click **"Create new project"** (takes ~2 min to provision)

**While you wait**, open a text file and prepare to copy these values:

5. Once ready, go to **Project Settings** > **Database** > **Connection string**
6. Select **"Transaction"** mode, copy the URI (port 6543):
   ```
   postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
7. Add `?pgbouncer=true` to the end
8. Save as: `DATABASE_URL`

9. Go to **Project Settings** > **API**
10. Copy these three values:
    - **Project URL** → Save as: `NEXT_PUBLIC_SUPABASE_URL`
    - **anon public** key → Save as: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - **service_role** key → Save as: `SUPABASE_SERVICE_ROLE_KEY`

### 2️⃣ Set Up Upstash Redis (2 minutes)

1. Go to https://upstash.com → Sign up
2. Click **"Create Database"**
3. Fill in:
   - **Name**: `quadraticvote-cache`
   - **Type**: Regional
   - **Region**: Same as your Supabase (or closest)
   - **TLS**: Enabled
4. Click **"Create"**
5. In database dashboard, copy:
   - **UPSTASH_REDIS_REST_URL** → Save as: `REDIS_URL`
   - **UPSTASH_REDIS_REST_TOKEN** → Save as: `REDIS_TOKEN`

### 3️⃣ Generate Encryption Key (30 seconds)

Open terminal and run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output → Save as: `ENCRYPTION_KEY`

### 4️⃣ Push to GitHub (2 minutes)

```bash
# In your project directory
git add .
git commit -m "Refactor for Vercel + Supabase deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quadraticvote.git
git push -u origin main
```

### 5️⃣ Deploy to Vercel (5 minutes)

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** > **"Project"**
3. Click **"Import"** next to your GitHub repo
4. Configure:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

5. Click **"Environment Variables"**
6. Add these variables (paste from your text file):

   ```
   DATABASE_URL = [your connection pooler URL]
   NEXT_PUBLIC_SUPABASE_URL = [your supabase URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [your anon key]
   SUPABASE_SERVICE_ROLE_KEY = [your service role key]
   REDIS_URL = [your upstash URL]
   REDIS_TOKEN = [your upstash token]
   ENCRYPTION_KEY = [your generated key]
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   ```

   **For each variable:**
   - Paste the key in "Name"
   - Paste the value in "Value"
   - Select all environments (Production, Preview, Development)
   - Click "Add"

7. Click **"Deploy"**

Wait 2-3 minutes for build to complete...

### 6️⃣ Set Up Database Schema (1 minute)

Once deployment is complete, you need to create the database tables.

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Push database schema
pnpm db:push
```

**Option B: Using Local Connection**

Create `.env.local` with your Supabase credentials:

```bash
DATABASE_URL="your-supabase-pooler-url"
```

Then run:

```bash
pnpm install
pnpm db:push
```

### 7️⃣ Verify Deployment (1 minute)

1. Go to your Vercel deployment URL
2. You should see the home page load
3. Try creating an event
4. Try voting on an event

**If you see errors**, check:
- Vercel deployment logs
- All environment variables are set
- Database schema was pushed successfully

## ✅ You're Done!

Your app is now live at: `https://your-app.vercel.app`

## 🎯 Next Steps

### Update App URL

1. Copy your Vercel URL
2. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
3. Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
4. Redeploy (or wait for next git push)

### Set Up Custom Domain (Optional)

1. In Vercel, go to **Settings** > **Domains**
2. Add your domain
3. Configure DNS as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your domain

### Enable Email Notifications (Optional)

1. Sign up at https://resend.com
2. Get API key
3. Add to Vercel environment variables:
   ```
   RESEND_API_KEY = re_your_api_key
   FROM_EMAIL = noreply@yourdomain.com
   ```

## 🐛 Common Issues

### Build Failed

**Error**: "Module not found"
**Fix**: Make sure `pnpm-lock.yaml` is committed to git

### Database Connection Error

**Error**: "too many connections"
**Fix**: Verify DATABASE_URL uses port 6543 and includes `?pgbouncer=true`

### Environment Variables Not Working

**Error**: Variables undefined
**Fix**: 
1. Make sure variables are added to all environments
2. Trigger a new deployment (push to git or click "Redeploy")

### Site Loads But No Data

**Error**: API returns empty
**Fix**: Run `pnpm db:push` to create database tables

## 📞 Need Help?

- **Detailed Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Checklist**: See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Technical Details**: See [VERCEL_SUPABASE_MIGRATION.md](./VERCEL_SUPABASE_MIGRATION.md)

## 🎉 Celebrate!

You've just deployed a full-stack Next.js app with:
- ✅ Serverless functions
- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ Automatic scaling
- ✅ Global CDN

All on free tiers! 🚀

---

**Estimated Total Time**: 15-20 minutes

**Estimated Monthly Cost** (free tier): $0

**Capacity** (free tier): 
- ~10,000 events
- ~20,000 page views/month
- 100+ concurrent users

