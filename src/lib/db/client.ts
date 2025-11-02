import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection with pooling for Supabase
// Use connection pooling for serverless environments (Vercel)
const connectionString = process.env.DATABASE_URL;

// For Supabase, use the connection pooler endpoint (port 6543)
// Format: postgres://user:pass@host:6543/dbname?pgbouncer=true
const client = postgres(connectionString, {
  max: 1, // Limit connections in serverless
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

