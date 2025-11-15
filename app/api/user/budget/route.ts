import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/user.service';

// Validation schema for budget update
const updateBudgetSchema = z.object({
  minBudget: z
    .number()
    .min(0)
    .describe('Minimum budget amount'),
  maxBudget: z
    .number()
    .min(0)
    .describe('Maximum budget amount'),
  currency: z
    .string()
    .length(3)
    .default('EUR')
    .describe('Currency code (ISO 4217)'),
}).refine((data) => data.maxBudget >= data.minBudget, {
  message: 'Maximum budget must be greater than or equal to minimum budget',
  path: ['maxBudget'],
});

/**
 * PUT /api/user/budget
 * Update user budget range
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
    const validation = updateBudgetSchema.safeParse(body);

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

    const { minBudget, maxBudget, currency } = validation.data;

    // Update budget using service
    const updatedUser = await UserService.updateUserBudget(
      user.id,
      minBudget,
      maxBudget,
      currency
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
    console.error('Error updating budget:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update budget',
        },
      },
      { status: 500 }
    );
  }
}
