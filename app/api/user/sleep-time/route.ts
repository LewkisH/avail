import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/user.service';
import { prisma } from '@/lib/prisma';

// Validation schema for sleep time update
const updateSleepTimeSchema = z.object({
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format (e.g., "22:00")')
    .describe('Sleep start time in HH:MM format'),
  endTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format (e.g., "08:00")')
    .describe('Sleep end time in HH:MM format'),
});

/**
 * GET /api/user/sleep-time
 * Get user sleep time preferences
 */
export async function GET(request: Request) {
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
    const userData = await UserService.getUserById(user.id);

    if (!userData) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sleepTime: userData.sleepTime
        ? {
            startTime: userData.sleepTime.startTime,
            endTime: userData.sleepTime.endTime,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching sleep time:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch sleep time',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/sleep-time
 * Update user sleep time preferences
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
    const validation = updateSleepTimeSchema.safeParse(body);

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

    const { startTime, endTime } = validation.data;

    // Update sleep time using service
    const updatedUser = await UserService.updateUserSleepTime(
      user.id,
      startTime,
      endTime
    );

    // Delete all group availability records for groups the user belongs to
    // This ensures availability is recalculated with the new sleep time
    try {
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      });

      const groupIds = userGroups.map(g => g.groupId);

      if (groupIds.length > 0) {
        await prisma.groupAvailability.deleteMany({
          where: {
            groupId: { in: groupIds },
          },
        });
        console.log(`Deleted availability records for ${groupIds.length} groups after sleep time update for user ${user.id}`);
      }
    } catch (availabilityError) {
      // Log but don't fail the request if availability deletion fails
      console.error('Error deleting group availability after sleep time update:', availabilityError);
    }

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
      sleepTime: updatedUser!.sleepTime
        ? {
            startTime: updatedUser!.sleepTime.startTime,
            endTime: updatedUser!.sleepTime.endTime,
          }
        : null,
    });
  } catch (error) {
    console.error('Error updating sleep time:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update sleep time',
        },
      },
      { status: 500 }
    );
  }
}
