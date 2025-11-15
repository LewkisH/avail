'use client';

import { useState, useRef, useCallback } from 'react';
import { UnavailabilityOverlay } from '@/components/calendar/unavailability-overlay';
import {
  positionToTime,
  type TimeSlot,
  type UnavailabilityRange,
} from '@/lib/utils/unavailability-grid';

interface InteractiveTimeSlotRowProps {
  timeSlot: TimeSlot;
  unavailabilityRanges: UnavailabilityRange[];
  onRangeCreate: (range: UnavailabilityRange) => void;
  onRangeUpdate: (rangeId: string, updates: Partial<UnavailabilityRange>) => void;
  onRangeDelete: (rangeId: string) => void;
  onClick: () => void;
  children: React.ReactNode;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startTime: Date | null;
  currentTime: Date | null;
  hasMoved: boolean;
}

const DRAG_THRESHOLD_PX = 5;

export function InteractiveTimeSlotRow({
  timeSlot,
  unavailabilityRanges,
  onRangeCreate,
  onRangeUpdate,
  onRangeDelete,
  onClick,
  children,
}: InteractiveTimeSlotRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startTime: null,
    currentTime: null,
    hasMoved: false,
  });
  const [draftRange, setDraftRange] = useState<UnavailabilityRange | null>(null);

  // Calculate time from cursor/touch position
  const calculateTimeFromPosition = useCallback(
    (clientX: number): Date | null => {
      if (!containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const pixelPosition = clientX - rect.left;
      const containerWidth = rect.width;

      // Ensure position is within bounds
      if (pixelPosition < 0 || pixelPosition > containerWidth) {
        return null;
      }

      return positionToTime(pixelPosition, containerWidth, timeSlot);
    },
    [timeSlot]
  );

  // Handle pointer down (mouse or touch)
  const handlePointerDown = useCallback(
    (clientX: number) => {
      const time = calculateTimeFromPosition(clientX);
      if (!time) return;

      setDragState({
        isDragging: true,
        startX: clientX,
        startTime: time,
        currentTime: time,
        hasMoved: false,
      });
    },
    [calculateTimeFromPosition]
  );

  // Handle pointer move (mouse or touch)
  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!dragState.isDragging || !dragState.startTime) return;

      // Check if movement exceeds threshold
      const deltaX = Math.abs(clientX - dragState.startX);
      const hasMoved = deltaX > DRAG_THRESHOLD_PX;

      if (!hasMoved && !dragState.hasMoved) {
        // Not enough movement yet
        return;
      }

      const currentTime = calculateTimeFromPosition(clientX);
      if (!currentTime) return;

      // Update drag state
      setDragState((prev) => ({
        ...prev,
        currentTime,
        hasMoved: true,
      }));

      // Create or update draft range
      const startTime =
        currentTime < dragState.startTime ? currentTime : dragState.startTime;
      const endTime =
        currentTime > dragState.startTime ? currentTime : dragState.startTime;

      // Ensure minimum duration (at least different times)
      if (startTime.getTime() === endTime.getTime()) {
        return;
      }

      setDraftRange({
        id: 'draft',
        timeSlotId: '', // Will be set when confirmed
        startTime,
        endTime,
      });
    },
    [dragState, calculateTimeFromPosition]
  );

  // Handle pointer up (mouse or touch)
  const handlePointerUp = useCallback(() => {
    if (!dragState.isDragging) return;

    // Check if this was a click (no significant movement)
    if (!dragState.hasMoved) {
      // Simple click - forward to modal handler
      onClick();
    } else if (draftRange) {
      // Drag completed - create the range
      onRangeCreate({
        ...draftRange,
        id: `range-${Date.now()}`, // Generate unique ID
      });
    }

    // Reset state
    setDragState({
      isDragging: false,
      startX: 0,
      startTime: null,
      currentTime: null,
      hasMoved: false,
    });
    setDraftRange(null);
  }, [dragState, draftRange, onClick, onRangeCreate]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore if clicking on a handle or range
    const target = e.target as HTMLElement;
    if (
      target.closest('[role="slider"]') ||
      target.closest('[role="region"]')
    ) {
      return;
    }

    e.preventDefault();
    handlePointerDown(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handlePointerMove(e.clientX);
  };

  const handleMouseUp = () => {
    handlePointerUp();
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Ignore if touching a handle or range
    const target = e.target as HTMLElement;
    if (
      target.closest('[role="slider"]') ||
      target.closest('[role="region"]')
    ) {
      return;
    }

    if (e.touches.length > 0) {
      handlePointerDown(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragState.isDragging && dragState.hasMoved) {
      // Prevent scrolling during drag
      e.preventDefault();
    }

    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    handlePointerUp();
  };

  // Combine actual ranges with draft range for display
  const allRanges = draftRange
    ? [...unavailabilityRanges, draftRange]
    : unavailabilityRanges;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // Cancel drag if mouse leaves
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd} // Cancel drag if touch is cancelled
      style={{
        cursor: dragState.isDragging
          ? 'col-resize'
          : 'pointer',
        touchAction: dragState.hasMoved ? 'none' : 'auto',
      }}
    >
      {/* Render the existing TimeSlotRow as children */}
      {children}

      {/* Render unavailability overlay on top */}
      <UnavailabilityOverlay
        timeSlot={timeSlot}
        ranges={allRanges}
        onRangeUpdate={onRangeUpdate}
        isDragging={dragState.isDragging && dragState.hasMoved}
      />
    </div>
  );
}
