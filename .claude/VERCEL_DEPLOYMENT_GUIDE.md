# Vercel Deployment Configuration Guide

## Environment Variables Required

The following environment variables must be configured in your Vercel project dashboard to resolve the "supabaseKey is required" deployment error:

### Frontend Environment Variables (NEXT_PUBLIC_*)
These are exposed to the browser and must be prefixed with `NEXT_PUBLIC_`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend Environment Variables (Server-only)
These are only available on the server and should NOT be prefixed with `NEXT_PUBLIC_`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Redis Environment Variables (if using)
```bash
REDIS_URL=redis://your-redis-instance.com:6379
```

## Vercel Configuration Steps

1. **Go to your Vercel project dashboard**
   - Navigate to Project Settings > Environment Variables

2. **Add each environment variable**:
   - Variable Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase project URL
   - Environment: All (Production, Preview, Development)

   - Variable Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: Your Supabase anonymous/public key
   - Environment: All

   - Variable Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your Supabase service role key (secret)
   - Environment: All

3. **Redeploy your application**
   - Either push a new commit or use the "Redeploy" button in Vercel

## Key Changes Made

### 1. Unified Supabase Client
- Created single `/src/lib/supabase.ts` file replacing duplicates
- Proper environment variable validation with clear error messages
- Correct separation of client-side (anon key) vs server-side (service role) clients

### 2. Fixed Authentication Architecture
- Client-side operations use anonymous key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Server-side admin operations use service role key (`SUPABASE_SERVICE_ROLE_KEY`)
- Proper session persistence and token refresh configuration

### 3. Environment Variable Validation
```typescript
// Environment variable validation with clear error messages
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set');
}
```

## Troubleshooting

### "supabaseKey is required" Error
This error occurs when:
- Environment variables are not properly configured in Vercel
- Using server-only variables on the client side
- Missing `NEXT_PUBLIC_` prefix for client-side variables

**Solution**: Ensure all client-side Supabase variables use the `NEXT_PUBLIC_` prefix and are configured in Vercel.

### Build Failures
If builds fail with TypeScript errors:
- Ensure all environment variables are properly typed
- Check that auth-schema interfaces are available
- Verify all imports use the unified `/src/lib/supabase` client

### Authentication Issues
If authentication doesn't work after deployment:
- Verify Supabase redirect URLs include your Vercel domains
- Check that both anon key and service role key are correctly configured
- Ensure auth callbacks are properly configured

## Fix Auth Redirect URLs (CRITICAL)

**Issue**: Email confirmation links redirect to localhost:3000 instead of production

**Solution**: Update Supabase Auth Configuration

1. **Go to Supabase Dashboard**:
   - Navigate to https://supabase.com/dashboard
   - Select your project
   - Go to Authentication > URL Configuration

2. **Update Site URL**:
   ```
   From: http://localhost:3000
   To: https://your-vercel-app.vercel.app
   ```

3. **Update Redirect URLs** (add both):
   ```
   Production: https://your-vercel-app.vercel.app/auth/callback
   Development: http://localhost:3000/auth/callback
   ```

4. **Save Configuration**

Note: The redirect URLs must be configured in your Supabase dashboard for email confirmations to work correctly in production.

## Verification Steps

After deployment:
1. Test user registration and login
2. Verify email confirmation links go to production domain
3. Verify admin authentication works
4. Check that event creation/management functions
5. Test voting and results display
6. Confirm all API routes respond correctly

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side operations only
- Configure Row Level Security (RLS) policies in Supabase
- Regularly rotate service role keys if compromised