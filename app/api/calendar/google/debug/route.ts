import { NextResponse } from 'next/server';

/**
 * GET /api/calendar/google/debug
 * Debug endpoint to verify environment variables and configuration
 */
export async function GET() {
  const config = {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  };

  return NextResponse.json({
    message: 'Google Calendar OAuth Debug Info',
    config,
    timestamp: new Date().toISOString(),
  });
}
