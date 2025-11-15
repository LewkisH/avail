import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { GroupService } from "@/lib/services/group.service";
import { z } from "zod";

// Schema for creating a group
const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name must be less than 100 characters"),
});

/**
 * POST /api/groups - Create a new group
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const validation = createGroupSchema.safeParse(body);

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

    const { name } = validation.data;
    const group = await GroupService.createGroup(authResult.user.id, name);

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create group",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/groups - List all groups the user belongs to
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  try {
    const groups = await GroupService.getUserGroups(authResult.user.id);
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch groups",
        },
      },
      { status: 500 }
    );
  }
}
