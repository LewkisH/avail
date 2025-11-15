import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/calendar/google/test
 * Simple test endpoint to verify routing works
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  return NextResponse.json({
    message: 'Google Calendar test endpoint works!',
    timestamp: new Date().toISOString(),
    url: request.url,
    queryParams: Object.fromEntries(searchParams.entries()),
    headers: {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
    },
  });
}
