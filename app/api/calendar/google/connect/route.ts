import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/services/google-calendar.service';

/**
 * GET /api/calendar/google/connect
 * Initiates OAuth flow by generating authorization URL
 * Returns: { authUrl: string }
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
    const authUrl = GoogleCalendarService.generateAuthUrl(user.id);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google Calendar auth URL:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate authorization URL',
        },
      },
      { status: 500 }
    );
  }
}
