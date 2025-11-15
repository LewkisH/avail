import { prisma } from '../prisma';

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
    // Set up date boundaries (start and end of the day)
    // The date comes in as a local date (e.g., "2025-11-15" means Nov 15 in user's timezone)
    // We need to create Date objects that represent midnight in the user's local timezone
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Fetch all calendar events for all users on this date
    const events = await txOrPrisma.calendarEvent.findMany({
      where: {
        userId: { in: userIds },
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Group events by user
    const eventsByUser = new Map<string, TimeRange[]>();
    for (const userId of userIds) {
      eventsByUser.set(userId, []);
    }

    for (const event of events) {
      const userEvents = eventsByUser.get(event.userId) || [];
      userEvents.push({
        startTime: event.startTime,
        endTime: event.endTime,
      });
      eventsByUser.set(event.userId, userEvents);
    }

    // Calculate free time for each user
    const freeTimeByUser = new Map<string, TimeRange[]>();

    for (const userId of userIds) {
      const userEvents = eventsByUser.get(userId) || [];
      const freeWindows: TimeRange[] = [];

      if (userEvents.length === 0) {
        // User has no events, entire day is free
        freeWindows.push({
          startTime: dayStart,
          endTime: dayEnd,
        });
      } else {
        // Sort events by start time (should already be sorted from query)
        userEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        // Check for free time before first event
        if (userEvents[0].startTime > dayStart) {
          freeWindows.push({
            startTime: dayStart,
            endTime: userEvents[0].startTime,
          });
        }

        // Check for free time between events
        for (let i = 0; i < userEvents.length - 1; i++) {
          const currentEnd = userEvents[i].endTime;
          const nextStart = userEvents[i + 1].startTime;

          if (currentEnd < nextStart) {
            freeWindows.push({
              startTime: currentEnd,
              endTime: nextStart,
            });
          }
        }

        // Check for free time after last event
        const lastEvent = userEvents[userEvents.length - 1];
        if (lastEvent.endTime < dayEnd) {
          freeWindows.push({
            startTime: lastEvent.endTime,
            endTime: dayEnd,
          });
        }
      }

      freeTimeByUser.set(userId, freeWindows);
    }

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

    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    return await prisma.$transaction(async (tx) => {
      // Fetch all group members
      const groupMembers = await tx.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      });

      const memberIds = groupMembers.map(m => m.userId);

      // Need at least 2 members to calculate availability
      if (memberIds.length < 2) {
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
  }

  /**
   * Get stored availability windows for a group on a specific date
   * Filters to only show windows where the requesting user is available
   * @param params - Group ID, date, and user ID for filtering
   * @returns Array of GroupAvailability records with participant details
   */
  static async getGroupAvailability(params: GetAvailabilityParams) {
    const { groupId, date, userId } = params;

    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

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
    const userWindows = availabilityWindows.filter((window) =>
      window.participants.some((p) => p.userId === userId)
    );

    return userWindows;
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
