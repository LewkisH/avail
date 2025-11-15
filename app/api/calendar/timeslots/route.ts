import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarService } from '@/lib/services/calendar.service';
import { z } from 'zod';

// Validation schema for creating a time slot
const createTimeSlotSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    description: z.string().max(1000).optional(),
    timezone: z.string().default('UTC'),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

/**
 * GET /api/calendar/timeslots
 * Fetch user time slots with optional date range filtering
 * Query params:
 * - start: ISO date string (optional)
 * - end: ISO date string (optional)
 */
export async function GET(request: NextRequest) {
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

  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    // Default to current week if no date range provided
    const now = new Date();
    const startDate = startParam ? new Date(startParam) : new Date(now.setDate(now.getDate() - 7));
    const endDate = endParam ? new Date(endParam) : new Date(now.setDate(now.getDate() + 14));

    // Validate date range
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid date format. Use ISO 8601 format.',
          },
        },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'End date must be after start date',
          },
        },
        { status: 400 }
      );
    }

    const timeSlots = await CalendarService.getUserTimeSlots(
      user.id,
      startDate,
      endDate
    );

    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch time slots',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/timeslots
 * Create a new time slot
 * Body: { title, startTime, endTime, description?, timezone }
 */
export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createTimeSlotSchema.safeParse(body);

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

    const { title, startTime, endTime, description, timezone } =
      validationResult.data;

    const timeSlot = await CalendarService.createTimeSlot(user.id, {
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      description,
      timezone,
    });

    return NextResponse.json(timeSlot, { status: 201 });
  } catch (error) {
    console.error('Error creating time slot:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create time slot',
        },
      },
      { status: 500 }
    );
  }
}
