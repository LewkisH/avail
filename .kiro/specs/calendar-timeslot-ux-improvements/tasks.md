# Implementation Plan

- [ ] 1. Create duration slider component
  - Create new file `components/calendar/duration-slider.tsx`
  - Implement slider with range input (15 minutes to 2880 minutes)
  - Add real-time value display showing formatted duration
  - Implement 15-minute step increments
  - Add proper ARIA attributes for accessibility
  - Style for mobile touch targets (minimum 44px height)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 2. Refactor TimeSlotDialog to use separate date and time inputs
  - Replace datetime-local inputs with separate date (type="date") and time (type="time") inputs
  - Update form schema to use date, startTime, and duration fields instead of startTime and endTime
  - Implement calculateEndTime function to derive end time from start time and duration
  - Implement formatDuration function to display duration in human-readable format
  - Update form submission to convert date + time + duration to UTC ISO strings for API
  - Update edit mode to populate date, time, and duration from existing time slot
  - Add validation to prevent past date selection
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Add duration preset buttons to TimeSlotDialog
  - Create array of duration presets (30min, 1hr, 2hrs, 3hrs, 4hrs)
  - Render preset buttons in a horizontal scrollable container
  - Implement preset selection that updates duration field
  - Add visual highlighting for selected preset
  - Clear preset selection when user manually adjusts duration or end time
  - Ensure buttons meet minimum touch target size (44x44px)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.4_

- [ ] 4. Integrate duration slider into TimeSlotDialog
  - Add DurationSlider component to the dialog form
  - Connect slider value to form duration field
  - Update end time display when slider changes
  - Update slider position when duration presets are selected
  - Update slider position when end time is manually changed
  - Add section label and styling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 5. Add "Start Now" quick action button
  - Add "Start Now" button to TimeSlotDialog (create mode only)
  - Implement handleStartNow function to set current time rounded to nearest 15 minutes
  - Set default duration to 60 minutes (1 hour) when "Start Now" is clicked
  - Update date and startTime form fields
  - Hide button in edit mode
  - Style button for mobile touch targets
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.1_

- [ ] 6. Add real-time duration display to TimeSlotDialog
  - Calculate duration from start time and end time
  - Display duration in "X hours Y minutes" or "Y minutes" format
  - Update display in real-time as user modifies times or duration
  - Show error message when end time is before start time
  - Style as read-only highlighted field
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Enhance week view time slot cards with end time display
  - Update CalendarView renderWeekView function
  - Modify time slot card to display both start and end times
  - Format time range as "HH:MM AM/PM - HH:MM AM/PM"
  - Handle text truncation/wrapping for small cards
  - Ensure consistent formatting with day view
  - Test responsive behavior across viewport sizes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Add edit and delete buttons to week view time slot cards
  - Add Edit and Delete button components to week view cards
  - Implement click handlers that stop event propagation
  - Connect Edit button to open TimeSlotDialog with pre-populated data
  - Connect Delete button to open DeleteTimeSlotDialog
  - Style buttons for mobile touch targets (minimum 44x44px)
  - Add proper spacing between buttons (minimum 8px)
  - Adjust card layout to accommodate action buttons
  - Test interactions on mobile and desktop
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 5.1, 5.2, 5.3_

- [ ] 9. Update TimeSlotDialog layout and styling for mobile
  - Reorganize form into logical sections (header, date/time, duration, actions)
  - Ensure all input fields have minimum 44px height
  - Add adequate spacing between form elements (minimum 8px)
  - Make dialog scrollable on small screens
  - Test on various mobile viewport sizes
  - Verify touch target sizes meet accessibility standards
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Handle multi-day time slot edge cases
  - Update end time display to show date when it differs from start date
  - Format multi-day end time as "HH:MM AM/PM (MMM DD)"
  - Test time slots spanning midnight
  - Test time slots spanning multiple days (up to 48 hours)
  - Ensure calendar view correctly displays multi-day slots
  - _Requirements: 9.6_

- [ ]* 11. Add comprehensive error handling and validation
  - Implement past date validation with clear error messages
  - Add network error handling with toast notifications
  - Handle API conflict errors (overlapping slots)
  - Add loading states during form submission
  - Test error scenarios and user feedback
  - _Requirements: 2.5, 3.4_

- [ ]* 12. Accessibility improvements and testing
  - Add ARIA labels to all form inputs and buttons
  - Ensure keyboard navigation works throughout dialog
  - Test with screen readers (VoiceOver, TalkBack)
  - Verify focus management and indicators
  - Ensure color contrast meets WCAG AA standards
  - Test all interactions with keyboard only
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
