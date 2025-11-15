import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { GroupAvailabilityService } from "@/lib/services/group-availability.service";

/**
 * GET /api/groups/[id]/availability - Get group availability for a specific date
 * Query params:
 *   - date: ISO date string (required)
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
          message: "You must be a member of the group to view availability",
        },
      },
      { status: 403 }
    );
  }

  // Parse and validate date query parameter
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Date query parameter is required",
        },
      },
      { status: 400 }
    );
  }

  // Validate and parse date format
  // Parse as local date (YYYY-MM-DD should be interpreted as local midnight, not UTC)
  const dateParts = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateParts) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid date format. Use ISO date string (YYYY-MM-DD)",
        },
      },
      { status: 400 }
    );
  }
  
  const date = new Date(
    parseInt(dateParts[1]), // year
    parseInt(dateParts[2]) - 1, // month (0-indexed)
    parseInt(dateParts[3]) // day
  );
  
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid date format. Use ISO date string (YYYY-MM-DD)",
        },
      },
      { status: 400 }
    );
  }

  try {
    // Fetch availability windows for the group and date
    const availabilityWindows = await GroupAvailabilityService.getGroupAvailability({
      groupId,
      date,
      userId: authResult.user.id,
    });

    // Fetch group name
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    await prisma.$disconnect();

    // Format response
    const response = {
      groupId,
      groupName: group?.name || 'Unknown Group',
      date: dateParam,
      windows: availabilityWindows.map((window: any) => ({
        id: window.id,
        startTime: window.startTime.toISOString(),
        endTime: window.endTime.toISOString(),
        participants: window.participants.map((p: any) => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
        })),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching group availability:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch group availability",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[id]/availability - Manually trigger recalculation for a specific date
 * Body:
 *   - date: ISO date string (required)
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
          message: "You must be a member of the group to recalculate availability",
        },
      },
      { status: 403 }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const { date: dateParam } = body;

    if (!dateParam) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Date is required in request body",
          },
        },
        { status: 400 }
      );
    }

    // Validate and parse date format
    // Parse as local date (YYYY-MM-DD should be interpreted as local midnight, not UTC)
    const dateParts = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateParts) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid date format. Use ISO date string (YYYY-MM-DD)",
          },
        },
        { status: 400 }
      );
    }
    
    const date = new Date(
      parseInt(dateParts[1]), // year
      parseInt(dateParts[2]) - 1, // month (0-indexed)
      parseInt(dateParts[3]) // day
    );
    
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid date format. Use ISO date string (YYYY-MM-DD)",
          },
        },
        { status: 400 }
      );
    }

    // Trigger recalculation
    await GroupAvailabilityService.calculateGroupAvailability({
      groupId,
      date,
    });

    return NextResponse.json({
      success: true,
      message: "Group availability recalculated successfully",
      groupId,
      date: dateParam,
    });
  } catch (error) {
    console.error("Error recalculating group availability:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to recalculate group availability",
        },
      },
      { status: 500 }
    );
  }
}
