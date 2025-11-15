import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/user.service';

// Validation schema for interests update
const updateInterestsSchema = z.object({
  interests: z
    .array(z.string().min(1).max(100))
    .min(0)
    .max(50)
    .describe('Array of interest strings'),
});

/**
 * PUT /api/user/interests
 * Update user interests
 */
export async function PUT(request: Request) {
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

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = updateInterestsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { interests } = validation.data;

    // Update interests using service
    const updatedUser = await UserService.updateUserInterests(
      user.id,
      interests
    );

    // Return updated user data
    return NextResponse.json({
      id: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      interests: updatedUser!.interests.map((i) => i.interest),
      budget: updatedUser!.budget
        ? {
            min: Number(updatedUser!.budget.minBudget),
            max: Number(updatedUser!.budget.maxBudget),
            currency: updatedUser!.budget.currency,
          }
        : null,
    });
  } catch (error) {
    console.error('Error updating interests:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update interests',
        },
      },
      { status: 500 }
    );
  }
}
