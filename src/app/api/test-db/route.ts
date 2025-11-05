import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

/**
 * Simple database connection test endpoint
 */
export async function GET(request: NextRequest) {
  console.log('=== DATABASE TEST API CALLED ===');
  console.log('Environment check:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
  });

  try {
    // Test 1: Simple raw SQL query
    console.log('Testing basic SQL query...');
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Basic SQL result:', result);

    // Test 2: Check if events table exists
    console.log('Checking if events table exists...');
    const tableCheck = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'events'
    `);
    console.log('Events table check:', tableCheck);

    // Test 3: List all tables
    console.log('Listing all tables...');
    const allTables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('All tables:', allTables);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tests: {
        basicQuery: result,
        eventsTableExists: tableCheck.length > 0,
        allTables: allTables,
      },
    });
  } catch (error) {
    console.error('=== DATABASE TEST ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Full error object:', error);

    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    }, { status: 500 });
  }
}