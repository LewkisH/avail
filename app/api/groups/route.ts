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
  console.log('[POST /api/groups] Starting group creation request');
  
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    console.log('[POST /api/groups] Auth failed:', authResult.error);
    return authResult.response;
  }

  console.log('[POST /api/groups] Authenticated user:', authResult.user.id);

  try {
    // Check if user has reached their group limit (1 group for free tier)
    console.log('[POST /api/groups] Checking group limit for user:', authResult.user.id);
    const ownedGroups = await GroupService.getUserOwnedGroups(authResult.user.id);
    console.log('[POST /api/groups] User owns', ownedGroups.length, 'groups');
    
    if (ownedGroups.length >= 1) {
      console.log('[POST /api/groups] Group limit reached for user:', authResult.user.id);
      return NextResponse.json(
        {
          error: {
            code: "GROUP_LIMIT_REACHED",
            message: "You have reached the maximum number of groups allowed. Please upgrade to create more groups.",
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('[POST /api/groups] Request body:', body);
    
    const validation = createGroupSchema.safeParse(body);

    if (!validation.success) {
      console.log('[POST /api/groups] Validation failed:', validation.error.issues);
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
    console.log('[POST /api/groups] Creating group with name:', name);
    const group = await GroupService.createGroup(authResult.user.id, name);
    
    if (!group) {
      console.error('[POST /api/groups] Group creation returned null');
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
    
    console.log('[POST /api/groups] Group created successfully:', group.id);

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("[POST /api/groups] Error creating group:", error);
    console.error("[POST /api/groups] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
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
  console.log('[GET /api/groups] Starting groups fetch request');
  
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    console.log('[GET /api/groups] Auth failed:', authResult.error);
    return authResult.response;
  }

  console.log('[GET /api/groups] Authenticated user:', authResult.user.id);

  try {
    console.log('[GET /api/groups] Fetching groups for user:', authResult.user.id);
    const groups = await GroupService.getUserGroups(authResult.user.id);
    console.log('[GET /api/groups] Successfully fetched', groups.length, 'groups');
    return NextResponse.json(groups);
  } catch (error) {
    console.error("[GET /api/groups] Error fetching groups:", error);
    console.error("[GET /api/groups] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("[GET /api/groups] Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
    });
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
