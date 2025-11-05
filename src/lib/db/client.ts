import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use a dummy connection string for build time when DATABASE_URL is not available
const connectionString = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';

// Create postgres connection with pooling for Supabase
// Use connection pooling for serverless environments (Vercel)
const client = postgres(connectionString, {
  max: 1, // Limit connections in serverless
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

