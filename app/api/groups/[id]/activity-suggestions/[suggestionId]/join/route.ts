import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/groups/[id]/activity-suggestions/[suggestionId]/join
 * Create a GroupEventInterest record to join an activity suggestion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  // Authenticate user
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  const { id: groupId, suggestionId } = await params;

  // Verify user is a member of the group
  const isMember = await isGroupMember(groupId, authResult.user.id);
  if (!isMember) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "You must be a member of the group to join events",
        },
      },
      { status: 403 }
    );
  }

  try {
    // Verify activity suggestion exists and belongs to the group
    const activitySuggestion = await prisma.activitySuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!activitySuggestion) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Activity suggestion not found",
          },
        },
        { status: 404 }
      );
    }

    if (activitySuggestion.groupId !== groupId) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Activity suggestion not found in this group",
          },
        },
        { status: 404 }
      );
    }

    // Create GroupEventInterest record
    try {
      await prisma.groupEventInterest.create({
        data: {
          activitySuggestionId: suggestionId,
          userId: authResult.user.id,
        },
      });
    } catch (error: any) {
      // Handle duplicate join attempts (unique constraint violation)
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "You have already joined this event",
            },
          },
          { status: 409 }
        );
      }
      throw error;
    }

    // Query updated participant list
    const interests = await prisma.groupEventInterest.findMany({
      where: {
        activitySuggestionId: suggestionId,
      },
    });

    const participantIds = interests.map((interest: { userId: string }) => interest.userId);

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

    // Format participants response
    const formattedParticipants = participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      imageUrl: null, // Will be added when User model has imageUrl field
    }));

    return NextResponse.json(
      {
        success: true,
        participants: formattedParticipants,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error joining event:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to join event",
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
