import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const locationSchema = z.object({
  location: z.enum(['Tartu', 'Tallinn']).nullable(),
});

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = locationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid location',
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { location } = validation.data;

    // Update user location
    const user = await prisma.user.update({
      where: { id: userId },
      data: { location },
      include: {
        interests: true,
        budget: true,
        sleepTime: true,
      },
    });

    // Format response
    const profile = {
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
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update location',
        },
      },
      { status: 500 }
    );
  }
}
