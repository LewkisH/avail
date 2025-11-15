import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { GroupService } from "@/lib/services/group.service";
import { z } from "zod";

// Schema for inviting a user
const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/groups/[id]/invite - Send an invitation to join a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  const { id: groupId } = await params;

  // Check if user is a member of the group
  const isMember = await isGroupMember(groupId, authResult.user.id);
  if (!isMember) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "You must be a member of the group to invite others",
        },
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const invitation = await GroupService.inviteToGroup(
      groupId,
      email,
      authResult.user.id
    );

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create invitation",
        },
      },
      { status: 500 }
    );
  }
}
