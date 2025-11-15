# Implementation Plan: User Calendar

- [x] 1. Create calendar service layer
  - Implement `CalendarService` class in `lib/services/calendar.service.ts`
  - Write methods: `getUserTimeSlots()`, `createTimeSlot()`, `updateTimeSlot()`, `deleteTimeSlot()`
  - Use existing `CalendarEvent` Prisma model with `source: EventSource.manual`
  - Include timezone handling and date range filtering
  - _Requirements: 1.3, 2.5, 3.5, 4.3_

- [x] 2. Create API routes for time slot management
  - Implement `GET /api/calendar/timeslots` route to fetch user time slots with date range query params
  - Implement `POST /api/calendar/timeslots` route to create new time slots
  - Implement `PUT /api/calendar/timeslots/[id]` route to update existing time slots
  - Implement `DELETE /api/calendar/timeslots/[id]` route to delete time slots
  - Add Zod validation schemas for request bodies
  - Include authentication checks using `requireAuth()` helper
  - Implement error handling with standardized error responses
  - _Requirements: 2.1, 2.5, 2.6, 3.1, 3.5, 3.6, 4.1, 4.3_

- [x] 3. Create calendar page component
  - Create `app/calendar/page.tsx` as a Server Component
  - Add authentication check and redirect if not authenticated
  - Wrap content in `ProtectedLayout` component
  - Render `CalendarView` client component
  - _Requirements: 1.3_

- [x] 4. Implement calendar view component
  - Create `components/calendar/calendar-view.tsx` as a Client Component
  - Implement state management for time slots using React hooks
  - Create calendar grid layout with day/week view toggle
  - Fetch time slots from API on component mount
  - Display time slots in calendar format with start/end times
  - Add controls to open add/edit/delete dialogs
  - Implement responsive layout with mobile-first design (Tailwind breakpoints)
  - Add loading and error states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.2_

- [x] 5. Create time slot dialog component
  - Create `components/calendar/time-slot-dialog.tsx` for add/edit functionality
  - Implement form using React Hook Form with Zod validation
  - Add fields: title (required), start time (required), end time (required), description (optional)
  - Use HTML5 date/time input types for mobile-friendly pickers
  - Validate that end time is after start time
  - Handle both create and edit modes based on props
  - Submit form data to appropriate API endpoint (POST for create, PUT for edit)
  - Display validation errors inline
  - Show loading state during submission
  - Call `onSuccess` callback and close dialog on successful submission
  - Use Shadcn Dialog component with mobile-responsive styling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.3, 5.4_

- [x] 6. Create delete confirmation dialog component
  - Create `components/calendar/delete-time-slot-dialog.tsx`
  - Display time slot details and confirmation message
  - Add "Cancel" and "Delete" buttons with appropriate styling
  - Call DELETE API endpoint on confirmation
  - Show loading state during deletion
  - Call `onSuccess` callback and close dialog on successful deletion
  - Display error toast on failure
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Implement mobile-friendly interactions
  - Ensure all interactive elements have minimum 44x44px touch targets
  - Add touch-friendly button sizing and spacing
  - Implement responsive text sizing (no horizontal scroll needed)
  - Use bottom sheet style dialogs on mobile devices (full-screen on small screens)
  - Add toast notifications for user feedback using Sonner
  - Test touch interactions on time slot cards (tap to edit, delete button)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Update navigation to include calendar tab
  - Add "Calendar" link to navigation in `components/protected-layout.tsx`
  - Position between "Groups" and "Profile" links
  - Use consistent styling with existing navigation links
  - _Requirements: 1.3_

- [ ] 9. Add timezone handling utilities
  - Implement timezone detection using browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - Store all times in UTC in database
  - Convert times to user's timezone for display
  - Pass timezone to API when creating/updating time slots
  - _Requirements: 2.5, 3.5_

- [ ] 10. Write integration tests for API routes
  - Test GET endpoint with various date ranges
  - Test POST endpoint with valid and invalid data
  - Test PUT endpoint for updating time slots
  - Test DELETE endpoint for removing time slots
  - Test authentication and authorization checks
  - Test error handling scenarios
  - _Requirements: 2.7, 3.7, 4.3_

- [ ] 11. Write unit tests for calendar service
  - Test `getUserTimeSlots()` with mocked Prisma client
  - Test `createTimeSlot()` with various input data
  - Test `updateTimeSlot()` with partial updates
  - Test `deleteTimeSlot()` with valid and invalid IDs
  - Test date range filtering logic
  - _Requirements: 2.5, 3.5, 4.3_
