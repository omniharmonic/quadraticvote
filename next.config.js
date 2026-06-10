/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
  async headers() {
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isProd = process.env.NODE_ENV === 'production';

    // Allow the configured Supabase origin (REST/Auth) in addition to the
    // managed *.supabase.co wildcard, so self-hosted / local stacks work.
    let supabaseOrigin = '';
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
      }
    } catch {
      /* ignore malformed URL */
    }

    // Content Security Policy. Next.js injects inline styles and (in dev) uses
    // eval for HMR, so 'unsafe-inline'/'unsafe-eval' are scoped accordingly.
    // connect-src allows the Supabase REST/Auth/Realtime endpoints.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co${supabaseOrigin ? ' ' + supabaseOrigin : ''}`,
      "form-action 'self'",
    ].join('; ');

    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: csp },
      ...(isProd
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
        : []),
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Vary', value: 'Origin' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

