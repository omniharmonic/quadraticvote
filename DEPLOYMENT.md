# Deployment Guide: Vercel + Supabase

This guide walks you through deploying QuadraticVote.xyz to Vercel with Supabase as the database backend.

## Prerequisites

- [Vercel account](https://vercel.com/signup)
- [Supabase account](https://supabase.com)
- [Upstash Redis account](https://upstash.com)
- [Resend account](https://resend.com) (for email notifications)
- Git repository (GitHub, GitLab, or Bitbucket)

## Part 1: Set Up Supabase Database

### 1. Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: quadraticvote
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"

### 2. Get Database Connection Strings

Once your project is ready:

1. Go to **Project Settings** > **Database**
2. Scroll to **Connection string** section
3. Copy both connection strings:

   **For Application (Connection Pooler - Transaction Mode)**:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   **For Migrations (Direct Connection)**:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 3. Get Supabase API Keys

1. Go to **Project Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon public key**: Your public API key
   - **service_role key**: Your service role key (keep this secret!)

### 4. Set Up Database Schema

Run the migrations locally first to test:

```bash
# Create .env.local file with your connection strings
cat > .env.local << EOF
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
EOF

# Generate migrations
pnpm run db:generate

# Apply migrations to Supabase
pnpm run db:push
```

### 5. Create Storage Buckets (Optional)

If using Supabase Storage for file uploads:

1. Go to **Storage** in Supabase Dashboard
2. Create these buckets:
   - `event-images` (Public)
   - `proposal-attachments` (Public or Private based on needs)

## Part 2: Set Up Upstash Redis

### 1. Create a Redis Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click "Create Database"
3. Configure:
   - **Name**: quadraticvote-cache
   - **Type**: Regional
   - **Region**: Same as your Vercel deployment
   - **TLS**: Enabled
4. Click "Create"

### 2. Get Redis Credentials

1. In your database dashboard, find:
   - **REST URL**: Your Redis URL
   - **REST Token**: Your Redis token

## Part 3: Set Up Resend (Email)

### 1. Create a Resend Account

1. Go to [Resend](https://resend.com)
2. Sign up and verify your email
3. Go to **API Keys**
4. Create a new API key
5. Copy the API key (save this!)

### 2. Configure Domain (For Production)

1. Go to **Domains** in Resend
2. Add your domain
3. Configure DNS records as instructed
4. Verify domain

## Part 4: Deploy to Vercel

### 1. Push Code to Git

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/quadraticvote.git
git push -u origin main
```

### 2. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

### 3. Configure Environment Variables

In Vercel project settings > Environment Variables, add:

#### Database Configuration
```
DATABASE_URL = postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL = https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key-here
```

#### Redis Configuration
```
REDIS_URL = your-upstash-redis-url
REDIS_TOKEN = your-upstash-redis-token
```

#### Email Configuration
```
RESEND_API_KEY = re_your-resend-api-key
FROM_EMAIL = noreply@yourdomain.com
```

#### Application Configuration
```
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
ENCRYPTION_KEY = [generate-a-random-32-character-string]
```

#### Optional Configuration
```
ENABLE_ANALYTICS = false
ENABLE_WEB3_WALLET = false
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 60000
```

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployed site!

## Part 5: Post-Deployment Configuration

### 1. Configure Custom Domain (Optional)

1. Go to Vercel Project > Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### 2. Enable Vercel Analytics (Optional)

1. Go to Vercel Project > Analytics
2. Enable Web Analytics
3. Enable Speed Insights

### 3. Set Up Monitoring

1. Enable Vercel Monitoring for error tracking
2. Configure Supabase logging
3. Monitor Redis usage in Upstash dashboard

## Part 6: Database Migrations for Production

When you need to update the database schema:

```bash
# 1. Make changes to src/lib/db/schema.ts

# 2. Generate migration
pnpm run db:generate

# 3. Review the migration files in ./drizzle

# 4. Push to production database
# (Use direct connection URL for migrations)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" pnpm run db:push

# 5. Deploy to Vercel (push to main branch)
git add .
git commit -m "Database schema update"
git push
```

## Troubleshooting

### Connection Pooling Issues

If you see "too many connections" errors:

1. Make sure you're using the connection pooler URL (port 6543)
2. Verify `?pgbouncer=true` is in the connection string
3. Check Supabase Dashboard > Database > Connection Pooling settings

### Build Failures

If build fails with module errors:

```bash
# Clear cache and rebuild locally
rm -rf .next node_modules
pnpm install
pnpm run build
```

### Migration Issues

If migrations fail:

1. Check that you're using the **direct connection** (port 5432) for migrations
2. Verify database credentials
3. Check Supabase logs for errors

### Redis Connection Issues

If Redis connection fails:

1. Verify REDIS_URL and REDIS_TOKEN are correct
2. Check that Upstash database is in the same region as Vercel deployment
3. Ensure TLS is enabled

## Security Checklist

- [ ] All environment variables are set as secrets in Vercel
- [ ] Service role key is never exposed to client
- [ ] Rate limiting is configured
- [ ] Database has RLS policies enabled (if using Supabase Auth)
- [ ] CORS is properly configured
- [ ] Domain is verified in Resend
- [ ] HTTPS is enforced

## Performance Optimization

### 1. Enable Edge Caching

Configure in `next.config.js`:

```javascript
experimental: {
  serverActions: true,
}
```

### 2. Optimize Redis Usage

- Use Redis for session storage
- Cache frequently accessed data
- Set appropriate TTLs

### 3. Database Query Optimization

- Create indexes for frequently queried fields
- Use prepared statements (Drizzle does this automatically)
- Monitor slow queries in Supabase dashboard

### 4. Image Optimization

If using Supabase Storage:

```typescript
// Use Next.js Image component with Supabase URLs
import Image from 'next/image';

<Image
  src={supabaseImageUrl}
  width={800}
  height={600}
  alt="Event banner"
/>
```

## Monitoring and Maintenance

### Daily Checks

- Monitor Vercel deployment status
- Check error logs in Vercel dashboard
- Review Supabase database metrics

### Weekly Tasks

- Review API usage in Upstash
- Check email delivery rates in Resend
- Monitor database size in Supabase

### Monthly Tasks

- Review and optimize slow queries
- Update dependencies
- Review and rotate API keys if needed
- Backup database (Supabase has automatic backups)

## Cost Estimation

Based on 1,000 monthly active users:

- **Vercel**: Free (Hobby) or $20/month (Pro)
- **Supabase**: Free tier or $25/month (Pro)
- **Upstash Redis**: Free tier or ~$10/month
- **Resend**: Free (100 emails/day) or $20/month (50k emails)

**Total**: $0-75/month depending on usage and tier

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Upstash Documentation](https://docs.upstash.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

## Next Steps

After successful deployment:

1. Test all functionality in production
2. Set up continuous integration/deployment
3. Configure monitoring and alerts
4. Plan scaling strategy for growth
5. Implement backup and disaster recovery procedures

