import { GroupAvailabilityService } from '../group-availability.service';
import { prisma } from '../../prisma';

// Mock prisma
jest.mock('../../prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    groupMember: {
      findMany: jest.fn(),
    },
    groupAvailability: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('GroupAvailabilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findFreeTimeWindows', () => {
    it('should handle no events - entire day is free', async () => {
      const date = new Date('2025-11-15');
      const userIds = ['user1'];

      jest.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          groupMember: {
            findMany: jest.fn().mockResolvedValue([{ userId: 'user1' }]),
          },
          groupAvailability: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      const result = await GroupAvailabilityService.calculateGroupAvailability({
        groupId: 'group1',
        date,
      });

      // Should have one window covering the entire day
      expect(result).toHaveLength(1);
    });

    it('should handle overlapping events correctly', async () => {
      const date = new Date('2025-11-15');
      
      // Events: 11:01-13:00 and 11:11-12:22 (overlapping)
      const events = [
        {
          id: '1',
          userId: 'user1',
          startTime: new Date('2025-11-15T11:01:00'),
          endTime: new Date('2025-11-15T13:00:00'),
        },
        {
          id: '2',
          userId: 'user1',
          startTime: new Date('2025-11-15T11:11:00'),
          endTime: new Date('2025-11-15T12:22:00'),
        },
      ];

      jest.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            findMany: jest.fn().mockResolvedValue(events),
          },
          groupMember: {
            findMany: jest.fn().mockResolvedValue([{ userId: 'user1' }]),
          },
          groupAvailability: {
            deleteMany: jest.fn(),
            create: jest.fn().mockImplementation(async (data: any) => ({
              id: 'window1',
              ...data.data,
              participants: [],
            })),
          },
        };
        return callback(mockTx);
      });

      const result = await GroupAvailabilityService.calculateGroupAvailability({
        groupId: 'group1',
        date,
      });

      // Should have two free windows: before 11:01 and after 13:00
      // NOT a window from 12:22 to 13:00 (because events should be merged)
      expect(result).toHaveLength(2);
      
      // First window: 00:00 to 11:01
      expect(result[0].startTime.getHours()).toBe(0);
      expect(result[0].endTime.getHours()).toBe(11);
      expect(result[0].endTime.getMinutes()).toBe(1);
      
      // Second window: 13:00 to 23:59
      expect(result[1].startTime.getHours()).toBe(13);
      expect(result[1].endTime.getHours()).toBe(23);
    });

    it('should handle adjacent events', async () => {
      const date = new Date('2025-11-15');
      
      // Events: 10:00-11:00 and 11:00-12:00 (adjacent, no gap)
      const events = [
        {
          id: '1',
          userId: 'user1',
          startTime: new Date('2025-11-15T10:00:00'),
          endTime: new Date('2025-11-15T11:00:00'),
        },
        {
          id: '2',
          userId: 'user1',
          startTime: new Date('2025-11-15T11:00:00'),
          endTime: new Date('2025-11-15T12:00:00'),
        },
      ];

      jest.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            findMany: jest.fn().mockResolvedValue(events),
          },
          groupMember: {
            findMany: jest.fn().mockResolvedValue([{ userId: 'user1' }]),
          },
          groupAvailability: {
            deleteMany: jest.fn(),
            create: jest.fn().mockImplementation(async (data: any) => ({
              id: 'window1',
              ...data.data,
              participants: [],
            })),
          },
        };
        return callback(mockTx);
      });

      const result = await GroupAvailabilityService.calculateGroupAvailability({
        groupId: 'group1',
        date,
      });

      // Should have two free windows: before 10:00 and after 12:00
      // NOT a window between 11:00 and 11:00 (events are adjacent)
      expect(result).toHaveLength(2);
    });

    it('should handle events with gaps', async () => {
      const date = new Date('2025-11-15');
      
      // Events: 10:00-11:00 and 14:00-15:00 (with gap)
      const events = [
        {
          id: '1',
          userId: 'user1',
          startTime: new Date('2025-11-15T10:00:00'),
          endTime: new Date('2025-11-15T11:00:00'),
        },
        {
          id: '2',
          userId: 'user1',
          startTime: new Date('2025-11-15T14:00:00'),
          endTime: new Date('2025-11-15T15:00:00'),
        },
      ];

      jest.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            findMany: jest.fn().mockResolvedValue(events),
          },
          groupMember: {
            findMany: jest.fn().mockResolvedValue([{ userId: 'user1' }]),
          },
          groupAvailability: {
            deleteMany: jest.fn(),
            create: jest.fn().mockImplementation(async (data: any) => ({
              id: 'window1',
              ...data.data,
              participants: [],
            })),
          },
        };
        return callback(mockTx);
      });

      const result = await GroupAvailabilityService.calculateGroupAvailability({
        groupId: 'group1',
        date,
      });

      // Should have three free windows: before 10:00, 11:00-14:00, and after 15:00
      expect(result).toHaveLength(3);
      
      // Middle window should be 11:00 to 14:00
      const middleWindow = result.find(
        w => w.startTime.getHours() === 11 && w.endTime.getHours() === 14
      );
      expect(middleWindow).toBeDefined();
    });

    it('should handle multiple overlapping events', async () => {
      const date = new Date('2025-11-15');
      
      // Events: 10:00-12:00, 11:00-13:00, 11:30-12:30 (all overlapping)
      const events = [
        {
          id: '1',
          userId: 'user1',
          startTime: new Date('2025-11-15T10:00:00'),
          endTime: new Date('2025-11-15T12:00:00'),
        },
        {
          id: '2',
          userId: 'user1',
          startTime: new Date('2025-11-15T11:00:00'),
          endTime: new Date('2025-11-15T13:00:00'),
        },
        {
          id: '3',
          userId: 'user1',
          startTime: new Date('2025-11-15T11:30:00'),
          endTime: new Date('2025-11-15T12:30:00'),
        },
      ];

      jest.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            findMany: jest.fn().mockResolvedValue(events),
          },
          groupMember: {
            findMany: jest.fn().mockResolvedValue([{ userId: 'user1' }]),
          },
          groupAvailability: {
            deleteMany: jest.fn(),
            create: jest.fn().mockImplementation(async (data: any) => ({
              id: 'window1',
              ...data.data,
              participants: [],
            })),
          },
        };
        return callback(mockTx);
      });

      const result = await GroupAvailabilityService.calculateGroupAvailability({
        groupId: 'group1',
        date,
      });

      // Should merge all three events into one busy period: 10:00-13:00
      // So two free windows: before 10:00 and after 13:00
      expect(result).toHaveLength(2);
      
      // Second window should start at 13:00
      expect(result[1].startTime.getHours()).toBe(13);
    });
  });

  describe('group availability with multiple users', () => {
    it('should find overlapping free time for two users', async () => {
      const date = new Date('2025-11-15');
      
      // User1: busy 10:00-11:00
      // User2: busy 14:00-15:00
      // Overlap: 00:00-10:00, 11:00-14:00, 15:00-23:59
      const events = [
        {
          id: '1',
          userId: 'user1',
          startTime: new Date('2025-11-15T10:00:00'),
          endTime: new Date('2025-11-15T11:00:00'),
        },
        {
          id: '2',
          userId: 'user2',
          startTime: new Date('2025-11-15T14:00:00'),
          endTime: new Date('2025-11-15T15:00:00'),
        },
      ];

      jest.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          calendarEvent: {
            findMany: jest.fn().mockResolvedValue(events),
          },
          groupMember: {
            findMany: jest.fn().mockResolvedValue([
              { userId: 'user1' },
              { userId: 'user2' },
            ]),
          },
          groupAvailability: {
            deleteMany: jest.fn(),
            create: jest.fn().mockImplementation(async (data: any) => ({
              id: 'window1',
              ...data.data,
              participants: [],
            })),
          },
        };
        return callback(mockTx);
      });

      const result = await GroupAvailabilityService.calculateGroupAvailability({
        groupId: 'group1',
        date,
      });

      // Should have three overlapping free windows
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });
});
