'use client';

import { useState, useRef, useEffect } from 'react';
import { positionToTime, type TimeSlot } from '@/lib/utils/unavailability-grid';

interface UnavailabilityRangeProps {
  range: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
  position: {
    left: number;
    width: number;
  };
  timeSlot: TimeSlot;
  containerWidth: number;
  onHandleDragStart: (rangeId: string, handle: 'start' | 'end') => void;
  onHandleDrag: (rangeId: string, newTime: Date, handle: 'start' | 'end') => void;
  onHandleDragEnd: () => void;
}

interface RangeHandleProps {
  position: 'start' | 'end';
  onDragStart: () => void;
  onDrag: (clientX: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function RangeHandle({ position, onDragStart, onDrag, onDragEnd, isDragging }: RangeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        onDrag(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      onDragEnd();
    };

    const handleTouchEnd = () => {
      onDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, onDrag, onDragEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDragStart();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    onDragStart();
  };

  return (
    <div
      ref={handleRef}
      className={`
        absolute top-0 h-full w-3 cursor-ew-resize touch-none
        ${position === 'start' ? 'left-0 -ml-1.5' : 'right-0 -mr-1.5'}
        ${isDragging ? 'bg-orange-600' : 'bg-orange-500'}
        ${position === 'start' ? 'rounded-l' : 'rounded-r'}
        hover:bg-orange-600 transition-colors
        sm:w-4 sm:${position === 'start' ? '-ml-2' : '-mr-2'}
      `}
      style={{
        minWidth: '44px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-label={`${position === 'start' ? 'Start' : 'End'} time handle`}
      tabIndex={0}
    />
  );
}

export function UnavailabilityRange({
  range,
  position,
  timeSlot,
  containerWidth,
  onHandleDragStart,
  onHandleDrag,
  onHandleDragEnd,
}: UnavailabilityRangeProps) {
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDragStart = (handle: 'start' | 'end') => {
    setDraggingHandle(handle);
    onHandleDragStart(range.id, handle);
  };

  const handleDrag = (clientX: number, handle: 'start' | 'end') => {
    if (!rangeRef.current) return;

    // Find the parent container (the overlay container)
    const overlayContainer = rangeRef.current.parentElement;
    if (!overlayContainer) return;

    // Calculate pixel position relative to the overlay container
    const rect = overlayContainer.getBoundingClientRect();
    const pixelPosition = clientX - rect.left;

    // Clamp to container bounds
    const clampedPosition = Math.max(0, Math.min(pixelPosition, containerWidth));

    // Convert pixel position to time
    const newTime = positionToTime(clampedPosition, containerWidth, timeSlot);

    onHandleDrag(range.id, newTime, handle);
  };

  const handleDragEnd = () => {
    setDraggingHandle(null);
    onHandleDragEnd();
  };

  return (
    <div
      ref={rangeRef}
      className="absolute top-0 h-full pointer-events-auto"
      style={{
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
      role="region"
      aria-label={`Unavailability range from ${formatTime(range.startTime)} to ${formatTime(range.endTime)}`}
    >
      {/* Time labels */}
      <div className="absolute -top-7 left-0 text-xs font-semibold text-orange-500 whitespace-nowrap bg-white px-2 py-1 rounded shadow-sm">
        {formatTime(range.startTime)}
      </div>
      <div className="absolute -top-7 right-0 text-xs font-semibold text-orange-500 whitespace-nowrap bg-white px-2 py-1 rounded shadow-sm">
        {formatTime(range.endTime)}
      </div>

      {/* Range background */}
      <div
        className={`
          h-full rounded border-2 border-orange-500 transition-colors
          ${draggingHandle ? 'bg-orange-400/40' : 'bg-orange-500/30'}
        `}
        style={{
          backgroundColor: draggingHandle ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.3)',
        }}
      />

      {/* Drag handles */}
      <RangeHandle
        position="start"
        onDragStart={() => handleDragStart('start')}
        onDrag={(clientX) => handleDrag(clientX, 'start')}
        onDragEnd={handleDragEnd}
        isDragging={draggingHandle === 'start'}
      />
      <RangeHandle
        position="end"
        onDragStart={() => handleDragStart('end')}
        onDrag={(clientX) => handleDrag(clientX, 'end')}
        onDragEnd={handleDragEnd}
        isDragging={draggingHandle === 'end'}
      />
    </div>
  );
}
