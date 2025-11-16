import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/user/profile
 * Fetch current user profile data including interests and budget
 */
export async function GET() {
  const authResult = await requireAuth();

  if (authResult.error) {
    return authResult.response;
  }

  const { user } = authResult;

  if (!user) {
    return NextResponse.json(
      { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    );
  }

  // Transform the response to a clean format
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    location: user.location,
    interests: user.interests.map((i) => i.interest),
    budget: user.budget
      ? {
          min: Number(user.budget.minBudget),
          max: Number(user.budget.maxBudget),
          currency: user.budget.currency,
        }
      : null,
    sleepTime: user.sleepTime
      ? {
          startTime: user.sleepTime.startTime,
          endTime: user.sleepTime.endTime,
        }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}
