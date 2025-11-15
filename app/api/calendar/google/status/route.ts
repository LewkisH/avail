import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/services/google-calendar.service';

/**
 * GET /api/calendar/google/status
 * Returns Google Calendar connection status
 * Returns: { connected: boolean, connectedAt?: string, lastSyncAt?: string, error?: string }
 */
export async function GET() {
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
    const status = await GoogleCalendarService.getConnectionStatus(user.id);

    // Convert dates to ISO strings for JSON serialization
    return NextResponse.json({
      connected: status.connected,
      connectedAt: status.connectedAt?.toISOString(),
      lastSyncAt: status.lastSyncAt?.toISOString(),
      error: status.error,
    });
  } catch (error) {
    console.error('Error fetching Google Calendar status:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch connection status',
        },
      },
      { status: 500 }
    );
  }
}
