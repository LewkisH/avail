import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { GroupService } from "@/lib/services/group.service";

/**
 * DELETE /api/groups/[id]/leave - Leave a group
 */
export async function DELETE(
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
          message: "You are not a member of this group",
        },
      },
      { status: 403 }
    );
  }

  try {
    await GroupService.leaveGroup(groupId, authResult.user.id);

    return NextResponse.json(
      { message: "Successfully left the group" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error leaving group:", error);
    
    // Handle specific error messages from the service
    if (error.message?.includes("owner cannot leave")) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to leave group",
        },
      },
      { status: 500 }
    );
  }
}
