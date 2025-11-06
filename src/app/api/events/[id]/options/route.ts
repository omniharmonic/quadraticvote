import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase-client';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

/**
 * GET /api/events/:id/options
 * Get all options for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    const { data: eventOptions, error } = await supabase
      .from('options')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch options: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      options: eventOptions || [],
    });
  } catch (error) {
    console.error('Options fetch error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch options',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/:id/options
 * Create a new option for an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const body = await request.json();

    const { title, description } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get the next position
    const { data: existingOptions, error: countError } = await supabase
      .from('options')
      .select('id')
      .eq('event_id', eventId);

    if (countError) {
      throw new Error(`Failed to count existing options: ${countError.message}`);
    }

    const nextPosition = (existingOptions || []).length;

    const { data: newOption, error: insertError } = await supabase
      .from('options')
      .insert({
        event_id: eventId,
        title: title.trim(),
        description: description?.trim() || '',
        position: nextPosition,
        source: 'admin',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create option: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      option: newOption,
    });
  } catch (error) {
    console.error('Option creation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create option',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/:id/options
 * Update an existing option
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const body = await request.json();

    const { optionId, title, description, position } = body;

    if (!optionId) {
      return NextResponse.json(
        { success: false, error: 'Option ID is required' },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      title: title.trim(),
      description: description?.trim() || '',
    };

    if (typeof position === 'number') {
      updateData.position = position;
    }

    const { data: updatedOption, error: updateError } = await supabase
      .from('options')
      .update({
        title: updateData.title,
        description: updateData.description,
        ...(typeof updateData.position === 'number' ? { position: updateData.position } : {})
      })
      .eq('id', optionId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { success: false, error: 'Option not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to update option: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      option: updatedOption,
    });
  } catch (error) {
    console.error('Option update error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update option',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/:id/options
 * Delete an option
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const optionId = searchParams.get('optionId');

    if (!optionId) {
      return NextResponse.json(
        { success: false, error: 'Option ID is required' },
        { status: 400 }
      );
    }

    const { data: deletedOption, error: deleteError } = await supabase
      .from('options')
      .delete()
      .eq('id', optionId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (deleteError) {
      if (deleteError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { success: false, error: 'Option not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to delete option: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Option deleted successfully',
    });
  } catch (error) {
    console.error('Option deletion error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete option',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}