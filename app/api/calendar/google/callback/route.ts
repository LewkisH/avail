import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/services/google-calendar.service';

/**
 * GET /api/calendar/google/callback
 * Handles OAuth callback from Google
 * Query params:
 * - code: Authorization code from Google
 * - state: User ID
 * - error: Error code if user denied access
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  // Handle user denial
  if (error === 'access_denied') {
    return NextResponse.redirect(
      new URL('/calendar?error=access_denied', request.url)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/calendar?error=invalid_callback', request.url)
    );
  }

  const userId = state;

  try {
    // Exchange code for tokens and store in database
    console.log('[OAuth Callback] Starting token exchange for userId:', userId);
    await GoogleCalendarService.handleOAuthCallback(code, userId);
    console.log('[OAuth Callback] Token exchange successful');

    // Trigger initial sync from Google Calendar
    try {
      console.log('[OAuth Callback] Starting initial sync');
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3); // Sync 3 months back
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 3); // Sync 3 months forward

      await GoogleCalendarService.syncFromGoogle(userId, startDate, endDate);
      console.log('[OAuth Callback] Initial sync completed');
    } catch (syncError) {
      console.error('[OAuth Callback] Error during initial sync:', syncError);
      // Don't fail the connection if sync fails
    }

    // Redirect to calendar page with success message
    console.log('[OAuth Callback] Redirecting to calendar page with success');
    return NextResponse.redirect(
      new URL('/calendar?success=connected', request.url)
    );
  } catch (error) {
    console.error('[OAuth Callback] Error handling OAuth callback:', error);
    console.error('[OAuth Callback] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.redirect(
      new URL('/calendar?error=connection_failed', request.url)
    );
  }
}
