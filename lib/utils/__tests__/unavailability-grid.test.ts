import {
  snapToGrid,
  positionToTime,
  timeToPosition,
  detectOverlap,
  mergeRanges,
  TimeSlot,
  UnavailabilityRange,
} from '../unavailability-grid';

describe('Unavailability Grid Utilities', () => {
  describe('snapToGrid', () => {
    it('should snap to standard 15-minute intervals (00, 15, 30, 45)', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      // Test snapping to :00
      const time1 = new Date('2024-01-15T10:02:00Z');
      const snapped1 = snapToGrid(time1, timeSlot);
      expect(snapped1.getMinutes()).toBe(0);

      // Test snapping to :15
      const time2 = new Date('2024-01-15T10:13:00Z');
      const snapped2 = snapToGrid(time2, timeSlot);
      expect(snapped2.getMinutes()).toBe(15);

      // Test snapping to :30
      const time3 = new Date('2024-01-15T10:32:00Z');
      const snapped3 = snapToGrid(time3, timeSlot);
      expect(snapped3.getMinutes()).toBe(30);

      // Test snapping to :45
      const time4 = new Date('2024-01-15T10:47:00Z');
      const snapped4 = snapToGrid(time4, timeSlot);
      expect(snapped4.getMinutes()).toBe(45);
    });

    it('should preserve exact time slot boundaries', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:23:00Z'),
        endTime: new Date('2024-01-15T17:37:00Z'),
      };

      // Test start boundary (within 1 minute)
      const nearStart = new Date('2024-01-15T09:23:30Z');
      const snappedStart = snapToGrid(nearStart, timeSlot);
      expect(snappedStart.getTime()).toBe(timeSlot.startTime.getTime());

      // Test end boundary (within 1 minute)
      const nearEnd = new Date('2024-01-15T17:37:30Z');
      const snappedEnd = snapToGrid(nearEnd, timeSlot);
      expect(snappedEnd.getTime()).toBe(timeSlot.endTime.getTime());
    });

    it('should snap to standard intervals for non-boundary times with non-standard slot times', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:23:00Z'),
        endTime: new Date('2024-01-15T17:37:00Z'),
      };

      // Time in the middle should snap to standard interval
      const middleTime = new Date('2024-01-15T12:17:00Z');
      const snapped = snapToGrid(middleTime, timeSlot);
      expect(snapped.getMinutes()).toBe(15);
    });

    it('should not snap outside time slot boundaries', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      // Time before slot start
      const beforeStart = new Date('2024-01-15T08:45:00Z');
      const snappedBefore = snapToGrid(beforeStart, timeSlot);
      expect(snappedBefore.getTime()).toBe(timeSlot.startTime.getTime());

      // Time after slot end
      const afterEnd = new Date('2024-01-15T17:15:00Z');
      const snappedAfter = snapToGrid(afterEnd, timeSlot);
      expect(snappedAfter.getTime()).toBe(timeSlot.endTime.getTime());
    });

    it('should clear seconds and milliseconds', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      const time = new Date('2024-01-15T10:17:45.500Z');
      const snapped = snapToGrid(time, timeSlot);
      expect(snapped.getSeconds()).toBe(0);
      expect(snapped.getMilliseconds()).toBe(0);
    });
  });

  describe('positionToTime', () => {
    it('should convert pixel position to time at start of slot', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      const time = positionToTime(0, 800, timeSlot);
      expect(time.getTime()).toBe(timeSlot.startTime.getTime());
    });

    it('should convert pixel position to time at end of slot', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      const time = positionToTime(800, 800, timeSlot);
      expect(time.getTime()).toBe(timeSlot.endTime.getTime());
    });

    it('should convert pixel position to time in middle of slot', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      // Middle position (400px of 800px) should be around 13:00 (4 hours into 8-hour slot)
      // Result will be snapped to nearest 15-minute interval
      const time = positionToTime(400, 800, timeSlot);
      const expectedTime = new Date('2024-01-15T13:00:00Z');
      expect(time.getTime()).toBe(expectedTime.getTime());
    });

    it('should handle various container widths', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
      };

      // 25% position in 2-hour slot = 30 minutes (snapped to grid)
      const time1 = positionToTime(100, 400, timeSlot);
      const expectedTime = new Date('2024-01-15T09:30:00Z');
      expect(time1.getTime()).toBe(expectedTime.getTime());

      // Same percentage with different container width
      const time2 = positionToTime(200, 800, timeSlot);
      expect(time2.getTime()).toBe(expectedTime.getTime());
    });

    it('should clamp positions outside container bounds', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      // Negative position
      const time1 = positionToTime(-100, 800, timeSlot);
      expect(time1.getTime()).toBe(timeSlot.startTime.getTime());

      // Position beyond container
      const time2 = positionToTime(1000, 800, timeSlot);
      expect(time2.getTime()).toBe(timeSlot.endTime.getTime());
    });
  });

  describe('timeToPosition', () => {
    it('should convert time at start of slot to position 0', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      const position = timeToPosition(timeSlot.startTime, timeSlot, 800);
      expect(position).toBe(0);
    });

    it('should convert time at end of slot to container width', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      const position = timeToPosition(timeSlot.endTime, timeSlot, 800);
      expect(position).toBe(800);
    });

    it('should convert time in middle of slot to middle position', () => {
      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };

      const middleTime = new Date('2024-01-15T13:00:00Z');
      const position = timeToPosition(middleTime, timeSlot, 800);
      expect(position).toBe(400);
    });

    it('should handle various time slot durations', () => {
      // 1-hour slot
      const shortSlot: TimeSlot = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:00:00Z'),
      };

      const time1 = new Date('2024-01-15T09:30:00Z');
      const position1 = timeToPosition(time1, shortSlot, 400);
      expect(position1).toBe(200);

      // 12-hour slot
      const longSlot: TimeSlot = {
        startTime: new Date('2024-01-15T08:00:00Z'),
        endTime: new Date('2024-01-15T20:00:00Z'),
      };

      const time2 = new Date('2024-01-15T14:00:00Z');
      const position2 = timeToPosition(time2, longSlot, 1200);
      expect(position2).toBe(600);
    });
  });

  describe('detectOverlap', () => {
    it('should detect overlapping ranges', () => {
      const range1: UnavailabilityRange = {
        id: '1',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: '2',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T13:00:00Z'),
      };

      expect(detectOverlap(range1, range2)).toBe(true);
      expect(detectOverlap(range2, range1)).toBe(true);
    });

    it('should detect when one range contains another', () => {
      const range1: UnavailabilityRange = {
        id: '1',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T14:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: '2',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      expect(detectOverlap(range1, range2)).toBe(true);
      expect(detectOverlap(range2, range1)).toBe(true);
    });

    it('should not detect overlap for adjacent ranges', () => {
      const range1: UnavailabilityRange = {
        id: '1',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: '2',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T12:00:00Z'),
        endTime: new Date('2024-01-15T14:00:00Z'),
      };

      expect(detectOverlap(range1, range2)).toBe(false);
    });

    it('should not detect overlap for separate ranges', () => {
      const range1: UnavailabilityRange = {
        id: '1',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: '2',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T13:00:00Z'),
        endTime: new Date('2024-01-15T14:00:00Z'),
      };

      expect(detectOverlap(range1, range2)).toBe(false);
    });
  });

  describe('mergeRanges', () => {
    it('should merge overlapping ranges', () => {
      const range1: UnavailabilityRange = {
        id: '1',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: '2',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T13:00:00Z'),
      };

      const merged = mergeRanges(range1, range2);
      expect(merged.startTime.getTime()).toBe(range1.startTime.getTime());
      expect(merged.endTime.getTime()).toBe(range2.endTime.getTime());
      expect(merged.id).toBe(range1.id);
      expect(merged.timeSlotId).toBe(range1.timeSlotId);
    });

    it('should merge when first range is later', () => {
      const range1: UnavailabilityRange = {
        id: '1',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T13:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: '2',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      const merged = mergeRanges(range1, range2);
      expect(merged.startTime.getTime()).toBe(range2.startTime.getTime());
      expect(merged.endTime.getTime()).toBe(range1.endTime.getTime());
    });

    it('should merge when one range contains another', () => {
      const range1: UnavailabilityRange = {
        id: '1',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T14:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: '2',
        timeSlotId: 'slot1',
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      const merged = mergeRanges(range1, range2);
      expect(merged.startTime.getTime()).toBe(range1.startTime.getTime());
      expect(merged.endTime.getTime()).toBe(range1.endTime.getTime());
    });

    it('should preserve properties from first range', () => {
      const range1: UnavailabilityRange = {
        id: 'first-id',
        timeSlotId: 'slot-a',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      const range2: UnavailabilityRange = {
        id: 'second-id',
        timeSlotId: 'slot-b',
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T13:00:00Z'),
      };

      const merged = mergeRanges(range1, range2);
      expect(merged.id).toBe('first-id');
      expect(merged.timeSlotId).toBe('slot-a');
    });
  });
});
