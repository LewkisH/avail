import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/invitations - Get pending invitations for the current user
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  try {
    const invitations = await prisma.groupInvitation.findMany({
      where: {
        invitedEmail: authResult.user.email,
        status: "pending",
        expiresAt: {
          gte: new Date(), // Only return non-expired invitations
        },
      },
      include: {
        group: {
          include: {
            owner: true,
            members: true,
          },
        },
        inviter: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch invitations",
        },
      },
      { status: 500 }
    );
  }
}
