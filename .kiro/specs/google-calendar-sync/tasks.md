# Implementation Plan

- [x] 1. Set up Google Calendar API infrastructure
  - Install googleapis npm package and TypeScript types
  - Add Google OAuth environment variables to .env.example
  - Create OAuth configuration utility for Google Calendar API
  - _Requirements: 1.1, 1.2, 1.5, 1.6_

- [x] 2. Implement GoogleCalendarService core functionality
  - [x] 2.1 Create GoogleCalendarService class with OAuth methods
    - Write generateAuthUrl() method to create OAuth authorization URL
    - Write handleOAuthCallback() method to exchange code for tokens
    - Write disconnect() method to revoke tokens and clean up database
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 2.2 Implement token management methods
    - Write getCalendarClient() method to create authenticated Google Calendar client
    - Write refreshTokenIfNeeded() method to handle token expiration
    - Write getConnectionStatus() method to check connection state
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 2.3 Implement Avails to Google sync methods
    - Write createEventInGoogle() method to create events in Google Calendar
    - Write updateEventInGoogle() method to update events in Google Calendar
    - Write deleteEventInGoogle() method to delete events from Google Calendar
    - Add retry logic with exponential backoff for API failures
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 2.4 Implement Google to Avails sync methods
    - Write syncFromGoogle() method to fetch and sync events from Google Calendar
    - Implement create logic for new Google Calendar events
    - Implement update logic for modified Google Calendar events
    - Implement delete logic for removed Google Calendar events
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4_

- [x] 3. Extend CalendarService with sync hooks
  - [x] 3.1 Modify createTimeSlot() to sync to Google Calendar
    - Add Google Calendar sync call after creating time slot in database
    - Update CalendarEvent with sourceId after successful Google sync
    - Add error handling to log failures without breaking time slot creation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 3.2 Modify updateTimeSlot() to sync to Google Calendar
    - Add Google Calendar sync call after updating time slot in database
    - Only sync manual events that have sourceId (already synced)
    - Add error handling to log failures without breaking time slot update
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 3.3 Modify deleteTimeSlot() to sync to Google Calendar
    - Add Google Calendar sync call before deleting time slot from database
    - Only sync manual events that have sourceId (already synced)
    - Add error handling to log failures without breaking time slot deletion
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Create Google Calendar API routes
  - [x] 4.1 Implement OAuth connection route
    - Create GET /api/calendar/google/connect route
    - Generate OAuth URL with appropriate scopes
    - Return authorization URL to client
    - _Requirements: 1.1, 1.5_
  
  - [x] 4.2 Implement OAuth callback route
    - Create GET /api/calendar/google/callback route
    - Handle authorization code exchange
    - Store tokens in database
    - Trigger initial sync from Google Calendar
    - Redirect to calendar page with success/error message
    - _Requirements: 1.6, 1.7, 1.8, 1.9, 1.10_
  
  - [x] 4.3 Implement disconnect route
    - Create POST /api/calendar/google/disconnect route
    - Revoke OAuth tokens with Google
    - Delete tokens from database
    - Return success response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.4 Implement manual sync route
    - Create POST /api/calendar/google/sync route
    - Accept optional date range parameters
    - Call syncFromGoogle() method
    - Return sync statistics (created, updated, deleted counts)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 4.5 Implement status route
    - Create GET /api/calendar/google/status route
    - Return connection status, connected date, and last sync time
    - Include error information if sync failures occurred
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5. Create UI components for Google Calendar integration
  - [x] 5.1 Create sync info dialog component
    - Build SyncInfoDialog component to explain bidirectional sync
    - Display information about Avails → Google sync
    - Display information about Google → Avails sync
    - Add confirmation button to proceed with OAuth
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 5.2 Create Google Calendar connect component
    - Build GoogleCalendarConnect component with connect button
    - Integrate SyncInfoDialog to show before OAuth
    - Handle OAuth flow initiation on confirmation
    - Display loading state during connection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 5.3 Create Google Calendar status component
    - Build GoogleCalendarStatus component to display connection state
    - Show "Connected" status with connection date when connected
    - Show "Not Connected" status when disconnected
    - Display last successful sync timestamp
    - Add manual sync button with loading state
    - Add disconnect button with confirmation
    - Display sync errors if present
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 2.1, 2.2_

- [x] 6. Integrate Google Calendar UI into calendar page
  - Add GoogleCalendarStatus component to calendar page
  - Add GoogleCalendarConnect component for non-connected users
  - Fetch and display connection status on page load
  - Handle sync completion and refresh calendar view
  - Add toast notifications for sync success/failure
  - _Requirements: 9.1, 9.2, 9.3, 1.1_

- [ ] 7. Add database index for performance
  - Add database index on CalendarEvent.sourceId field
  - Run Prisma migration to apply index
  - _Requirements: All (performance optimization)_

- [ ]* 8. Write tests for Google Calendar integration
  - [ ]* 8.1 Write unit tests for GoogleCalendarService
    - Test OAuth URL generation
    - Test token refresh logic
    - Test sync methods with mocked Google API client
    - Test error handling for various API error codes
    - _Requirements: All_
  
  - [ ]* 8.2 Write integration tests for API routes
    - Test OAuth flow end-to-end with test credentials
    - Test manual sync route
    - Test disconnect route
    - Test status route
    - _Requirements: All_
  
  - [ ]* 8.3 Write component tests for UI
    - Test SyncInfoDialog rendering and interactions
    - Test GoogleCalendarConnect component
    - Test GoogleCalendarStatus component with different states
    - _Requirements: 1.2, 1.3, 1.4, 9.1, 9.2, 9.3, 9.4, 9.5_
