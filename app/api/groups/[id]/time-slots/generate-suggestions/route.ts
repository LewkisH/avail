import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isGroupMember } from "@/lib/auth";
import { ActivitySuggestionService } from "@/lib/services/activity-suggestion.service";
import { prisma } from "@/lib/prisma";
import { userRateLimiter, groupRateLimiter } from "@/lib/utils/rate-limit";
import {
  validateISODate,
  validateDateRange,
  validateUUID,
  validateRequestBody,
} from "@/lib/utils/input-validation";
import { isGeminiConfigured } from "@/lib/utils/env-validation";

/**
 * POST /api/groups/[id]/time-slots/generate-suggestions
 * Generate activity suggestions for a time slot
 * 
 * Security features:
 *   - Rate limiting per user (10 requests/hour)
 *   - Rate limiting per group (20 requests/hour)
 *   - Input validation and sanitization
 *   - Environment variable validation
 * 
 * Request body:
 *   - startTime: ISO datetime string (required)
 *   - endTime: ISO datetime string (required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate user
  const authResult = await requireAuth();
  if (authResult.error || !authResult.user) {
    return authResult.response;
  }

  const userId = authResult.user.id;
  const { id: groupId } = await params;

  // Validate group ID format
  try {
    validateUUID(groupId);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid group ID format",
        },
      },
      { status: 400 }
    );
  }

  // Check Gemini API configuration
  if (!isGeminiConfigured()) {
    console.error('Gemini API is not properly configured');
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "AI suggestion service is not available. Please contact support.",
        },
      },
      { status: 503 }
    );
  }

  // Apply per-user rate limiting
  const userRateLimit = userRateLimiter.check(userId);
  if (!userRateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "You have exceeded the rate limit for generating suggestions. Please try again later.",
          retryAfter: userRateLimit.retryAfter,
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(userRateLimit.resetAt).toISOString(),
          'Retry-After': String(userRateLimit.retryAfter),
        },
      }
    );
  }

  // Apply per-group rate limiting
  const groupRateLimit = groupRateLimiter.check(groupId);
  if (!groupRateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "This group has exceeded the rate limit for generating suggestions. Please try again later.",
          retryAfter: groupRateLimit.retryAfter,
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(groupRateLimit.resetAt).toISOString(),
          'Retry-After': String(groupRateLimit.retryAfter),
        },
      }
    );
  }

  // Verify user is a member of the group
  const isMember = await isGroupMember(groupId, userId);
  if (!isMember) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "You must be a member of the group to generate suggestions",
        },
      },
      { status: 403 }
    );
  }

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON in request body",
        },
      },
      { status: 400 }
    );
  }

  // Validate required fields
  try {
    validateRequestBody<{ startTime: string; endTime: string }>(
      body,
      ['startTime', 'endTime']
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: error.message,
        },
      },
      { status: 400 }
    );
  }

  const { startTime: startTimeParam, endTime: endTimeParam } = body;

  // Validate and parse dates
  let startTime: Date;
  let endTime: Date;

  try {
    startTime = validateISODate(startTimeParam);
    endTime = validateISODate(endTimeParam);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: `Invalid date format: ${error.message}`,
        },
      },
      { status: 400 }
    );
  }

  // Validate date range
  try {
    validateDateRange(startTime, endTime);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: error.message,
        },
      },
      { status: 400 }
    );
  }

  try {
    // Verify group exists
    let group;
    try {
      group = await prisma.group.findUnique({
        where: { id: groupId },
      });
    } catch (error) {
      console.error("Database error checking group existence:", error);
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to verify group",
          },
        },
        { status: 500 }
      );
    }

    if (!group) {
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

    // Generate suggestions
    let result;
    try {
      result = await ActivitySuggestionService.generateSuggestions({
        groupId,
        startTime,
        endTime,
      });
    } catch (error: any) {
      console.error("Error in ActivitySuggestionService.generateSuggestions:", error);

      // Provide specific error messages based on error type
      const errorMessage = error.message?.includes('Invalid')
        ? error.message
        : 'Failed to generate activity suggestions';

      return NextResponse.json(
        {
          error: {
            code: "GENERATION_ERROR",
            message: errorMessage,
          },
        },
        { status: 500 }
      );
    }

    // Fetch the newly created suggestions to return to client
    let suggestions;
    try {
      suggestions = await prisma.activitySuggestion.findMany({
        where: {
          groupId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        include: {
          externalEvent: {
            select: {
              imageUrl: true,
            },
          },
          interests: {
            select: {
              userId: true,
            },
          },
        },
      });

      // Sort suggestions with external events first
      suggestions = suggestions.sort((a, b) => {
        const aIsExternal = !!a.externalEventId;
        const bIsExternal = !!b.externalEventId;

        if (aIsExternal && !bIsExternal) return -1;
        if (!aIsExternal && bIsExternal) return 1;

        // Within same type, sort by creation time (most recent first)
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      // Return partial success - suggestions were created but we can't fetch them
      return NextResponse.json({
        success: true,
        result: {
          created: result.created,
          fromExternalEvents: result.fromExternalEvents,
          fromAI: result.fromAI,
          total: result.total,
        },
        suggestions: [],
        warning: "Suggestions were created but could not be retrieved",
      });
    }

    // Fetch user data for participants
    let suggestionsWithParticipants;
    try {
      suggestionsWithParticipants = await Promise.all(
        suggestions.map(async (suggestion) => {
          try {
            const participantIds = suggestion.interests.map((interest) => interest.userId);

            const participants = await prisma.user.findMany({
              where: {
                id: { in: participantIds },
              },
              select: {
                id: true,
                name: true,
                email: true,
              },
            });

            return {
              ...suggestion,
              participants,
            };
          } catch (error) {
            console.error(`Error fetching participants for suggestion ${suggestion.id}:`, error);
            // Return suggestion without participants on error
            return {
              ...suggestion,
              participants: [],
            };
          }
        })
      );
    } catch (error) {
      console.error("Error processing suggestions with participants:", error);
      // Fallback to suggestions without participant data
      suggestionsWithParticipants = suggestions.map(s => ({ ...s, participants: [] }));
    }

    // Format suggestions for response
    let formattedSuggestions: any[];
    try {
      formattedSuggestions = suggestionsWithParticipants.map((suggestion) => ({
        id: suggestion.id,
        title: suggestion.title,
        description: suggestion.description,
        location: suggestion.location,
        category: suggestion.category,
        startTime: suggestion.startTime.toISOString(),
        endTime: suggestion.endTime.toISOString(),
        cost: suggestion.cost ? Number(suggestion.cost) : null,
        reasoning: suggestion.reasoning,
        externalEventId: suggestion.externalEventId,
        isExternalEvent: !!suggestion.externalEventId,
        imageUrl: suggestion.externalEvent?.imageUrl || null,
        participants: suggestion.participants,
        hasJoined: suggestion.interests.some(
          (interest: any) => interest.userId === authResult.user.id
        ),
      }));
    } catch (error) {
      console.error("Error formatting suggestions:", error);
      formattedSuggestions = [];
    }

    return NextResponse.json(
      {
        success: true,
        result: {
          created: result.created,
          fromExternalEvents: result.fromExternalEvents,
          fromAI: result.fromAI,
          total: result.total,
        },
        suggestions: formattedSuggestions,
      },
      {
        headers: {
          'X-RateLimit-Limit-User': '10',
          'X-RateLimit-Remaining-User': String(userRateLimit.remaining),
          'X-RateLimit-Reset-User': new Date(userRateLimit.resetAt).toISOString(),
          'X-RateLimit-Limit-Group': '20',
          'X-RateLimit-Remaining-Group': String(groupRateLimit.remaining),
          'X-RateLimit-Reset-Group': new Date(groupRateLimit.resetAt).toISOString(),
        },
      }
    );
  } catch (error: any) {
    console.error("Unexpected error generating activity suggestions:", error);

    // Provide detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while generating suggestions",
          ...(isDevelopment && { details: error.message }),
        },
      },
      { status: 500 }
    );
  }
}
