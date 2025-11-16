import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/groups/[id]/time-slots/events
 * Fetch activity suggestions and member availability for a time slot
 * 
 * Query params:
 *   - startTime: ISO datetime string (required)
 *   - endTime: ISO datetime string (required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate user
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  const { id: groupId } = await params;

  // Verify user is a member of the group
  const isMember = await isGroupMember(groupId, authResult.user.id);
  if (!isMember) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "You must be a member of the group to view time slot events",
        },
      },
      { status: 403 }
    );
  }

  // Parse and validate query parameters
  const { searchParams } = new URL(request.url);
  const startTimeParam = searchParams.get("startTime");
  const endTimeParam = searchParams.get("endTime");

  if (!startTimeParam || !endTimeParam) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "startTime and endTime query parameters are required",
        },
      },
      { status: 400 }
    );
  }

  const startTime = new Date(startTimeParam);
  const endTime = new Date(endTimeParam);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid date format for startTime or endTime",
        },
      },
      { status: 400 }
    );
  }

  try {
    // Verify group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Group not found",
          },
        },
        { status: 404 }
      );
    }

    // Query activity suggestions that overlap with the time slot
    const activitySuggestions = await prisma.activitySuggestion.findMany({
      where: {
        groupId,
        OR: [
          // Activity starts during the time slot (inclusive of boundaries)
          {
            AND: [
              { startTime: { gte: startTime } },
              { startTime: { lte: endTime } },
            ],
          },
          // Activity ends during the time slot (inclusive of boundaries)
          {
            AND: [
              { endTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
          // Activity spans the entire time slot
          {
            AND: [
              { startTime: { lt: startTime } },
              { endTime: { gt: endTime } },
            ],
          },
        ],
      },
      include: {
        interests: {
          select: {
            userId: true,
          },
        },
        externalEvent: {
          select: {
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch user data for participants
    const activitySuggestionsWithParticipants = await Promise.all(
      activitySuggestions.map(async (suggestion) => {
        const participantIds = suggestion.interests.map((interest) => interest.userId);
        
        const participants = await prisma.user.findMany({
          where: {
            id: { in: participantIds },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        return {
          ...suggestion,
          participants,
        };
      })
    );

    // Calculate member availability
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Check each member's availability by looking for overlapping calendar events
    const availability = await Promise.all(
      groupMembers.map(async (member) => {
        const busyEvents = await prisma.calendarEvent.findMany({
          where: {
            userId: member.userId,
            OR: [
              // Event starts during the time slot
              {
                AND: [
                  { startTime: { gte: startTime } },
                  { startTime: { lt: endTime } },
                ],
              },
              // Event ends during the time slot
              {
                AND: [
                  { endTime: { gt: startTime } },
                  { endTime: { lte: endTime } },
                ],
              },
              // Event spans the entire time slot
              {
                AND: [
                  { startTime: { lte: startTime } },
                  { endTime: { gte: endTime } },
                ],
              },
            ],
          },
        });

        return {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          isAvailable: busyEvents.length === 0,
        };
      })
    );

    // Format activity suggestions to match GroupEvent interface
    const formattedActivitySuggestions = activitySuggestionsWithParticipants.map(
      (suggestion) => {
        const hasJoined = suggestion.interests.some(
          (interest) => interest.userId === authResult.user.id
        );

        return {
          id: suggestion.id,
          title: suggestion.title,
          location: suggestion.location,
          category: suggestion.category,
          startTime: suggestion.startTime.toISOString(),
          endTime: suggestion.endTime.toISOString(),
          imageUrl: suggestion.externalEvent?.imageUrl || null,
          participants: suggestion.participants.map((participant) => ({
            id: participant.id,
            name: participant.name,
            imageUrl: null, // Will be added when User model has imageUrl field
          })),
          hasJoined,
        };
      }
    );

    // Format availability data
    const formattedAvailability = availability.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      imageUrl: null, // Will be added when User model has imageUrl field
      isAvailable: member.isAvailable,
    }));

    return NextResponse.json({
      activitySuggestions: formattedActivitySuggestions,
      availability: formattedAvailability,
    });
  } catch (error) {
    console.error("Error fetching time slot events:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch time slot events",
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
