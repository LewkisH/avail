import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { GroupService } from "@/lib/services/group.service";

/**
 * GET /api/groups/[id]/members - Get all members of a group
 */
export async function GET(
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
          message: "You must be a member of the group to view members",
        },
      },
      { status: 403 }
    );
  }

  try {
    const members = await GroupService.getGroupMembers(groupId);
    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch group members",
        },
      },
      { status: 500 }
    );
  }
}
