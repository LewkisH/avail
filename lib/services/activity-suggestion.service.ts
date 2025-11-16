import { prisma } from '@/lib/prisma';
import { GeminiService } from './gemini.service';
import { Prisma, ActivitySuggestion } from '@prisma/client';

interface GenerateSuggestionsParams {
  groupId: string;
  startTime: Date;
  endTime: Date;
}

interface GenerateSuggestionsResult {
  created: number;
  fromExternalEvents: number;
  fromAI: number;
  total: number;
}

interface ActivityContext {
  startTime: Date;
  endTime: Date;
  locations: string[];
  interests: string[];
  memberCount: number;
  season: string;
  timeOfDay: string;
}

type UserWithInterests = Prisma.UserGetPayload<{
  include: { interests: true };
}>;

export class ActivitySuggestionService {
  /**
   * Find external events that overlap with the given time slot
   * Filters by group members' locations
   * @param startTime Start time of the time slot
   * @param endTime End time of the time slot
   * @param locations Array of location strings to filter by
   * @returns Array of overlapping external events
   */
  private static async findOverlappingExternalEvents(
    startTime: Date,
    endTime: Date,
    locations: string[]
  ) {
    try {
      // If no locations provided, return empty array
      if (!locations || locations.length === 0) {
        return [];
      }

      // Query external events with time overlap
      // Event overlaps if: event starts before slot ends AND event ends after slot starts
      const events = await prisma.externalEvent.findMany({
        where: {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          location: {
            in: locations,
          },
        },
        orderBy: {
          startTime: 'asc',
        },
        take: 6, // Maximum we'd ever need
      });

      return events;
    } catch (error) {
      console.error('Failed to find overlapping external events:', error);
      return [];
    }
  }

  /**
   * Create activity suggestions from external events
   * Checks for existing suggestions to avoid duplicates
   * @param groupId ID of the group
   * @param externalEvents Array of external events to create suggestions from
   * @returns Array of created activity suggestions
   */
  private static async createSuggestionsFromExternalEvents(
    groupId: string,
    externalEvents: Awaited<ReturnType<typeof this.findOverlappingExternalEvents>>
  ) {
    const suggestions = [];

    for (const event of externalEvents) {
      try {
        // Check if suggestion already exists for this event and group
        const existing = await prisma.activitySuggestion.findFirst({
          where: {
            groupId,
            externalEventId: event.id,
          },
        });

        if (!existing) {
          // Create new suggestion linked to external event
          const suggestion = await prisma.activitySuggestion.create({
            data: {
              groupId,
              externalEventId: event.id,
              title: event.title,
              description: event.description,
              category: event.category,
              startTime: event.startTime,
              endTime: event.endTime,
              cost: event.cost,
              reasoning: 'Real event happening in your area during this time slot',
            },
          });
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.error(`Failed to create suggestion from external event ${event.id}:`, error);
        // Continue with other events even if one fails
      }
    }

    return suggestions;
  }

  /**
   * Generate AI-powered activity suggestions using Gemini
   * @param groupId ID of the group
   * @param count Number of activities to generate
   * @param context Context information for generating relevant activities
   * @returns Array of created activity suggestions
   */
  private static async generateAIActivities(
    groupId: string,
    count: number,
    context: ActivityContext
  ) {
    if (count <= 0) {
      return [];
    }

    try {
      // Call Gemini service to generate activities
      const generatedActivities = await GeminiService.generateActivities(count, context);

      // Create activity suggestions from generated activities
      const suggestions = [];

      for (const activity of generatedActivities) {
        try {
          const suggestion = await prisma.activitySuggestion.create({
            data: {
              groupId,
              title: activity.title,
              description: activity.description,
              category: activity.category,
              startTime: context.startTime,
              endTime: context.endTime,
              cost: activity.estimatedCost,
              reasoning: activity.reasoning,
            },
          });
          suggestions.push(suggestion);
        } catch (error) {
          console.error('Failed to create AI activity suggestion:', error);
          // Continue with other activities even if one fails
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate AI activities:', error);
      return [];
    }
  }

  /**
   * Get the current count of activity suggestions for a time slot
   * @param groupId ID of the group
   * @param startTime Start time of the time slot
   * @param endTime End time of the time slot
   * @returns Count of existing suggestions
   */
  static async getSuggestionCount(
    groupId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      const count = await prisma.activitySuggestion.count({
        where: {
          groupId,
          // Check for suggestions that overlap with this time slot
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
      });
      return count;
    } catch (error) {
      console.error('Failed to get suggestion count:', error);
      return 0;
    }
  }

  /**
   * Calculate context information for AI activity generation
   * @param startTime Start time of the time slot
   * @param endTime End time of the time slot
   * @param groupMembers Array of group members with their data
   * @returns Activity context object
   */
  private static calculateContext(
    startTime: Date,
    endTime: Date,
    groupMembers: UserWithInterests[]
  ): ActivityContext {
    // Extract unique locations (location is an enum but treated as string)
    const locations = [...new Set(groupMembers.map((m) => m.location).filter(Boolean) as string[])];

    // Extract all interests
    const interests = groupMembers.flatMap((m) => m.interests.map((i) => i.interest));

    // Calculate time of day
    const hour = startTime.getHours();
    const timeOfDay =
      hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    // Calculate season
    const month = startTime.getMonth();
    const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'autumn';

    return {
      startTime,
      endTime,
      locations,
      interests,
      memberCount: groupMembers.length,
      season,
      timeOfDay,
    };
  }

  /**
   * Main orchestration method to generate activity suggestions
   * Combines external events and AI-generated activities to reach 6 suggestions
   * @param params Parameters including groupId, startTime, and endTime
   * @returns Summary of created suggestions
   */
  static async generateSuggestions(
    params: GenerateSuggestionsParams
  ): Promise<GenerateSuggestionsResult> {
    const { groupId, startTime, endTime } = params;

    try {
      // Get current suggestion count
      const currentCount = await this.getSuggestionCount(groupId, startTime, endTime);

      // Calculate how many suggestions we need to create
      const targetCount = 6;
      const neededCount = Math.max(0, targetCount - currentCount);

      if (neededCount === 0) {
        return {
          created: 0,
          fromExternalEvents: 0,
          fromAI: 0,
          total: currentCount,
        };
      }

      // Get group members with their locations and interests
      const groupMembers = await prisma.user.findMany({
        where: {
          groupMemberships: {
            some: {
              groupId,
            },
          },
        },
        include: {
          interests: true,
        },
      });

      // Extract locations for external event filtering (location is an enum but treated as string)
      const locations = [...new Set(groupMembers.map((m) => m.location).filter(Boolean) as string[])];

      // Find overlapping external events
      const externalEvents = await this.findOverlappingExternalEvents(
        startTime,
        endTime,
        locations
      );

      // Create suggestions from external events (up to needed count)
      const externalEventSuggestions = await this.createSuggestionsFromExternalEvents(
        groupId,
        externalEvents.slice(0, neededCount)
      );

      // Calculate remaining needed suggestions
      const remainingNeeded = neededCount - externalEventSuggestions.length;

      // Generate AI activities for remaining slots
      let aiSuggestions: ActivitySuggestion[] = [];
      if (remainingNeeded > 0) {
        const context = this.calculateContext(startTime, endTime, groupMembers);
        aiSuggestions = await this.generateAIActivities(groupId, remainingNeeded, context);
      }

      // Return summary
      const totalCreated = externalEventSuggestions.length + aiSuggestions.length;
      return {
        created: totalCreated,
        fromExternalEvents: externalEventSuggestions.length,
        fromAI: aiSuggestions.length,
        total: currentCount + totalCreated,
      };
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      throw error;
    }
  }
}
