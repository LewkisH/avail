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
  const timezoneOffsetParam = searchParams.get("timezoneOffset");

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
  
  // Parse timezone offset (in minutes, negative for ahead of UTC)
  const timezoneOffset = timezoneOffsetParam ? parseInt(timezoneOffsetParam) : 0;

  console.log('=== GET Availability Date Parsing ===');
  console.log('Date param:', dateParam);
  console.log('Timezone offset param:', timezoneOffsetParam);
  console.log('Parsed timezone offset:', timezoneOffset);

  // Create date in UTC, then adjust for user's timezone
  // If user is in UTC+2, offset is -120 minutes
  const date = new Date(Date.UTC(
    parseInt(dateParts[1]), // year
    parseInt(dateParts[2]) - 1, // month (0-indexed)
    parseInt(dateParts[3]), // day
    0, 0, 0, 0
  ));

  console.log('Date before offset adjustment (UTC):', date.toISOString());

  // Adjust for timezone offset to get the actual local midnight
  date.setMinutes(date.getMinutes() - timezoneOffset);

  console.log('Date after offset adjustment:', date.toISOString());
  console.log('Date local string:', date.toString());
  
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
    // Fetch group and verify it exists
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        name: true,
        _count: {
          select: { members: true }
        }
      },
    });

    if (!group) {
      await prisma.$disconnect();
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

    // Check if group has enough members (at least 2)
    if (group._count.members < 2) {
      await prisma.$disconnect();
      return NextResponse.json({
        groupId,
        groupName: group.name,
        date: dateParam,
        windows: [],
        message: "Group needs at least 2 members to calculate availability",
      });
    }

    await prisma.$disconnect();

    // Fetch availability windows for the group and date
    const availabilityWindows = await GroupAvailabilityService.getGroupAvailability({
      groupId,
      date,
      userId: authResult.user.id,
    });

    // Format response
    const response = {
      groupId,
      groupName: group.name,
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
    const { date: dateParam, timezoneOffset: timezoneOffsetParam } = body;

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
    
    // Parse timezone offset (in minutes, negative for ahead of UTC)
    const timezoneOffset = timezoneOffsetParam !== undefined ? parseInt(timezoneOffsetParam) : 0;

    console.log('=== POST Calculate Availability Date Parsing ===');
    console.log('Date param:', dateParam);
    console.log('Timezone offset param:', timezoneOffsetParam);
    console.log('Parsed timezone offset:', timezoneOffset);

    // Create date in UTC, then adjust for user's timezone
    const date = new Date(Date.UTC(
      parseInt(dateParts[1]), // year
      parseInt(dateParts[2]) - 1, // month (0-indexed)
      parseInt(dateParts[3]), // day
      0, 0, 0, 0
    ));

    console.log('Date before offset adjustment (UTC):', date.toISOString());

    // Adjust for timezone offset to get the actual local midnight
    date.setMinutes(date.getMinutes() - timezoneOffset);

    console.log('Date after offset adjustment:', date.toISOString());
    console.log('Date local string:', date.toString());
    
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

    console.log('Calling calculateGroupAvailability with date:', date.toISOString());

    // Verify group exists and has enough members
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        name: true,
        _count: {
          select: { members: true }
        }
      },
    });

    if (!group) {
      await prisma.$disconnect();
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

    if (group._count.members < 2) {
      await prisma.$disconnect();
      return NextResponse.json({
        success: false,
        message: "Group needs at least 2 members to calculate availability",
        groupId,
        date: dateParam,
      });
    }

    await prisma.$disconnect();

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
