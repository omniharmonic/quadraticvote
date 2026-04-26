import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { withEventAdmin } from '@/lib/utils/auth-middleware';

const supabase = createServiceRoleClient();

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/:id/options/reorder
 * Body: { optionIds: string[] } — order = new position (0-indexed)
 *
 * Two-pass write: there is a UNIQUE (event_id, position) index, so we first
 * park every option at a high offset (10_000+) before writing final positions
 * to avoid transient collisions.
 */
export const POST = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { optionIds } = body as { optionIds?: string[] };

    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'optionIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from('options')
      .select('id')
      .eq('event_id', eventId);

    if (fetchError) {
      throw new Error(`Failed to fetch options: ${fetchError.message}`);
    }

    const existingIds = new Set((existing || []).map(o => o.id));
    const allMatch =
      optionIds.length === existingIds.size &&
      optionIds.every(id => existingIds.has(id));

    if (!allMatch) {
      return NextResponse.json(
        { success: false, error: 'optionIds must include every option for this event exactly once' },
        { status: 400 }
      );
    }

    const PARK_OFFSET = 10_000;

    for (let i = 0; i < optionIds.length; i++) {
      const { error } = await supabase
        .from('options')
        .update({ position: PARK_OFFSET + i })
        .eq('id', optionIds[i])
        .eq('event_id', eventId);
      if (error) throw new Error(`Park step failed: ${error.message}`);
    }

    for (let i = 0; i < optionIds.length; i++) {
      const { error } = await supabase
        .from('options')
        .update({ position: i })
        .eq('id', optionIds[i])
        .eq('event_id', eventId);
      if (error) throw new Error(`Final step failed: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Option reorder error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reorder options',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
