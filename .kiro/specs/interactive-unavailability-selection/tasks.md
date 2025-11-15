# Implementation Plan

- [x] 1. Implement core time calculation utilities
  - Create lib/utils/unavailability-grid.ts with snapToGrid function that handles standard intervals (00, 15, 30, 45) and edge cases (preserves exact time slot boundaries)
  - Implement positionToTime function for converting pixel positions to time values
  - Implement timeToPosition function for converting time values to pixel positions
  - Implement detectOverlap function for checking range overlaps
  - Implement mergeRanges function for combining overlapping ranges
  - _Requirements: 1.2, 6.6, 7.3, 7.4_

- [x] 1.1 Write unit tests for time calculation utilities
  - Test grid snapping to standard intervals (00, 15, 30, 45)
  - Test edge case snapping at time slot boundaries with non-standard times
  - Test position/time conversions with various time slot durations
  - Test overlap detection and range merging logic
  - _Requirements: 1.2, 6.6, 7.3, 7.4_

- [x] 2. Create UnavailabilityRange component
  - Create components/calendar/unavailability-range.tsx component
  - Implement orange styling with rgba(249, 115, 22, 0.3) background and solid border
  - Add start and end time labels positioned above the range with proper formatting
  - Implement RangeHandle sub-components for start and end with 44x44px touch targets
  - Add drag event handlers for handle resizing with pointer events
  - Implement visual feedback during drag operations (cursor changes, handle highlighting)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4_

- [x] 3. Create UnavailabilityOverlay component
  - Create components/calendar/unavailability-overlay.tsx component
  - Implement absolute positioning logic for ranges within time slot bounds
  - Calculate pixel positions from time values using timeToPosition utility
  - Render multiple UnavailabilityRange components
  - Implement automatic range merging when overlaps are detected during drag
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Create InteractiveTimeSlotRow wrapper component
  - Create components/groups/interactive-time-slot-row.tsx component that wraps the existing TimeSlotRow
  - Implement mouse event handlers: onMouseDown, onMouseMove, onMouseUp
  - Implement touch event handlers: onTouchStart, onTouchMove, onTouchEnd with preventDefault for drag operations
  - Add click vs drag detection with 5px movement threshold
  - Calculate time positions from cursor/touch coordinates using positionToTime utility
  - Implement draft range creation during drag operations with real-time visual feedback
  - Forward simple clicks to modal handler
  - Integrate UnavailabilityOverlay rendering on top of the existing TimeSlotRow
  - Render the existing TimeSlotRow component as children with proper styling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5. Create TimeSlotModal component
  - Create components/calendar/time-slot-modal.tsx component
  - Implement empty modal dialog using existing Dialog components from shadcn/ui
  - Add close button and basic structure for future functionality
  - Style modal appropriately for mobile and desktop
  - _Requirements: 5.4, 5.5_

- [ ] 6. Create ConfirmationControls component
  - Create components/calendar/confirmation-controls.tsx component
  - Implement "Confirm Unavailables" and "Cancel" buttons with appropriate styling
  - Add range count display showing number of unavailable periods
  - Implement conditional visibility based on whether draft ranges exist
  - Style buttons with appropriate variants and minimum 44px height for mobile
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Integrate unavailability selection into GroupAvailabilityView
  - Add state management for draft unavailability ranges (DraftUnavailabilityRange[]) in GroupAvailabilityView component
  - Add DragState interface and state for tracking current drag operations
  - Implement onRangeCreate, onRangeUpdate, onRangeDelete handlers
  - Integrate ConfirmationControls into the view header with conditional rendering
  - Implement confirm handler that creates CalendarEvent records via POST /api/calendar/timeslots for each draft range with title="Busy" and source="manual"
  - Implement cancel handler that clears all draft ranges from state
  - Wrap existing TimeSlotRow components with the new interactive TimeSlotRow wrapper
  - Pass necessary props (availability window, draft ranges, handlers) to TimeSlotRow components
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.5_

- [ ] 8. Add mobile-specific optimizations
  - Increase handle size to 16px width on mobile viewports (< 640px)
  - Implement touch-friendly time label positioning that doesn't overlap
  - Add responsive styling for ConfirmationControls (full-width buttons on mobile)
  - Optimize touch event performance with debouncing (16ms for 60fps)
  - Test and refine touch interactions on mobile devices
  - Ensure proper touch target sizes (44x44px minimum) for all interactive elements
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 9. Implement error handling and validation
  - Add client-side validation for range bounds within time slot
  - Add validation for minimum 15-minute range duration
  - Implement error toast messages for validation failures using sonner
  - Implement error handling for network failures during save with retry option
  - Add loading states during API calls (disable confirm button, show spinner)
  - Handle edge cases like overlapping ranges and invalid time selections
  - _Requirements: 1.5, 3.5, 4.3, 4.4_

- [ ] 10. Add accessibility features
  - Add ARIA labels to unavailability ranges with descriptive start/end times
  - Implement keyboard navigation support (Tab to navigate between ranges)
  - Add screen reader announcements for range creation, updates, and deletion
  - Ensure all interactive elements have proper focus indicators
  - Add aria-live regions for dynamic updates
  - Test with screen readers (VoiceOver, NVDA)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_
