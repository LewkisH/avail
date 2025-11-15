import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarService } from '@/lib/services/calendar.service';
import { z } from 'zod';

// Validation schema for updating a time slot
const updateTimeSlotSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    description: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) => {
      // If both startTime and endTime are provided, validate the order
      if (data.startTime && data.endTime) {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        return end > start;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

/**
 * PUT /api/calendar/timeslots/[id]
 * Update an existing time slot
 * Body: { title?, startTime?, endTime?, description? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (authResult.error) {
    return authResult.response;
  }

  const { user } = authResult;

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'User not found' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = updateTimeSlotSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validationResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { title, startTime, endTime, description } = validationResult.data;

    const updateData: {
      title?: string;
      startTime?: Date;
      endTime?: Date;
      description?: string;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (description !== undefined) updateData.description = description || undefined;

    const timeSlot = await CalendarService.updateTimeSlot(
      id,
      user.id,
      updateData
    );

    return NextResponse.json(timeSlot);
  } catch (error: any) {
    console.error('Error updating time slot:', error);

    if (error.message === 'Time slot not found') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Time slot not found',
          },
        },
        { status: 404 }
      );
    }

    if (
      error.message === 'Unauthorized to update this time slot' ||
      error.message === 'Can only update manually created time slots'
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update time slot',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/timeslots/[id]
 * Delete a time slot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (authResult.error) {
    return authResult.response;
  }

  const { user } = authResult;

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'User not found' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    await CalendarService.deleteTimeSlot(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting time slot:', error);

    if (error.message === 'Time slot not found') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Time slot not found',
          },
        },
        { status: 404 }
      );
    }

    if (
      error.message === 'Unauthorized to delete this time slot' ||
      error.message === 'Can only delete manually created time slots'
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete time slot',
        },
      },
      { status: 500 }
    );
  }
}
