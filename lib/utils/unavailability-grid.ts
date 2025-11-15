/**
 * Time calculation utilities for unavailability range selection
 */

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface UnavailabilityRange {
  id: string;
  timeSlotId: string;
  startTime: Date;
  endTime: Date;
}

const GRID_MINUTES = 15;
const EDGE_THRESHOLD_MS = 60 * 1000; // 1 minute

/**
 * Snaps a time to the nearest 15-minute grid interval (00, 15, 30, 45).
 * Preserves exact time slot boundaries if the time is within 1 minute of an edge.
 * 
 * @param time - The time to snap
 * @param timeSlot - The time slot boundaries
 * @param gridMinutes - The grid interval in minutes (default: 15)
 * @returns The snapped time
 */
export function snapToGrid(
  time: Date,
  timeSlot: TimeSlot,
  gridMinutes: number = GRID_MINUTES
): Date {
  const timeMs = time.getTime();
  const slotStartMs = timeSlot.startTime.getTime();
  const slotEndMs = timeSlot.endTime.getTime();
  
  // If at or very close to slot boundaries, snap to exact boundary
  if (Math.abs(timeMs - slotStartMs) < EDGE_THRESHOLD_MS) {
    return new Date(slotStartMs);
  }
  
  if (Math.abs(timeMs - slotEndMs) < EDGE_THRESHOLD_MS) {
    return new Date(slotEndMs);
  }
  
  // Otherwise, snap to standard 15-minute intervals (00, 15, 30, 45)
  const snapped = new Date(time);
  const minutes = snapped.getMinutes();
  const snappedMinutes = Math.round(minutes / gridMinutes) * gridMinutes;
  
  snapped.setMinutes(snappedMinutes);
  snapped.setSeconds(0);
  snapped.setMilliseconds(0);
  
  // Ensure we don't snap outside the time slot boundaries
  const snappedMs = snapped.getTime();
  if (snappedMs < slotStartMs) {
    return new Date(slotStartMs);
  }
  if (snappedMs > slotEndMs) {
    return new Date(slotEndMs);
  }
  
  return snapped;
}

/**
 * Converts a pixel position to a time value within a time slot.
 * 
 * @param pixelPosition - The pixel position within the container
 * @param containerWidth - The total width of the container in pixels
 * @param timeSlot - The time slot boundaries
 * @returns The calculated time, snapped to grid
 */
export function positionToTime(
  pixelPosition: number,
  containerWidth: number,
  timeSlot: TimeSlot
): Date {
  const percent = Math.max(0, Math.min(1, pixelPosition / containerWidth));
  const slotDuration = timeSlot.endTime.getTime() - timeSlot.startTime.getTime();
  const offsetMs = percent * slotDuration;
  
  const time = new Date(timeSlot.startTime.getTime() + offsetMs);
  return snapToGrid(time, timeSlot);
}

/**
 * Converts a time value to a pixel position within a time slot.
 * 
 * @param time - The time to convert
 * @param timeSlot - The time slot boundaries
 * @param containerWidth - The total width of the container in pixels
 * @returns The pixel position
 */
export function timeToPosition(
  time: Date,
  timeSlot: TimeSlot,
  containerWidth: number
): number {
  const slotDuration = timeSlot.endTime.getTime() - timeSlot.startTime.getTime();
  const timeOffset = time.getTime() - timeSlot.startTime.getTime();
  const percent = timeOffset / slotDuration;
  
  return percent * containerWidth;
}

/**
 * Detects if two unavailability ranges overlap.
 * 
 * @param range1 - First range
 * @param range2 - Second range
 * @returns True if ranges overlap, false otherwise
 */
export function detectOverlap(
  range1: UnavailabilityRange,
  range2: UnavailabilityRange
): boolean {
  return (
    range1.startTime < range2.endTime &&
    range1.endTime > range2.startTime
  );
}

/**
 * Merges two overlapping unavailability ranges into a single range.
 * 
 * @param range1 - First range
 * @param range2 - Second range
 * @returns A new merged range
 */
export function mergeRanges(
  range1: UnavailabilityRange,
  range2: UnavailabilityRange
): UnavailabilityRange {
  return {
    ...range1,
    startTime: new Date(Math.min(range1.startTime.getTime(), range2.startTime.getTime())),
    endTime: new Date(Math.max(range1.endTime.getTime(), range2.endTime.getTime())),
  };
}
