# Implementation Plan

- [x] 1. Update database schema for activity suggestions and event interests
  - Add location, category, startTime, endTime fields to ActivitySuggestion model
  - Create GroupEventInterest model with proper constraints and indexes
  - Generate Prisma client and run migration
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 10.4, 10.5_

- [x] 1.1 Update Prisma schema with new fields
  - Add location (String?), category (String?), startTime (DateTime), endTime (DateTime) to ActivitySuggestion
  - Create GroupEventInterest model with activitySuggestionId and userId fields
  - Add unique constraint on [activitySuggestionId, userId] to prevent duplicate joins
  - Add indexes on activitySuggestionId and userId for query performance
  - _Requirements: 1.1, 1.2, 3.1, 4.1, 10.5_

- [x] 1.2 Generate Prisma client
  - Run `npx prisma generate` to update the Prisma client with new schema
  - _Requirements: 1.1, 1.2_

- [x] 1.3 Create and run database migration
  - Run `npx prisma migrate dev` to apply schema changes to database
  - Verify migration completes successfully
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement time slot events API endpoint
  - Create GET endpoint to fetch activity suggestions and availability for a time slot
  - Filter activity suggestions by time range overlap
  - Calculate member availability based on calendar events
  - Include participant data from GroupEventInterest
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 10.1, 10.2, 10.3_

- [x] 2.1 Create API route file and authentication
  - Create `/api/groups/[groupId]/time-slots/events/route.ts`
  - Implement authentication check using Clerk
  - Verify user is a member of the group (403 if not)
  - _Requirements: 1.1, 10.1_

- [x] 2.2 Implement activity suggestions query
  - Query ActivitySuggestion where groupId matches and time overlaps with slot
  - Include related GroupEventInterest records with user data
  - Order results by startTime chronologically
  - Handle case where no activity suggestions exist
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.2, 10.3, 10.4, 10.5_

- [x] 2.3 Implement availability calculation logic
  - Fetch all group members for the specified group
  - For each member, query CalendarEvent for overlapping busy periods
  - Mark user as unavailable if any calendar events overlap with time slot
  - Return availability array with user details and isAvailable flag
  - _Requirements: 5.1, 5.2_

- [x] 2.4 Format and return API response
  - Transform ActivitySuggestion data to match GroupEvent interface
  - Include participants array with user name and imageUrl
  - Add hasJoined flag based on current user's GroupEventInterest
  - Return JSON response with activitySuggestions and availability arrays
  - Handle errors with appropriate status codes (401, 403, 404, 500)
  - _Requirements: 1.1, 1.2, 3.1, 4.2, 4.3, 8.4, 8.5_

- [x] 3. Implement join event API endpoint
  - Create POST endpoint to create GroupEventInterest record
  - Verify user is group member and handle duplicate joins
  - Return updated participant list
  - _Requirements: 4.1, 4.4, 4.5_

- [x] 3.1 Create join event API route
  - Create `/api/groups/[groupId]/activity-suggestions/[suggestionId]/join/route.ts`
  - Implement authentication check using Clerk
  - Verify user is a member of the group (403 if not)
  - Verify activity suggestion exists and belongs to group (404 if not)
  - _Requirements: 4.1, 4.4_

- [x] 3.2 Create GroupEventInterest record
  - Create GroupEventInterest with activitySuggestionId and userId
  - Handle duplicate join attempts with try-catch (return 409 if already joined)
  - Query updated participant list after successful creation
  - Return success response with participants array
  - _Requirements: 4.4, 4.5_

- [ ]* 4. Implement leave event API endpoint (optional)
  - Create DELETE endpoint to remove GroupEventInterest record
  - Verify user owns the interest record before deletion
  - _Requirements: 4.1_

- [ ]* 4.1 Create leave event API route
  - Create `/api/groups/[groupId]/activity-suggestions/[suggestionId]/leave/route.ts`
  - Implement authentication and authorization checks
  - Delete GroupEventInterest where activitySuggestionId and userId match
  - Return success response
  - _Requirements: 4.1_

- [x] 5. Update TimeSlotEventsSection component with join functionality
  - Implement hasJoined state handling for button text and disabled state
  - Connect onJoinEvent callback to handle join button clicks
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.6_

- [x] 5.1 Implement join button state logic
  - Check hasJoined prop to determine button text ("Join" vs "Joined")
  - Disable button when hasJoined is true
  - Add loading state during join action (isJoining)
  - _Requirements: 4.2, 4.3_

- [x] 5.2 Connect join event callback
  - Call onJoinEvent with activity suggestion ID when button clicked
  - Handle callback response to update local state
  - Update participants array and hasJoined flag after successful join
  - _Requirements: 4.4, 4.5, 4.6_

- [x] 6. Update TimeSlotModal component with data fetching
  - Implement data fetching when modal opens
  - Add loading and error states
  - Handle join event action and update local state
  - _Requirements: 1.1, 1.5, 4.5, 7.5, 8.1, 8.2, 8.3, 9.2, 9.3_

- [x] 6.1 Implement data fetching on modal open
  - Fetch activity suggestions and availability when modal opens
  - Use groupId and timeSlot startTime/endTime as query parameters
  - Store fetched data in component state (events, availability)
  - _Requirements: 1.1, 1.2, 9.3_

- [x] 6.2 Add loading and error states
  - Display loading spinner while fetching data
  - Show error message if data fetching fails
  - Handle empty states (no events, no availability data)
  - _Requirements: 1.3, 5.5, 8.1, 8.2_

- [x] 6.3 Implement join event handler
  - Create onJoinEvent callback that calls the join API endpoint
  - Update local events state with new participant and hasJoined flag
  - Show toast notification on success or error
  - Handle API errors gracefully
  - _Requirements: 4.4, 4.5, 8.3, 9.2_

- [ ] 7. Verify TimeSlotAvailabilitySection component styling
  - Ensure component matches design specifications
  - Test with real availability data
  - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 7.1 Verify availability section styling
  - Check that available users show green UserCheck icon
  - Check that unavailable users show red UserX icon with 60% opacity
  - Verify user avatar size (24x24px) and text formatting
  - Test hover states and responsive behavior
  - _Requirements: 5.3, 5.4, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 8. Connect modal to group availability view
  - Update parent component to pass required props to modal
  - Implement modal open handler with time slot data
  - Connect join event callback to API and handle responses
  - _Requirements: 1.1, 4.5, 8.3, 9.2, 9.3_

- [ ] 8.1 Update group availability view integration
  - Pass groupId and userId props to TimeSlotModal
  - Implement modal open handler that sets timeSlot state
  - Pass timeSlot data with id, title, startTime, endTime
  - _Requirements: 1.1_

- [ ] 8.2 Implement join event API integration
  - Create async function to call join event API endpoint
  - Handle API responses (success, error, 409 conflict)
  - Show toast notifications for success and error cases
  - Refresh modal data after successful join
  - _Requirements: 4.5, 8.3, 9.2_

- [ ]* 9. Add user imageUrl field to schema if missing
  - Check if User model has imageUrl field
  - Add field and update Clerk webhook if needed
  - _Requirements: 3.4, 3.5, 6.1_

- [ ]* 9.1 Check and update User model
  - Verify if User model has imageUrl field in schema
  - Add imageUrl String? field if missing
  - Update Clerk webhook handler to sync user images
  - Generate Prisma client and run migration
  - _Requirements: 3.4, 3.5, 6.1_

- [ ]* 10. Write API endpoint tests
  - Test GET time slot events endpoint with various scenarios
  - Test POST join event endpoint with edge cases
  - Test authorization and error handling
  - _Requirements: 1.1, 1.2, 1.3, 4.4, 8.1, 8.2_

- [ ]* 10.1 Test time slot events API
  - Test successful fetch with activity suggestions and availability
  - Test with no activity suggestions (empty array)
  - Test with invalid groupId (404)
  - Test with unauthorized user (401, 403)
  - Test availability calculation with overlapping calendar events
  - _Requirements: 1.1, 1.2, 1.3, 5.2, 8.1, 8.2_

- [ ]* 10.2 Test join event API
  - Test successful join creates GroupEventInterest
  - Test duplicate join returns 409 conflict
  - Test with non-member user (403)
  - Test with invalid activity suggestion (404)
  - Test participant list is updated correctly
  - _Requirements: 4.4, 8.2_

- [ ]* 11. Write component tests
  - Test event card rendering and interactions
  - Test modal behavior and state management
  - Test availability section display
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 4.2, 4.3, 5.3, 5.4, 6.1, 6.2, 6.3_

- [ ]* 11.1 Test TimeSlotEventsSection component
  - Test event card renders with correct data (title, location, category, time)
  - Test time formatting for today, tomorrow, and future dates
  - Test participant avatars display correctly with overlapping layout
  - Test join button shows "Join" when not joined and "Joined" when joined
  - Test join button is disabled when hasJoined is true
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 4.2, 4.3_

- [ ]* 11.2 Test TimeSlotModal component
  - Test modal opens and closes correctly
  - Test loading state displays while fetching data
  - Test error state displays when fetch fails
  - Test join event handler updates local state
  - Test modal refetches data when reopened
  - _Requirements: 1.5, 7.5, 8.1, 8.2, 9.2, 9.3_

- [ ]* 11.3 Test TimeSlotAvailabilitySection component
  - Test available users display with green icon
  - Test unavailable users display with red icon and reduced opacity
  - Test user details (avatar, name, email) render correctly
  - Test empty state when no availability data
  - _Requirements: 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_
