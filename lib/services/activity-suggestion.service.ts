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
  interests: string[]; // Keep for backward compatibility
  memberCount: number;
  season: string;
  timeOfDay: string;
  // New fields for personalization
  userInterests: Array<{
    userName: string;
    interests: string[];
  }>;
  hasAnyInterests: boolean;
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
      // Validate input parameters
      if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error('ActivitySuggestionService: Invalid date parameters for external event query');
        return [];
      }

      if (startTime >= endTime) {
        console.error('ActivitySuggestionService: startTime must be before endTime');
        return [];
      }

      // If no locations provided, return empty array
      if (!locations || locations.length === 0) {
        console.info('ActivitySuggestionService: No locations provided for external event filtering');
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

      console.info(`ActivitySuggestionService: Found ${events.length} overlapping external events`);
      return events;
    } catch (error: any) {
      // Provide detailed error logging
      if (error.code === 'P2002') {
        console.error('ActivitySuggestionService: Database constraint violation in external event query');
      } else if (error.code === 'P2025') {
        console.error('ActivitySuggestionService: Record not found in external event query');
      } else {
        console.error('ActivitySuggestionService: Failed to find overlapping external events:', error);
      }
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
    // Validate input
    if (!groupId || typeof groupId !== 'string') {
      console.error('ActivitySuggestionService: Invalid groupId provided');
      return [];
    }

    if (!externalEvents || !Array.isArray(externalEvents)) {
      console.error('ActivitySuggestionService: Invalid externalEvents array');
      return [];
    }

    const suggestions = [];
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const event of externalEvents) {
      try {
        // Validate event data before processing
        if (!event.id || !event.title || !event.startTime || !event.endTime) {
          console.warn(`ActivitySuggestionService: Skipping invalid external event:`, {
            id: event.id,
            hasTitle: !!event.title,
            hasStartTime: !!event.startTime,
            hasEndTime: !!event.endTime,
          });
          errorCount++;
          continue;
        }

        // Check if suggestion already exists for this event and group
        const existing = await prisma.activitySuggestion.findFirst({
          where: {
            groupId,
            externalEventId: event.id,
          },
        });

        if (existing) {
          duplicateCount++;
          console.info(`ActivitySuggestionService: Suggestion already exists for external event ${event.id}`);
          continue;
        }

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
        successCount++;
      } catch (error: any) {
        errorCount++;
        // Provide detailed error logging
        if (error.code === 'P2002') {
          console.error(`ActivitySuggestionService: Duplicate constraint violation for event ${event.id}`);
        } else if (error.code === 'P2003') {
          console.error(`ActivitySuggestionService: Foreign key constraint failed for event ${event.id}`);
        } else {
          console.error(`ActivitySuggestionService: Failed to create suggestion from external event ${event.id}:`, error);
        }
        // Continue with other events even if one fails
      }
    }

    console.info(
      `ActivitySuggestionService: External event processing complete - ` +
      `Success: ${successCount}, Duplicates: ${duplicateCount}, Errors: ${errorCount}`
    );

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
    // Validate input parameters
    if (count <= 0) {
      console.info('ActivitySuggestionService: No AI activities needed (count <= 0)');
      return [];
    }

    if (!groupId || typeof groupId !== 'string') {
      console.error('ActivitySuggestionService: Invalid groupId for AI generation');
      return [];
    }

    if (!context || !context.startTime || !context.endTime) {
      console.error('ActivitySuggestionService: Invalid context for AI generation');
      return [];
    }

    try {
      // Task 4.1: Calculate requestCount - add 1 if no users have interests (for interest prompt)
      const requestCount = context.hasAnyInterests ? count : count + 1;
      console.info(`ActivitySuggestionService: Requesting ${requestCount} AI-generated activities (hasAnyInterests: ${context.hasAnyInterests})`);

      // Task 4.1: Pass enhanced context to GeminiService.generateActivities
      const generatedActivities = await GeminiService.generateActivities(requestCount, context);

      if (!generatedActivities || generatedActivities.length === 0) {
        console.warn('ActivitySuggestionService: Gemini service returned no activities');
        return [];
      }

      console.info(`ActivitySuggestionService: Received ${generatedActivities.length} activities from Gemini`);

      // Create activity suggestions from generated activities
      const suggestions = [];
      let successCount = 0;
      let errorCount = 0;

      for (const activity of generatedActivities) {
        try {
          // Additional validation before database insertion
          if (!activity.title || !activity.description || !activity.category) {
            console.warn('ActivitySuggestionService: Skipping invalid AI activity:', {
              hasTitle: !!activity.title,
              hasDescription: !!activity.description,
              hasCategory: !!activity.category,
            });
            errorCount++;
            continue;
          }

          // Task 4.2 & Task 6: Parse startTime and endTime from generated activities with comprehensive validation
          let activityStartTime: Date;
          let activityEndTime: Date;
          let usedFallback = false;

          try {
            // Task 6: Validate time parsing and provide fallbacks
            // Check if time strings are provided
            if (!activity.startTime || typeof activity.startTime !== 'string') {
              console.warn('ActivitySuggestionService: Missing or invalid startTime, using slot time as fallback:', {
                activityTitle: activity.title,
                startTime: activity.startTime,
                startTimeType: typeof activity.startTime,
              });
              activityStartTime = context.startTime;
              usedFallback = true;
            } else {
              // Task 4.2: Convert ISO strings to Date objects
              activityStartTime = new Date(activity.startTime);

              // Validate the parsed date is valid
              if (isNaN(activityStartTime.getTime())) {
                console.warn('ActivitySuggestionService: Invalid startTime format, using slot time as fallback:', {
                  activityTitle: activity.title,
                  startTime: activity.startTime,
                });
                activityStartTime = context.startTime;
                usedFallback = true;
              }
            }

            if (!activity.endTime || typeof activity.endTime !== 'string') {
              console.warn('ActivitySuggestionService: Missing or invalid endTime, using slot time as fallback:', {
                activityTitle: activity.title,
                endTime: activity.endTime,
                endTimeType: typeof activity.endTime,
              });
              activityEndTime = context.endTime;
              usedFallback = true;
            } else {
              // Task 4.2: Convert ISO strings to Date objects
              activityEndTime = new Date(activity.endTime);

              // Validate the parsed date is valid
              if (isNaN(activityEndTime.getTime())) {
                console.warn('ActivitySuggestionService: Invalid endTime format, using slot time as fallback:', {
                  activityTitle: activity.title,
                  endTime: activity.endTime,
                });
                activityEndTime = context.endTime;
                usedFallback = true;
              }
            }

            // Task 4.2: Validate times are within original slot boundaries
            if (!usedFallback) {
              const startOutOfBounds = activityStartTime < context.startTime || activityStartTime > context.endTime;
              const endOutOfBounds = activityEndTime < context.startTime || activityEndTime > context.endTime;

              if (startOutOfBounds || endOutOfBounds) {
                console.warn('ActivitySuggestionService: Activity times outside slot boundaries, using slot times as fallback:', {
                  activityTitle: activity.title,
                  activityStart: activity.startTime,
                  activityEnd: activity.endTime,
                  slotStart: context.startTime.toISOString(),
                  slotEnd: context.endTime.toISOString(),
                  startOutOfBounds,
                  endOutOfBounds,
                });
                // Fallback to slot times if outside boundaries
                activityStartTime = context.startTime;
                activityEndTime = context.endTime;
                usedFallback = true;
              }
            }

            // Additional validation: ensure start is before end
            if (!usedFallback && activityStartTime >= activityEndTime) {
              console.warn('ActivitySuggestionService: Invalid time range (start >= end), using slot times as fallback:', {
                activityTitle: activity.title,
                activityStart: activity.startTime,
                activityEnd: activity.endTime,
              });
              activityStartTime = context.startTime;
              activityEndTime = context.endTime;
              usedFallback = true;
            }

            // Task 6: Validate time parsing - check for unreasonably short or long durations
            if (!usedFallback) {
              const durationMs = activityEndTime.getTime() - activityStartTime.getTime();
              const durationHours = durationMs / (1000 * 60 * 60);

              // Warn if duration is less than 30 minutes or more than 12 hours
              if (durationHours < 0.5) {
                console.warn('ActivitySuggestionService: Activity duration too short (< 30 min), using slot times as fallback:', {
                  activityTitle: activity.title,
                  durationHours: durationHours.toFixed(2),
                });
                activityStartTime = context.startTime;
                activityEndTime = context.endTime;
                usedFallback = true;
              } else if (durationHours > 12) {
                console.warn('ActivitySuggestionService: Activity duration too long (> 12 hours), using slot times as fallback:', {
                  activityTitle: activity.title,
                  durationHours: durationHours.toFixed(2),
                });
                activityStartTime = context.startTime;
                activityEndTime = context.endTime;
                usedFallback = true;
              }
            }
          } catch (timeError) {
            console.warn('ActivitySuggestionService: Unexpected error parsing activity times, using slot times as fallback:', {
              activityTitle: activity.title,
              error: timeError instanceof Error ? timeError.message : String(timeError),
            });
            // Fallback to slot times if parsing fails
            activityStartTime = context.startTime;
            activityEndTime = context.endTime;
            usedFallback = true;
          }

          // Log successful time parsing
          if (!usedFallback) {
            const durationMs = activityEndTime.getTime() - activityStartTime.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            console.info('ActivitySuggestionService: Successfully parsed realistic activity times:', {
              activityTitle: activity.title,
              startTime: activityStartTime.toISOString(),
              endTime: activityEndTime.toISOString(),
              durationHours: durationHours.toFixed(2),
            });
          }

          // Task 4.2: Store parsed times in ActivitySuggestion records instead of slot times
          const suggestion = await prisma.activitySuggestion.create({
            data: {
              groupId,
              title: activity.title.trim(),
              description: activity.description.trim(),
              category: activity.category.trim(),
              startTime: activityStartTime,
              endTime: activityEndTime,
              cost: activity.estimatedCost,
              reasoning: activity.reasoning.trim(),
            },
          });
          suggestions.push(suggestion);
          successCount++;
        } catch (error: any) {
          errorCount++;
          // Provide detailed error logging
          if (error.code === 'P2002') {
            console.error('ActivitySuggestionService: Duplicate AI activity suggestion');
          } else if (error.code === 'P2003') {
            console.error('ActivitySuggestionService: Foreign key constraint failed for AI activity');
          } else {
            console.error('ActivitySuggestionService: Failed to create AI activity suggestion:', error);
          }
          // Continue with other activities even if one fails
        }
      }

      console.info(
        `ActivitySuggestionService: AI activity creation complete - ` +
        `Success: ${successCount}, Errors: ${errorCount}`
      );

      return suggestions;
    } catch (error) {
      console.error('ActivitySuggestionService: Unexpected error in AI activity generation:', error);
      return [];
    }
  }

  /**
   * Sort suggestions to prioritize external events over AI-generated ones
   * External events are always shown first
   * @param suggestions Array of activity suggestions
   * @returns Sorted array with external events first
   */
  private static sortSuggestionsByPriority(
    suggestions: ActivitySuggestion[]
  ): ActivitySuggestion[] {
    return suggestions.sort((a, b) => {
      // External events (have externalEventId) come first
      const aIsExternal = !!a.externalEventId;
      const bIsExternal = !!b.externalEventId;

      if (aIsExternal && !bIsExternal) return -1;
      if (!aIsExternal && bIsExternal) return 1;

      // Within same type, sort by creation time (most recent first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
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
      // Validate input parameters
      if (!groupId || typeof groupId !== 'string') {
        console.error('ActivitySuggestionService: Invalid groupId for suggestion count');
        return 0;
      }

      if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error('ActivitySuggestionService: Invalid date parameters for suggestion count');
        return 0;
      }

      if (startTime >= endTime) {
        console.error('ActivitySuggestionService: startTime must be before endTime');
        return 0;
      }

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

      console.info(`ActivitySuggestionService: Found ${count} existing suggestions for time slot`);
      return count;
    } catch (error: any) {
      if (error.code === 'P2025') {
        console.error('ActivitySuggestionService: Record not found in suggestion count query');
      } else {
        console.error('ActivitySuggestionService: Failed to get suggestion count:', error);
      }
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
    // Task 6: Handle missing user names gracefully
    // Extract unique locations (location is an enum but treated as string)
    const locations = [...new Set(groupMembers.map((m) => m.location).filter(Boolean) as string[])];

    // Task 6: Handle empty interests arrays without errors
    // Extract all interests (keep for backward compatibility)
    const interests = groupMembers.flatMap((m) => {
      if (!m.interests || !Array.isArray(m.interests)) {
        console.warn('ActivitySuggestionService: User has invalid interests array:', {
          userId: m.id,
          userName: m.name,
        });
        return [];
      }
      return m.interests.map((i) => i.interest);
    });

    // Calculate time of day
    const hour = startTime.getHours();
    const timeOfDay =
      hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    // Calculate season
    const month = startTime.getMonth();
    const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'autumn';

    // Task 6: Handle missing user names gracefully in context calculation
    // Build user-interest mapping with user names for personalization
    const userInterests = groupMembers
      .filter((m) => {
        // Task 6: Log warnings for invalid personalization data
        if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
          console.warn('ActivitySuggestionService: Skipping user with missing or invalid name for personalization:', {
            userId: m.id,
            hasName: !!m.name,
            nameType: typeof m.name,
          });
          return false;
        }
        return true;
      })
      .map((m) => {
        // Task 6: Handle empty interests arrays without errors
        let userInterestsList: string[] = [];

        if (!m.interests || !Array.isArray(m.interests)) {
          console.warn('ActivitySuggestionService: User has invalid interests array, using empty array:', {
            userId: m.id,
            userName: m.name,
          });
        } else {
          userInterestsList = m.interests
            .filter((i) => {
              // Validate each interest has the required field
              if (!i || !i.interest || typeof i.interest !== 'string') {
                console.warn('ActivitySuggestionService: Invalid interest entry for user:', {
                  userId: m.id,
                  userName: m.name,
                  interest: i,
                });
                return false;
              }
              return true;
            })
            .map((i) => i.interest);
        }

        return {
          userName: m.name!,
          interests: userInterestsList,
        };
      });

    // Determine if any group members have interests configured
    const hasAnyInterests = userInterests.some((ui) => ui.interests.length > 0);

    // Task 6: Log warnings for invalid personalization data
    const membersWithoutNames = groupMembers.length - userInterests.length;
    if (membersWithoutNames > 0) {
      console.warn(
        `ActivitySuggestionService: ${membersWithoutNames} group member(s) excluded from personalization due to missing names`
      );
    }

    if (!hasAnyInterests && userInterests.length > 0) {
      console.info(
        'ActivitySuggestionService: No group members have interests configured, interest prompt will be included'
      );
    }

    return {
      startTime,
      endTime,
      locations,
      interests, // Keep for backward compatibility
      memberCount: groupMembers.length,
      season,
      timeOfDay,
      // New fields for personalization
      userInterests,
      hasAnyInterests,
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

    // Validate input parameters
    if (!groupId || typeof groupId !== 'string') {
      const error = new Error('Invalid groupId parameter');
      console.error('ActivitySuggestionService:', error.message);
      throw error;
    }

    if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      const error = new Error('Invalid date parameters');
      console.error('ActivitySuggestionService:', error.message);
      throw error;
    }

    if (startTime >= endTime) {
      const error = new Error('startTime must be before endTime');
      console.error('ActivitySuggestionService:', error.message);
      throw error;
    }

    console.info(`ActivitySuggestionService: Starting suggestion generation for group ${groupId}`);

    try {
      // Get current suggestion count
      const currentCount = await this.getSuggestionCount(groupId, startTime, endTime);

      // Calculate how many suggestions we need to create
      const targetCount = 6;
      const neededCount = Math.max(0, targetCount - currentCount);

      if (neededCount === 0) {
        console.info('ActivitySuggestionService: Target suggestion count already reached');
        return {
          created: 0,
          fromExternalEvents: 0,
          fromAI: 0,
          total: currentCount,
        };
      }

      console.info(`ActivitySuggestionService: Need to create ${neededCount} suggestions`);

      // Get group members with their locations and interests
      let groupMembers;
      try {
        groupMembers = await prisma.user.findMany({
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

        if (!groupMembers || groupMembers.length === 0) {
          console.warn('ActivitySuggestionService: No group members found');
          return {
            created: 0,
            fromExternalEvents: 0,
            fromAI: 0,
            total: currentCount,
          };
        }

        console.info(`ActivitySuggestionService: Found ${groupMembers.length} group members`);
      } catch (error) {
        console.error('ActivitySuggestionService: Failed to fetch group members:', error);
        throw new Error('Failed to fetch group members');
      }

      // Extract locations for external event filtering (location is an enum but treated as string)
      const locations = [...new Set(groupMembers.map((m) => m.location).filter(Boolean) as string[])];

      // Find overlapping external events (gracefully handles failures)
      const externalEvents = await this.findOverlappingExternalEvents(
        startTime,
        endTime,
        locations
      );

      // Create suggestions from external events (up to needed count)
      // This method handles partial failures gracefully
      const externalEventSuggestions = await this.createSuggestionsFromExternalEvents(
        groupId,
        externalEvents.slice(0, neededCount)
      );

      // Calculate remaining needed suggestions
      const remainingNeeded = neededCount - externalEventSuggestions.length;

      // Generate AI activities for remaining slots
      // This method handles failures gracefully and returns empty array on error
      let aiSuggestions: ActivitySuggestion[] = [];
      if (remainingNeeded > 0) {
        try {
          const context = this.calculateContext(startTime, endTime, groupMembers);
          aiSuggestions = await this.generateAIActivities(groupId, remainingNeeded, context);
        } catch (error) {
          console.error('ActivitySuggestionService: Failed to generate AI activities, continuing with partial results:', error);
          // Continue with partial success - external events may have been created
        }
      }

      // Return summary (partial success is acceptable)
      const totalCreated = externalEventSuggestions.length + aiSuggestions.length;

      console.info(
        `ActivitySuggestionService: Generation complete - ` +
        `Created: ${totalCreated} (${externalEventSuggestions.length} external, ${aiSuggestions.length} AI), ` +
        `Total: ${currentCount + totalCreated}`
      );

      return {
        created: totalCreated,
        fromExternalEvents: externalEventSuggestions.length,
        fromAI: aiSuggestions.length,
        total: currentCount + totalCreated,
      };
    } catch (error: any) {
      console.error('ActivitySuggestionService: Critical error in suggestion generation:', error);

      // Provide more context in the error message
      const errorMessage = error.message || 'Unknown error occurred';
      throw new Error(`Failed to generate suggestions: ${errorMessage}`);
    }
  }

  /**
   * Fetch and sort activity suggestions for a time slot
   * @param groupId ID of the group
   * @param startTime Start time of the time slot
   * @param endTime End time of the time slot
   * @returns Sorted array of activity suggestions (external events first)
   */
  static async getSortedSuggestions(
    groupId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ActivitySuggestion[]> {
    try {
      // Validate input parameters
      if (!groupId || typeof groupId !== 'string') {
        console.error('ActivitySuggestionService: Invalid groupId for fetching suggestions');
        return [];
      }

      if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error('ActivitySuggestionService: Invalid date parameters for fetching suggestions');
        return [];
      }

      if (startTime >= endTime) {
        console.error('ActivitySuggestionService: startTime must be before endTime');
        return [];
      }

      // Fetch all suggestions for the time slot
      const suggestions = await prisma.activitySuggestion.findMany({
        where: {
          groupId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      // Sort suggestions with external events first
      const sortedSuggestions = this.sortSuggestionsByPriority(suggestions);

      console.info(`ActivitySuggestionService: Fetched and sorted ${sortedSuggestions.length} suggestions`);
      return sortedSuggestions;
    } catch (error: any) {
      console.error('ActivitySuggestionService: Failed to fetch sorted suggestions:', error);
      return [];
    }
  }
}
