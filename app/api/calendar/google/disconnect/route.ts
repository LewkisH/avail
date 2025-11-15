import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/services/google-calendar.service';

/**
 * POST /api/calendar/google/disconnect
 * Disconnects Google Calendar by revoking tokens and deleting from database
 * Returns: { success: boolean }
 */
export async function POST() {
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
    await GoogleCalendarService.disconnect(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to disconnect Google Calendar',
        },
      },
      { status: 500 }
    );
  }
}
