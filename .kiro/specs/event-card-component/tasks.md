# Implementation Plan

- [x] 1. Create time formatting utility functions
  - Extract formatEventTime and getInitials functions to shared utility file
  - Create `lib/utils/time-formatting.ts` with exported functions
  - Add date-fns imports and implement formatting logic
  - _Requirements: 1.4, 2.4_

- [x] 2. Create Clerk users batch API endpoint
  - Create `/api/users/clerk-batch/route.ts` endpoint
  - Implement authentication check using Clerk
  - Parse userIds from query parameters (comma-separated)
  - Fetch users from Clerk using `clerkClient.users.getUserList()`
  - Transform Clerk user data to simple format (id, name, imageUrl, email)
  - Return JSON response with users array
  - _Requirements: 4.1, 4.2, 9.1, 9.4_

- [x] 2.1 Add caching layer to Clerk batch endpoint
  - Implement in-memory cache with 5-minute TTL using Map
  - Check cache before calling Clerk API
  - Store fetched users in cache with timestamp
  - Return cached data if not expired
  - _Requirements: 4.5, 9.2, 9.3_

- [x] 2.2 Add error handling and rate limiting
  - Handle Clerk API errors gracefully (try-catch)
  - Implement 5-second timeout for Clerk requests
  - Return partial results if some users fail to fetch
  - Log errors for debugging
  - _Requirements: 5.2, 9.5_

- [x] 3. Create useClerkUsers custom hook
  - Create `hooks/use-clerk-users.ts` file
  - Implement hook that accepts array of user IDs
  - Fetch users from `/api/users/clerk-batch` endpoint
  - Return users Map, loading state, and error state
  - Implement client-side caching with 5-minute TTL
  - _Requirements: 4.1, 4.2, 4.5, 9.2, 9.3_

- [x] 3.1 Add batching logic to useClerkUsers hook
  - Debounce requests by 100ms to collect multiple IDs
  - Batch maximum 50 user IDs per request (Clerk limit)
  - Split large requests into multiple batches
  - Merge results from multiple batches
  - _Requirements: 9.1, 9.5_

- [x] 4. Create EventCard component
  - Create `components/calendar/event-card.tsx` file
  - Define EventCardProps interface with event, onJoin, onClick, isJoining, size props
  - Implement card layout with background image or gradient fallback
  - Add category badge with neutral-800/50 background
  - Display title and location with proper formatting
  - Show formatted time using formatEventTime utility
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 4.1 Add participant avatars to EventCard
  - Use useClerkUsers hook to fetch participant data
  - Display avatars in horizontal row with -space-x-2 overlapping
  - Render Avatar component with Clerk imageUrl
  - Show initials fallback using getInitials utility
  - Limit visible avatars to 3, show "+N more" for additional
  - Add ring-2 ring-background styling to avatars
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_

- [x] 4.2 Add Join button to EventCard
  - Display Join/Joined button based on hasJoined prop
  - Disable button when hasJoined is true or isJoining is true
  - Show "Joining..." text when isJoining is true
  - Call onJoin callback with event ID on click
  - Prevent click event propagation to card (stopPropagation)
  - Style with bg-orange-600 hover:bg-orange-700 rounded-lg
  - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.6_

- [x] 4.3 Add click handler and hover effects to EventCard
  - Add onClick handler that calls onClick prop with event ID
  - Apply hover:bg-accent/10 and cursor-pointer styling
  - Add transition-all for smooth hover effect
  - Add hover transform translateY(-2px) and box-shadow
  - Implement role="button" and tabIndex={0} for accessibility
  - Add onKeyDown handler for Enter/Space keys
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1_

- [x] 4.4 Add size variants to EventCard
  - Implement size prop with 'default' and 'compact' options
  - Default: px-4 py-5 rounded-2xl (current size)
  - Compact: px-3 py-4 rounded-xl text-sm (for dashboard)
  - Adjust spacing and font sizes based on size prop
  - _Requirements: 1.1, 1.4, 10.1_

- [x] 5. Create EventDetailModal component
  - Create `components/calendar/event-detail-modal.tsx` file
  - Define EventDetailModalProps interface
  - Implement Dialog component with sm:max-w-[600px]
  - Add DialogHeader with event title and category badge
  - Display formatted time range and location
  - _Requirements: 3.1, 3.2, 3.7, 6.1, 6.2_

- [x] 5.1 Add event details sections to modal
  - Display full description with proper line breaks and formatting
  - Add collapsible reasoning section with chevron icon
  - Show cost if available with currency formatting
  - Add section separators between content areas
  - Use space-y-6 for section spacing
  - _Requirements: 3.2, 3.3, 3.4, 5.3_

- [x] 5.2 Add participants section to modal
  - Fetch fresh participant data when modal opens
  - Use useClerkUsers hook for avatar data
  - Display participants in grid layout (grid-cols-4 or auto-fill)
  - Show avatar with name below each participant
  - Add loading skeleton while fetching Clerk data
  - _Requirements: 3.5, 4.1, 4.2, 5.1, 8.1, 8.2_

- [x] 5.3 Add Join button to modal
  - Display Join/Joined button with same logic as EventCard
  - Call onJoin callback when clicked
  - Show loading state during join action
  - Update participant list after successful join
  - Display toast notification on success or error
  - _Requirements: 3.6, 4.1, 4.2, 4.3, 5.2, 8.3_

- [x] 5.4 Add accessibility features to modal
  - Implement focus trap within modal
  - Return focus to trigger element on close
  - Support Escape key to close
  - Add proper ARIA labels for all sections
  - Use proper heading hierarchy (h2 for title, h3 for sections)
  - Add aria-label to close button
  - _Requirements: 6.4, 6.5_

- [x] 6. Refactor TimeSlotEventsSection to use EventCard
  - Import EventCard component
  - Add state for selectedEventId and selectedEvent
  - Replace inline card rendering with EventCard component mapping
  - Pass event data, onJoin, onClick, and isJoining props to EventCard
  - Implement onClick handler to set selectedEventId
  - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6.1 Add EventDetailModal to TimeSlotEventsSection
  - Import EventDetailModal component
  - Add modal state management (open/close)
  - Pass selectedEvent to modal as prop
  - Implement onOpenChange handler to clear selectedEventId
  - Pass onJoin callback to modal
  - Update events state when join succeeds in modal
  - _Requirements: 2.4, 3.7, 7.3, 7.4, 8.3, 8.4_

- [x] 6.2 Remove duplicate code from TimeSlotEventsSection
  - Remove inline formatEventTime function (use utility)
  - Remove inline getInitials function (use utility)
  - Remove inline card JSX (replaced by EventCard)
  - Clean up unused imports
  - Verify all functionality still works
  - _Requirements: 7.4, 7.5_

- [ ]* 7. Add activity suggestions to dashboard
  - Create `components/dashboard/activity-suggestions-section.tsx`
  - Fetch activity suggestions for user's groups from API
  - Display top 3 suggestions using EventCard with size="compact"
  - Add "View All" button to see more suggestions
  - Implement EventDetailModal for dashboard cards
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 7.1 Create API endpoint for dashboard suggestions
  - Create `/api/dashboard/activity-suggestions/route.ts`
  - Fetch user's groups from database
  - Query activity suggestions for all user's groups
  - Filter to upcoming suggestions (startTime > now)
  - Sort by startTime ascending
  - Return top 10 suggestions with participant data
  - _Requirements: 10.1, 10.2_

- [ ]* 7.2 Integrate activity suggestions into dashboard
  - Import ActivitySuggestionsSection in DashboardContent
  - Add section below groups list
  - Pass user ID and groups to component
  - Handle join event action from dashboard
  - Show loading state while fetching suggestions
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 8. Write component tests
  - Test EventCard renders correctly with all props
  - Test EventCard click handler and hover effects
  - Test EventCard Join button functionality
  - Test EventDetailModal renders all sections
  - Test EventDetailModal join action
  - Test useClerkUsers hook fetching and caching
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 4.1, 5.1_

- [ ]* 8.1 Test EventCard component
  - Test renders with event data (title, location, category, time)
  - Test displays participant avatars with Clerk data
  - Test Join button shows correct state (Join/Joined/Joining)
  - Test onClick handler is called with event ID
  - Test click on Join button doesn't trigger card onClick
  - Test keyboard navigation (Enter/Space keys)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.1_

- [ ]* 8.2 Test EventDetailModal component
  - Test renders all event details (description, reasoning, cost)
  - Test displays participants with Clerk avatars
  - Test Join button functionality
  - Test modal closes on Escape key
  - Test focus management (trap and return)
  - Test refetches data when opened
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1_

- [ ]* 8.3 Test useClerkUsers hook
  - Test fetches users from API correctly
  - Test caches results with 5-minute TTL
  - Test batches multiple requests
  - Test handles errors gracefully
  - Test returns loading and error states
  - _Requirements: 4.1, 4.2, 4.5, 9.1, 9.2, 9.3_

- [ ]* 9. Performance testing and optimization
  - Test Clerk API batching with multiple cards
  - Verify caching reduces API calls
  - Test modal lazy loading
  - Measure render performance with many events
  - Optimize re-renders with React.memo if needed
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
