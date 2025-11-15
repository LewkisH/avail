# Implementation Plan

- [x] 1. Update the syncFromGoogle query to fetch events by sourceId instead of source
  - Modify the Prisma query in `GoogleCalendarService.syncFromGoogle()` to fetch all events with `sourceId != null` instead of filtering by `source: EventSource.google`
  - This ensures manually created events that have been synced to Google are included in the matching logic
  - _Requirements: 1.2, 2.2_

- [x] 2. Update the deletion logic for bidirectional sync
  - Modify the deletion filter to remove the `source === EventSource.google` condition
  - Ensure any event with a sourceId that's no longer in Google Calendar gets deleted, regardless of its source attribute
  - _Requirements: 3.2, 3.3_

- [x] 3. Add logging for duplicate prevention
  - Add console.log statement when an existing event is found during sync to track duplicate prevention
  - Include event id, source, and sourceId in the log output
  - _Requirements: 4.2_
