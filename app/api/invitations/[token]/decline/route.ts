import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { GroupService } from "@/lib/services/group.service";

/**
 * POST /api/invitations/[token]/decline - Decline a group invitation
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
    const invitation = await GroupService.declineInvitation(
      token,
      authResult.user.id
    );

    return NextResponse.json(invitation, { status: 200 });
  } catch (error: any) {
    console.error("Error declining invitation:", error);

    // Handle specific error messages from the service
    const errorMessage = error.message || "Failed to decline invitation";
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";

    if (errorMessage.includes("not found")) {
      statusCode = 404;
      errorCode = "NOT_FOUND";
    } else if (
      errorMessage.includes("already been processed") ||
      errorMessage.includes("does not match")
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
