import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const externalEventSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string(),
  location: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  currency: z.string().default("EUR"),
  category: z.string(),
  sourceApi: z.string(),
  sourceId: z.string(),
  sourceUrl: z.string(),
  imageUrl: z.string().optional().nullable(),
});

const requestSchema = z.object({
  password: z.string(),
  events: z.array(externalEventSchema),
});

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: { code: 'ADMIN_DISABLED', message: 'Admin access is not configured' } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { password, events } = validation.data;

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: { code: 'INVALID_PASSWORD', message: 'Invalid password' } },
        { status: 401 }
      );
    }

    // Create events
    const createdEvents = await Promise.all(
      events.map((event) =>
        prisma.externalEvent.upsert({
          where: {
            sourceApi_sourceId: {
              sourceApi: event.sourceApi,
              sourceId: event.sourceId,
            },
          },
          create: {
            title: event.title,
            description: event.description,
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            timezone: event.timezone,
            location: event.location,
            cost: event.cost,
            currency: event.currency,
            category: event.category,
            sourceApi: event.sourceApi,
            sourceId: event.sourceId,
            sourceUrl: event.sourceUrl,
            imageUrl: event.imageUrl,
          },
          update: {
            title: event.title,
            description: event.description,
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            timezone: event.timezone,
            location: event.location,
            cost: event.cost,
            currency: event.currency,
            category: event.category,
            sourceUrl: event.sourceUrl,
            imageUrl: event.imageUrl,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: createdEvents.length,
      events: createdEvents,
    });
  } catch (error) {
    console.error('Error creating external events:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create events',
        },
      },
      { status: 500 }
    );
  }
}
