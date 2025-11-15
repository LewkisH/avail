import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

/**
 * Get the current authenticated user from the database
 * Returns null if user is not authenticated or not found in database
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: true,
        budget: true,
        sleepTime: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Require authentication for API routes
 * Returns the authenticated user or throws an error response
 */
export async function requireAuth() {
  const { userId } = await auth();

  console.log('[requireAuth] Clerk userId:', userId);

  if (!userId) {
    console.log('[requireAuth] No Clerk userId found - user not authenticated');
    return {
      error: true,
      response: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      ),
    };
  }

  try {
    console.log('[requireAuth] Looking up user in database:', userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: true,
        budget: true,
        sleepTime: true,
      },
    });

    if (!user) {
      console.log('[requireAuth] User not found in database:', userId);
      return {
        error: true,
        response: NextResponse.json(
          { error: { code: "USER_NOT_FOUND", message: "User not found" } },
          { status: 404 }
        ),
      };
    }

    console.log('[requireAuth] User authenticated successfully:', user.id);
    return {
      error: false,
      user,
    };
  } catch (error) {
    console.error("[requireAuth] Error fetching user:", error);
    console.error("[requireAuth] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return {
      error: true,
      response: NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
        { status: 500 }
      ),
    };
  }
}

/**
 * Sync Clerk user data to database
 * Creates or updates user record based on Clerk data
 */
export async function syncUserFromClerk() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId
  );

  if (!primaryEmail) {
    throw new Error("No primary email found");
  }

  try {
    const user = await prisma.user.upsert({
      where: { id: clerkUser.id },
      update: {
        email: primaryEmail.emailAddress,
        name:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "User",
      },
      create: {
        id: clerkUser.id,
        email: primaryEmail.emailAddress,
        name:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "User",
      },
    });

    return user;
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
}

/**
 * Check if the current user is a member of a group
 */
export async function isGroupMember(groupId: string, userId: string) {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    return !!membership;
  } catch (error) {
    console.error("Error checking group membership:", error);
    return false;
  }
}

/**
 * Check if the current user is the owner of a group
 */
export async function isGroupOwner(groupId: string, userId: string) {
  try {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        ownerId: userId,
      },
    });

    return !!group;
  } catch (error) {
    console.error("Error checking group ownership:", error);
    return false;
  }
}
