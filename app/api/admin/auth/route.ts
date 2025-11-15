import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: { code: 'ADMIN_DISABLED', message: 'Admin access is not configured' } },
      { status: 403 }
    );
  }

  try {
    const { password } = await request.json();

    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: { code: 'INVALID_PASSWORD', message: 'Invalid password' } },
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } },
      { status: 500 }
    );
  }
}
