import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/services/google-calendar.service';
import { z } from 'zod';

// Validation schema for sync request
const syncRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * POST /api/calendar/google/sync
 * Triggers manual sync from Google Calendar
 * Body: { startDate?: string, endDate?: string }
 * Returns: { created: number, updated: number, deleted: number }
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
    // Check if Google Calendar is connected
    const status = await GoogleCalendarService.getConnectionStatus(user.id);
    if (!status.connected) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_CONNECTED',
            message: 'Google Calendar is not connected',
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validationResult = syncRequestSchema.safeParse(body);

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

    const { startDate: startDateStr, endDate: endDateStr } = validationResult.data;

    // Default to 3 months back and 3 months forward if not provided
    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

    // Validate date range
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

    // Perform sync
    const syncStats = await GoogleCalendarService.syncFromGoogle(
      user.id,
      startDate,
      endDate
    );

    return NextResponse.json(syncStats);
  } catch (error: any) {
    console.error('Error syncing from Google Calendar:', error);

    // Handle specific error cases
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_CONNECTED',
            message: 'Google Calendar is not connected',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to sync from Google Calendar',
        },
      },
      { status: 500 }
    );
  }
}
