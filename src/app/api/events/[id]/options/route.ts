import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { options } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

    const eventOptions = await db.select().from(options)
      .where(eq(options.eventId, eventId))
      .orderBy(options.position);

    return NextResponse.json({
      success: true,
      options: eventOptions,
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
    const existingOptions = await db.select().from(options)
      .where(eq(options.eventId, eventId));

    const nextPosition = existingOptions.length;

    const [newOption] = await db.insert(options).values({
      eventId,
      title: title.trim(),
      description: description?.trim() || '',
      position: nextPosition,
      source: 'admin',
    }).returning();

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

    const [updatedOption] = await db.update(options)
      .set(updateData)
      .where(and(
        eq(options.id, optionId),
        eq(options.eventId, eventId)
      ))
      .returning();

    if (!updatedOption) {
      return NextResponse.json(
        { success: false, error: 'Option not found' },
        { status: 404 }
      );
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

    const deletedOptions = await db.delete(options)
      .where(and(
        eq(options.id, optionId),
        eq(options.eventId, eventId)
      ))
      .returning();

    if (deletedOptions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Option not found' },
        { status: 404 }
      );
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