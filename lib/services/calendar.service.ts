import { EventSource } from '@prisma/client';
import { prisma } from '../prisma';

export class CalendarService {
  /**
   * Get all time slots for a user within a date range
   * Only returns manually created time slots (source: manual)
   * @param userId - User ID
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of calendar events (time slots)
   */
  static async getUserTimeSlots(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await prisma.calendarEvent.findMany({
      where: {
        userId,
        source: EventSource.manual,
        startTime: {
          gte: startDate,
        },
        endTime: {
          lte: endDate,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Create a new time slot for a user
   * @param userId - User ID
   * @param data - Time slot data
   * @returns Created calendar event
   */
  static async createTimeSlot(
    userId: string,
    data: {
      title: string;
      startTime: Date;
      endTime: Date;
      description?: string;
      timezone: string;
    }
  ) {
    return await prisma.calendarEvent.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        source: EventSource.manual,
        sourceId: null,
      },
    });
  }

  /**
   * Update an existing time slot
   * Only allows updating time slots owned by the user
   * @param timeSlotId - Time slot ID
   * @param userId - User ID (for authorization)
   * @param data - Updated time slot data
   * @returns Updated calendar event
   */
  static async updateTimeSlot(
    timeSlotId: string,
    userId: string,
    data: {
      title?: string;
      startTime?: Date;
      endTime?: Date;
      description?: string;
    }
  ) {
    // Verify ownership before updating
    const timeSlot = await prisma.calendarEvent.findUnique({
      where: { id: timeSlotId },
    });

    if (!timeSlot) {
      throw new Error('Time slot not found');
    }

    if (timeSlot.userId !== userId) {
      throw new Error('Unauthorized to update this time slot');
    }

    if (timeSlot.source !== EventSource.manual) {
      throw new Error('Can only update manually created time slots');
    }

    return await prisma.calendarEvent.update({
      where: { id: timeSlotId },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
      },
    });
  }

  /**
   * Delete a time slot
   * Only allows deleting time slots owned by the user
   * @param timeSlotId - Time slot ID
   * @param userId - User ID (for authorization)
   * @returns Deleted calendar event
   */
  static async deleteTimeSlot(timeSlotId: string, userId: string) {
    // Verify ownership before deleting
    const timeSlot = await prisma.calendarEvent.findUnique({
      where: { id: timeSlotId },
    });

    if (!timeSlot) {
      throw new Error('Time slot not found');
    }

    if (timeSlot.userId !== userId) {
      throw new Error('Unauthorized to delete this time slot');
    }

    if (timeSlot.source !== EventSource.manual) {
      throw new Error('Can only delete manually created time slots');
    }

    return await prisma.calendarEvent.delete({
      where: { id: timeSlotId },
    });
  }
}
