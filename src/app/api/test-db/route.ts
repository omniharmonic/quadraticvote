import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase-client';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

/**
 * Simple database connection test endpoint
 */
export async function GET(request: NextRequest) {
  console.log('=== DATABASE TEST API CALLED ===');
  console.log('Environment check:', {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
    SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
  });

  try {
    // Test 1: Basic Supabase connection test
    console.log('Testing basic Supabase connection...');
    const { data: basicTest, error: basicError } = await supabase
      .from('events')
      .select('count')
      .limit(1);

    if (basicError) {
      console.log('Basic test error:', basicError);
    } else {
      console.log('Basic test result:', basicTest);
    }

    // Test 2: Check if we can query events table structure
    console.log('Testing events table access...');
    const { data: eventsTest, error: eventsError } = await supabase
      .from('events')
      .select('id, title, created_at')
      .limit(1);

    if (eventsError) {
      console.log('Events test error:', eventsError);
    } else {
      console.log('Events test result:', eventsTest);
    }

    // Test 3: Test raw SQL via RPC (if needed)
    console.log('Testing raw SQL capabilities...');
    const { data: sqlTest, error: sqlError } = await supabase.rpc('get_table_info');

    if (sqlError && sqlError.message.includes('function get_table_info() does not exist')) {
      console.log('RPC function not available (expected), but connection works');
    } else if (sqlError) {
      console.log('SQL test error:', sqlError);
    } else {
      console.log('SQL test result:', sqlTest);
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      tests: {
        basicConnection: basicError ? { error: basicError.message } : { success: true, count: basicTest?.length || 0 },
        eventsTableAccess: eventsError ? { error: eventsError.message } : { success: true, count: eventsTest?.length || 0 },
        rawSqlSupport: sqlError ? { error: sqlError.message } : { success: true },
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