import { prisma } from '../prisma';
import type { CalendarEvent } from '@prisma/client';

interface TimeRange {
  startTime: Date;
  endTime: Date;
}

interface AvailabilityWindow {
  startTime: Date;
  endTime: Date;
  participantIds: string[];
}

interface CalculateAvailabilityParams {
  groupId: string;
  date: Date;
}

interface GetAvailabilityParams {
  groupId: string;
  date: Date;
  userId: string;
}

export class GroupAvailabilityService {
  /**
   * Find free time windows by analyzing calendar events
   * Returns time ranges where specified users have no conflicts
   * @param userIds - Array of user IDs to check
   * @param date - Date to check availability for
   * @param txOrPrisma - Transaction client or prisma client
   * @returns Map of user IDs to their free time windows
   */
  private static async findFreeTimeWindows(
    userIds: string[],
    date: Date,
    txOrPrisma: typeof prisma | any = prisma
  ): Promise<Map<string, TimeRange[]>> {
    console.log("=== findFreeTimeWindows ===");
    console.log("Input date:", date.toISOString());
    console.log("Input date local:", date.toString());

    // Set up date boundaries (start and end of the day)
    // The date parameter already represents the start of the day in the user's timezone (in UTC)
    // For example, if user is in UTC+2 and selects Nov 15:
    // - date will be 2025-11-14T22:00:00.000Z (which is Nov 15 00:00 in UTC+2)
    // We need to add 24 hours to get the end of that day
    const dayStart = new Date(date.getTime());
    const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1); // Add 24 hours minus 1ms

    console.log("Day start:", dayStart.toISOString(), "/", dayStart.toString());
    console.log("Day end:", dayEnd.toISOString(), "/", dayEnd.toString());

    // Fetch all calendar events for all users on this date
    const events = await txOrPrisma.calendarEvent.findMany({
      where: {
        userId: { in: userIds },
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    console.log(
      `Found ${events.length} events:`,
      events.map((e: CalendarEvent) => ({
        start: e.startTime.toISOString(),
        end: e.endTime.toISOString(),
        userId: e.userId,
      }))
    );

    // Fetch user sleep times
    const userSleepTimes = await txOrPrisma.userSleepTime.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    // Create a map of sleep times by user
    const sleepTimeByUser = new Map<
      string,
      { startTime: string; endTime: string }
    >();
    for (const sleepTime of userSleepTimes) {
      sleepTimeByUser.set(sleepTime.userId, {
        startTime: sleepTime.startTime,
        endTime: sleepTime.endTime,
      });
    }

    console.log(`Found ${userSleepTimes.length} user sleep times`);

    // Group events by user
    const eventsByUser = new Map<string, TimeRange[]>();
    for (const userId of userIds) {
      eventsByUser.set(userId, []);
    }

    // Add calendar events to each user's event list
    for (const event of events) {
      const userEvents = eventsByUser.get(event.userId) || [];
      userEvents.push({
        startTime: event.startTime,
        endTime: event.endTime,
      });
      eventsByUser.set(event.userId, userEvents);
    }

    // Log busy times (calendar events) for each user
    console.log("=== BUSY TIMES (Calendar Events) ===");
    for (const [userId, userEvents] of eventsByUser.entries()) {
      const calendarEvents = events.filter(
        (e: CalendarEvent) => e.userId === userId
      );
      if (calendarEvents.length > 0) {
        console.log(`User ${userId}:`);
        calendarEvents.forEach((event: CalendarEvent, index: number) => {
          console.log(
            `  [${index + 1}] ${event.startTime.toISOString()} → ${event.endTime.toISOString()}`
          );
          console.log(
            `      Local: ${event.startTime.toString()} → ${event.endTime.toString()}`
          );
        });
      } else {
        console.log(`User ${userId}: No calendar events`);
      }
    }

    // Log sleep times for each user
    console.log("\n=== SLEEP TIMES (UTC) ===");
    for (const userId of userIds) {
      const sleepTime = sleepTimeByUser.get(userId);
      if (sleepTime) {
        console.log(
          `User ${userId}: ${sleepTime.startTime} → ${sleepTime.endTime} (stored as UTC in HH:MM format)`
        );
      } else {
        console.log(`User ${userId}: No sleep time configured`);
      }
    }
    console.log("");

    // Add sleep time as busy time for each user
    for (const userId of userIds) {
      const sleepTime = sleepTimeByUser.get(userId);
      if (!sleepTime) continue;

      const userEvents = eventsByUser.get(userId) || [];

      // Parse sleep times (format: "HH:MM" stored as UTC)
      const [startHour, startMinute] = sleepTime.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = sleepTime.endTime.split(":").map(Number);

      console.log(`User ${userId} - Sleep time conversion:`);
      console.log(
        `  Input: ${sleepTime.startTime} → ${sleepTime.endTime} (stored as UTC HH:MM)`
      );
      console.log(
        `  Day window: ${dayStart.toISOString()} → ${dayEnd.toISOString()}`
      );

      const periodsToAdd: Array<{ startTime: Date; endTime: Date }> = [];

      // We need to check 3 potential sleep periods that could overlap with our day:
      // 1. Yesterday's sleep (started day before, might end during our day)
      // 2. Today's sleep (starts during our day)
      // 3. Tomorrow's sleep (might start during our day if sleep hour < day end hour)

      // Helper to create sleep period on a specific UTC date
      const createSleepPeriod = (baseDate: Date) => {
        const start = new Date(baseDate);
        start.setUTCHours(startHour, startMinute, 0, 0);

        let end = new Date(baseDate);
        end.setUTCHours(endHour, endMinute, 0, 0);

        // If end time <= start time, sleep extends to next day
        if (end <= start) {
          end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }

        return { start, end };
      };

      // 1. Check yesterday's sleep (started on day-1, might end during our day)
      const yesterdayBase = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdaySleep = createSleepPeriod(yesterdayBase);

      console.log(
        `  Yesterday's sleep: ${yesterdaySleep.start.toISOString()} → ${yesterdaySleep.end.toISOString()}`
      );

      if (yesterdaySleep.end > dayStart && yesterdaySleep.start < dayEnd) {
        const overlapStart =
          yesterdaySleep.start < dayStart ? dayStart : yesterdaySleep.start;
        const overlapEnd =
          yesterdaySleep.end > dayEnd ? dayEnd : yesterdaySleep.end;
        periodsToAdd.push({ startTime: overlapStart, endTime: overlapEnd });
        console.log(
          `    ✓ Overlaps with day: ${overlapStart.toISOString()} → ${overlapEnd.toISOString()}`
        );
      }

      // 2. Check today's sleep (starts on our day)
      const todaySleep = createSleepPeriod(dayStart);

      console.log(
        `  Today's sleep: ${todaySleep.start.toISOString()} → ${todaySleep.end.toISOString()}`
      );

      if (todaySleep.end > dayStart && todaySleep.start < dayEnd) {
        const overlapStart =
          todaySleep.start < dayStart ? dayStart : todaySleep.start;
        const overlapEnd = todaySleep.end > dayEnd ? dayEnd : todaySleep.end;
        periodsToAdd.push({ startTime: overlapStart, endTime: overlapEnd });
        console.log(
          `    ✓ Overlaps with day: ${overlapStart.toISOString()} → ${overlapEnd.toISOString()}`
        );
      }

      // 3. Check tomorrow's sleep (might start during our day)
      const tomorrowBase = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowSleep = createSleepPeriod(tomorrowBase);

      console.log(
        `  Tomorrow's sleep: ${tomorrowSleep.start.toISOString()} → ${tomorrowSleep.end.toISOString()}`
      );

      if (tomorrowSleep.end > dayStart && tomorrowSleep.start < dayEnd) {
        const overlapStart =
          tomorrowSleep.start < dayStart ? dayStart : tomorrowSleep.start;
        const overlapEnd =
          tomorrowSleep.end > dayEnd ? dayEnd : tomorrowSleep.end;
        periodsToAdd.push({ startTime: overlapStart, endTime: overlapEnd });
        console.log(
          `    ✓ Overlaps with day: ${overlapStart.toISOString()} → ${overlapEnd.toISOString()}`
        );
      }

      // Add all overlapping sleep periods to user events
      console.log(`  periodsToAdd count: ${periodsToAdd.length}`);
      for (const period of periodsToAdd) {
        console.log(
          `  Adding sleep period: ${period.startTime.toISOString()} → ${period.endTime.toISOString()}`
        );
        userEvents.push(period);
      }

      eventsByUser.set(userId, userEvents);
      console.log(
        `  Total events for user after adding sleep: ${userEvents.length}`
      );
    }
    console.log("");

    // Calculate free time for each user
    console.log("=== CALCULATING FREE TIME ===");
    const freeTimeByUser = new Map<string, TimeRange[]>();

    for (const userId of userIds) {
      const userEvents = eventsByUser.get(userId) || [];
      console.log(
        `User ${userId} has ${userEvents.length} total events (calendar + sleep)`
      );
      const freeWindows: TimeRange[] = [];

      if (userEvents.length === 0) {
        // User has no events, entire day is free
        freeWindows.push({
          startTime: dayStart,
          endTime: dayEnd,
        });
      } else {
        // Sort events by start time
        userEvents.sort(
          (a, b) => a.startTime.getTime() - b.startTime.getTime()
        );

        // Merge overlapping events
        const mergedEvents: TimeRange[] = [];
        let currentEvent = { ...userEvents[0] };

        for (let i = 1; i < userEvents.length; i++) {
          const nextEvent = userEvents[i];

          // If events overlap or are adjacent, merge them
          if (nextEvent.startTime <= currentEvent.endTime) {
            // Extend current event to cover both
            currentEvent.endTime = new Date(
              Math.max(
                currentEvent.endTime.getTime(),
                nextEvent.endTime.getTime()
              )
            );
          } else {
            // No overlap, save current and start new
            mergedEvents.push(currentEvent);
            currentEvent = { ...nextEvent };
          }
        }
        // Don't forget the last event
        mergedEvents.push(currentEvent);

        // Now calculate free time using merged events
        // Check for free time before first event
        if (mergedEvents[0].startTime > dayStart) {
          freeWindows.push({
            startTime: dayStart,
            endTime: mergedEvents[0].startTime,
          });
        }

        // Check for free time between events
        for (let i = 0; i < mergedEvents.length - 1; i++) {
          const currentEnd = mergedEvents[i].endTime;
          const nextStart = mergedEvents[i + 1].startTime;

          if (currentEnd < nextStart) {
            freeWindows.push({
              startTime: currentEnd,
              endTime: nextStart,
            });
          }
        }

        // Check for free time after last event
        const lastEvent = mergedEvents[mergedEvents.length - 1];
        if (lastEvent.endTime < dayEnd) {
          freeWindows.push({
            startTime: lastEvent.endTime,
            endTime: dayEnd,
          });
        }
      }

      console.log(
        `User ${userId} - Free time windows (${freeWindows.length}):`
      );
      if (freeWindows.length === 0) {
        console.log(`  No free time available`);
      } else {
        freeWindows.forEach((window, index) => {
          console.log(
            `  [${index + 1}] ${window.startTime.toISOString()} → ${window.endTime.toISOString()}`
          );
          console.log(
            `      Local: ${window.startTime.toString()} → ${window.endTime.toString()}`
          );
        });
      }

      freeTimeByUser.set(userId, freeWindows);
    }
    console.log("");

    return freeTimeByUser;
  }

  /**
   * Generate availability combinations prioritizing full group
   * Only creates subgroup combinations if full group isn't available
   * @param allMemberIds - All member IDs in the group
   * @param freeTimeByUser - Map of user IDs to their free time windows
   * @returns Array of availability windows with participants
   */
  private static generateAvailabilityCombinations(
    allMemberIds: string[],
    freeTimeByUser: Map<string, TimeRange[]>
  ): AvailabilityWindow[] {
    const availabilityWindows: AvailabilityWindow[] = [];

    // Helper function to find overlapping time windows for a set of users
    const findOverlappingWindows = (userIds: string[]): AvailabilityWindow[] => {
      if (userIds.length < 2) return [];

      // Get free time windows for all users in this combination
      const userWindows = userIds.map(id => freeTimeByUser.get(id) || []);
      
      // Start with the first user's windows
      let overlaps: TimeRange[] = [...userWindows[0]];

      // Intersect with each subsequent user's windows
      for (let i = 1; i < userWindows.length; i++) {
        const newOverlaps: TimeRange[] = [];

        for (const overlap of overlaps) {
          for (const window of userWindows[i]) {
            // Find intersection
            const startTime = new Date(Math.max(overlap.startTime.getTime(), window.startTime.getTime()));
            const endTime = new Date(Math.min(overlap.endTime.getTime(), window.endTime.getTime()));

            if (startTime < endTime) {
              newOverlaps.push({ startTime, endTime });
            }
          }
        }

        overlaps = newOverlaps;
        if (overlaps.length === 0) break;
      }

      return overlaps.map(window => ({
        ...window,
        participantIds: userIds,
      }));
    };

    // Try full group first
    const fullGroupWindows = findOverlappingWindows(allMemberIds);
    
    if (fullGroupWindows.length > 0) {
      // Full group has availability, use only those windows
      return fullGroupWindows;
    }

    // No full group availability, generate subgroup combinations
    // Start with largest subgroups (n-1) and work down to minimum 2 members
    for (let size = allMemberIds.length - 1; size >= 2; size--) {
      const subgroupWindows = this.generateSubgroupCombinations(
        allMemberIds,
        size,
        findOverlappingWindows
      );

      if (subgroupWindows.length > 0) {
        availabilityWindows.push(...subgroupWindows);
      }
    }

    return availabilityWindows;
  }

  /**
   * Generate all subgroup combinations of a specific size
   * @param memberIds - All member IDs
   * @param size - Size of subgroups to generate
   * @param findOverlappingWindows - Function to find overlapping windows
   * @returns Array of availability windows for all subgroups
   */
  private static generateSubgroupCombinations(
    memberIds: string[],
    size: number,
    findOverlappingWindows: (userIds: string[]) => AvailabilityWindow[]
  ): AvailabilityWindow[] {
    const windows: AvailabilityWindow[] = [];
    const combinations = this.getCombinations(memberIds, size);

    for (const combo of combinations) {
      const comboWindows = findOverlappingWindows(combo);
      windows.push(...comboWindows);
    }

    return windows;
  }

  /**
   * Get all combinations of a specific size from an array
   * @param array - Input array
   * @param size - Size of combinations
   * @returns Array of combinations
   */
  private static getCombinations<T>(array: T[], size: number): T[][] {
    if (size === 0) return [[]];
    if (size > array.length) return [];

    const result: T[][] = [];

    const combine = (start: number, combo: T[]) => {
      if (combo.length === size) {
        result.push([...combo]);
        return;
      }

      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    };

    combine(0, []);
    return result;
  }

  /**
   * Calculate and store group availability for a specific date
   * Analyzes all group members' calendars to find overlapping free time
   * @param params - Group ID and date to calculate availability for
   * @returns Array of created GroupAvailability records
   */
  static async calculateGroupAvailability(
    params: CalculateAvailabilityParams
  ) {
    const { groupId, date } = params;

    // Date is already in UTC from the API layer, use it as-is
    const normalizedDate = new Date(date);

    try {
      return await prisma.$transaction(async (tx) => {
        // Fetch all group members
        const groupMembers = await tx.groupMember.findMany({
          where: { groupId },
          select: { userId: true },
        });

        const memberIds = groupMembers.map(m => m.userId);

        // Need at least 2 members to calculate availability
        if (memberIds.length < 2) {
          console.log(`Group ${groupId} has fewer than 2 members (${memberIds.length}), skipping availability calculation`);
          return [];
        }

        // Calculate free time windows for each member
        const freeTimeByUser = await this.findFreeTimeWindows(memberIds, normalizedDate, tx);

        // Generate availability combinations (prioritizing full group)
        const availabilityWindows = this.generateAvailabilityCombinations(
          memberIds,
          freeTimeByUser
        );

        // Filter to only windows with at least 2 participants
        const validWindows = availabilityWindows.filter(
          window => window.participantIds.length >= 2
        );

        console.log(`Found ${validWindows.length} valid availability windows for group ${groupId} on ${normalizedDate.toISOString()}`);

        // Delete existing availability for this group/date
        await tx.groupAvailability.deleteMany({
          where: {
            groupId,
            date: normalizedDate,
          },
        });

        // Store new availability windows
        const createdWindows = [];
        for (const window of validWindows) {
          const created = await tx.groupAvailability.create({
            data: {
              groupId,
              date: normalizedDate,
              startTime: window.startTime,
              endTime: window.endTime,
              participants: {
                create: window.participantIds.map(userId => ({
                  userId,
                })),
              },
            },
            include: {
              participants: {
                include: {
                  user: true,
                },
              },
            },
          });
          createdWindows.push(created);
        }

        return createdWindows;
      });
    } catch (error) {
      console.error(`Error calculating group availability for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Get stored availability windows for a group on a specific date
   * Filters to only show windows where the requesting user is available
   * @param params - Group ID, date, and user ID for filtering
   * @returns Array of GroupAvailability records with participant details
   */
  static async getGroupAvailability(params: GetAvailabilityParams) {
    const { groupId, date, userId } = params;

    // Date is already in UTC from the API layer, use it as-is
    const normalizedDate = new Date(date);

    try {
      // Fetch availability windows for this group and date
      const availabilityWindows = await prisma.groupAvailability.findMany({
        where: {
          groupId,
          date: normalizedDate,
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Filter to only windows where the requesting user is a participant
      type AvailabilityWithParticipants = typeof availabilityWindows[number];
      type Participant = AvailabilityWithParticipants['participants'][number];
      const userWindows = availabilityWindows.filter((window: AvailabilityWithParticipants) =>
        window.participants.some((p: Participant) => p.userId === userId)
      );

      console.log(`Found ${userWindows.length} availability windows for user ${userId} in group ${groupId} on ${normalizedDate.toISOString()}`);

      return userWindows;
    } catch (error) {
      console.error(`Error fetching group availability for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Recalculate availability for all groups a user belongs to on a specific date
   * Called when user creates/updates/deletes calendar events
   * Handles errors gracefully without blocking calendar operations
   * @param userId - User ID whose calendar changed
   * @param date - Date affected by the calendar change
   */
  static async recalculateUserGroupsAvailability(
    userId: string,
    date: Date
  ): Promise<void> {
    try {
      // Find all groups the user belongs to
      const userGroups = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });

      // Recalculate availability for each group
      const recalculationPromises = userGroups.map(({ groupId }) =>
        this.calculateGroupAvailability({ groupId, date }).catch(error => {
          // Log error but don't throw - we don't want to block calendar operations
          console.error(
            `Failed to recalculate availability for group ${groupId}:`,
            error
          );
          return [];
        })
      );

      await Promise.all(recalculationPromises);
    } catch (error) {
      // Log error but don't throw - we don't want to block calendar operations
      console.error(
        `Failed to recalculate user groups availability for user ${userId}:`,
        error
      );
    }
  }
}
