import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { GroupService } from "@/lib/services/group.service";

/**
 * POST /api/invitations/[token]/accept - Accept a group invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  const { token } = await params;

  try {
    const membership = await GroupService.acceptInvitation(
      token,
      authResult.user.id
    );

    return NextResponse.json(membership, { status: 200 });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);

    // Handle specific error messages from the service
    const errorMessage = error.message || "Failed to accept invitation";
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";

    if (errorMessage.includes("not found")) {
      statusCode = 404;
      errorCode = "NOT_FOUND";
    } else if (
      errorMessage.includes("already been processed") ||
      errorMessage.includes("expired") ||
      errorMessage.includes("does not match") ||
      errorMessage.includes("already a member")
    ) {
      statusCode = 400;
      errorCode = "INVALID_INVITATION";
    }

    return NextResponse.json(
      {
        error: {
          code: errorCode,
          message: errorMessage,
        },
      },
      { status: statusCode }
    );
  }
}
