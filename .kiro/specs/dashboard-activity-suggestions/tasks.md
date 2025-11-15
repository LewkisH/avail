# Implementation Plan

- [x] 1. Update database schema with group availability models
  - Add GroupAvailability and GroupAvailabilityParticipant models to Prisma schema
  - Add relations to User and Group models
  - Create and run database migration
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 2. Implement GroupAvailabilityService for availability calculation
  - [x] 2.1 Create service file with core calculation methods
    - Create lib/services/group-availability.service.ts
    - Implement findFreeTimeWindows method to calculate free time from calendar events
    - Implement generateAvailabilityCombinations to prioritize full-group availability
    - _Requirements: 2.1, 2.5, 2.6_

  - [x] 2.2 Implement calculateGroupAvailability method
    - Fetch all group members for the specified group
    - Fetch calendar events for all members on the specified date
    - Calculate free time windows for each member
    - Generate availability combinations
    - Store results in database with atomic transaction
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.4_

  - [x] 2.3 Implement getGroupAvailability method
    - Fetch stored availability windows for group and date
    - Filter to only windows where requesting user is a participant
    - Include participant user details
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

  - [x] 2.4 Implement recalculateUserGroupsAvailability method
    - Find all groups the user belongs to
    - Trigger recalculation for each group on the affected date
    - Handle errors gracefully without blocking calendar operations
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Integrate availability recalculation with calendar operations
  - [x] 3.1 Update CalendarService.createTimeSlot
    - Extract date from created event
    - Call recalculateUserGroupsAvailability after successful creation
    - _Requirements: 3.1_

  - [x] 3.2 Update CalendarService.updateTimeSlot
    - Extract dates from old and new event times
    - Call recalculateUserGroupsAvailability for all affected dates
    - _Requirements: 3.3_

  - [x] 3.3 Update CalendarService.deleteTimeSlot
    - Extract date from deleted event
    - Call recalculateUserGroupsAvailability after successful deletion
    - _Requirements: 3.2_

- [x] 4. Create API endpoint for fetching group availability
  - [x] 4.1 Implement GET /api/groups/[id]/availability route
    - Validate user is member of the group
    - Parse and validate date query parameter
    - Call GroupAvailabilityService.getGroupAvailability
    - Return formatted response with availability windows and participants
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2_

  - [x] 4.2 Implement POST /api/groups/[id]/availability/recalculate route
    - Validate user is member of the group
    - Parse and validate date from request body
    - Call GroupAvailabilityService.calculateGroupAvailability
    - Return success response
    - _Requirements: 2.1_

- [x] 5. Create frontend GroupAvailabilityView component
  - [x] 5.1 Create base component structure
    - Create components/groups/group-availability-view.tsx
    - Set up component props and state management
    - Implement date selection state
    - _Requirements: 5.1, 5.5_

  - [x] 5.2 Implement API integration
    - Create hook to fetch availability data for selected date
    - Handle loading and error states
    - Implement automatic refetch on date change
    - _Requirements: 1.1, 5.3_

  - [x] 5.3 Build header section
    - Implement "Select the date you are available" text with styling
    - Match Figma design with proper typography and colors
    - _Requirements: 5.1_

  - [x] 5.4 Build DayPicker component
    - Create horizontal scrollable date picker showing 14 days
    - Implement date selection with orange highlight for selected date
    - Add navigation arrows for scrolling
    - Display day number and day name for each date
    - Auto-scroll to current date on mount
    - _Requirements: 5.2, 5.3, 5.5_

  - [x] 5.5 Build TimeSlotRow component
    - Display time range with start and end times
    - Show participant avatars in a row
    - Match Figma design with white background and rounded corners
    - Handle empty state when no time slots available
    - _Requirements: 1.2, 1.3, 5.4_

  - [x] 5.6 Integrate component into dashboard
    - Add GroupAvailabilityView to dashboard page
    - Pass appropriate group ID prop
    - Test full user flow from dashboard
    - _Requirements: 1.1, 1.4_

- [x] 6. Add error handling and edge cases
  - Handle groups with no members
  - Handle dates with no availability
  - Handle users not in any groups
  - Add proper error messages and empty states
  - _Requirements: 3.4, 4.1_
