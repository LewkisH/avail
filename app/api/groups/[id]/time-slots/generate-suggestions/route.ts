import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { ActivitySuggestionService } from "@/lib/services/activity-suggestion.service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/groups/[id]/time-slots/generate-suggestions
 * Generate activity suggestions for a time slot
 * 
 * Request body:
 *   - startTime: ISO datetime string (required)
 *   - endTime: ISO datetime string (required)
 */
export async function POST(
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
          message: "You must be a member of the group to generate suggestions",
        },
      },
      { status: 403 }
    );
  }

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON in request body",
        },
      },
      { status: 400 }
    );
  }

  const { startTime: startTimeParam, endTime: endTimeParam } = body;

  if (!startTimeParam || !endTimeParam) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "startTime and endTime are required in request body",
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

  if (startTime >= endTime) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "startTime must be before endTime",
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

    // Generate suggestions
    const result = await ActivitySuggestionService.generateSuggestions({
      groupId,
      startTime,
      endTime,
    });

    // Fetch the newly created suggestions to return to client
    const suggestions = await prisma.activitySuggestion.findMany({
      where: {
        groupId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        externalEvent: {
          select: {
            imageUrl: true,
          },
        },
        interests: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch user data for participants
    const suggestionsWithParticipants = await Promise.all(
      suggestions.map(async (suggestion) => {
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

    // Format suggestions for response
    const formattedSuggestions = suggestionsWithParticipants.map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      location: suggestion.location,
      category: suggestion.category,
      startTime: suggestion.startTime.toISOString(),
      endTime: suggestion.endTime.toISOString(),
      cost: suggestion.cost ? Number(suggestion.cost) : null,
      reasoning: suggestion.reasoning,
      externalEventId: suggestion.externalEventId,
      imageUrl: suggestion.externalEvent?.imageUrl || null,
      participants: suggestion.participants,
      hasJoined: suggestion.interests.some(
        (interest: any) => interest.userId === authResult.user.id
      ),
    }));

    return NextResponse.json({
      success: true,
      result: {
        created: result.created,
        fromExternalEvents: result.fromExternalEvents,
        fromAI: result.fromAI,
        total: result.total,
      },
      suggestions: formattedSuggestions,
    });
  } catch (error) {
    console.error("Error generating activity suggestions:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate activity suggestions",
        },
      },
      { status: 500 }
    );
  }
}
