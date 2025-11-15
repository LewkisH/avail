'use client';

import { useEffect, useState, useRef } from 'react';
import { UnavailabilityRange as UnavailabilityRangeComponent } from './unavailability-range';
import {
  timeToPosition,
  detectOverlap,
  mergeRanges,
  type TimeSlot,
  type UnavailabilityRange,
} from '@/lib/utils/unavailability-grid';

interface UnavailabilityOverlayProps {
  timeSlot: TimeSlot;
  ranges: UnavailabilityRange[];
  onRangeUpdate: (rangeId: string, updates: Partial<UnavailabilityRange>) => void;
  isDragging: boolean;
}

interface RangePosition {
  left: number;
  width: number;
}

export function UnavailabilityOverlay({
  timeSlot,
  ranges,
  onRangeUpdate,
  isDragging,
}: UnavailabilityOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [draggingRangeId, setDraggingRangeId] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate pixel position for a range
  const calculateRangePosition = (range: UnavailabilityRange): RangePosition => {
    if (containerWidth === 0) {
      return { left: 0, width: 0 };
    }

    const left = timeToPosition(range.startTime, timeSlot, containerWidth);
    const right = timeToPosition(range.endTime, timeSlot, containerWidth);
    const width = right - left;

    return { left, width };
  };

  // Merge overlapping ranges automatically
  const getMergedRanges = (rangesToMerge: UnavailabilityRange[]): UnavailabilityRange[] => {
    if (rangesToMerge.length <= 1) {
      return rangesToMerge;
    }

    // Sort ranges by start time
    const sorted = [...rangesToMerge].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    const merged: UnavailabilityRange[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      
      if (detectOverlap(current, next)) {
        // Merge overlapping ranges
        current = mergeRanges(current, next);
      } else {
        // No overlap, add current to merged list and move to next
        merged.push(current);
        current = next;
      }
    }

    // Add the last range
    merged.push(current);

    return merged;
  };

  // Get merged ranges for rendering
  const mergedRanges = getMergedRanges(ranges);

  const handleHandleDragStart = (rangeId: string, handle: 'start' | 'end') => {
    setDraggingRangeId(rangeId);
    setDraggingHandle(handle);
  };

  const handleHandleDrag = (rangeId: string, newTime: Date, handle: 'start' | 'end') => {
    const range = ranges.find((r) => r.id === rangeId);
    if (!range) return;

    // Update the appropriate time based on which handle is being dragged
    const updates: Partial<UnavailabilityRange> = {};
    
    if (handle === 'start') {
      // Ensure start time doesn't go past end time
      if (newTime < range.endTime) {
        updates.startTime = newTime;
      }
    } else {
      // Ensure end time doesn't go before start time
      if (newTime > range.startTime) {
        updates.endTime = newTime;
      }
    }

    if (Object.keys(updates).length > 0) {
      onRangeUpdate(rangeId, updates);
    }
  };

  const handleHandleDragEnd = () => {
    setDraggingRangeId(null);
    setDraggingHandle(null);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {mergedRanges.map((range) => {
        const position = calculateRangePosition(range);
        
        // Only render if position is valid
        if (position.width <= 0) {
          return null;
        }

        return (
          <UnavailabilityRangeComponent
            key={range.id}
            range={range}
            position={position}
            onHandleDragStart={handleHandleDragStart}
            onHandleDrag={handleHandleDrag}
            onHandleDragEnd={handleHandleDragEnd}
          />
        );
      })}
    </div>
  );
}
