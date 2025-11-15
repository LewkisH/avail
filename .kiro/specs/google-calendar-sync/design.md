# Design Document: Google Calendar Sync

## Overview

The Google Calendar Sync feature enables bidirectional synchronization between the Avails calendar system and Google Calendar. Users can connect their Google Calendar account via OAuth 2.0, and the system will automatically sync time slots in both directions:

- **Avails → Google**: Time slots created, updated, or deleted in Avails are reflected in Google Calendar
- **Google → Avails**: Events from Google Calendar are imported as time slots in Avails

The system leverages the existing `CalendarEvent` model and extends it with Google Calendar integration. The architecture follows a service-oriented approach with a dedicated `GoogleCalendarService` that handles OAuth authentication, API interactions, and synchronization logic.

## Architecture

### Technology Stack
- **OAuth 2.0**: Google OAuth for authentication and authorization
- **Google Calendar API v3**: For calendar operations
- **googleapis npm package**: Official Google API client for Node.js
- **Existing Stack**: Next.js, Prisma, PostgreSQL, TypeScript

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Calendar Page│  │ Google Cal   │  │ Sync Status      │  │
│  │              │  │ Connect UI   │  │ Component        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/calendar/google/connect                        │   │
│  │  /api/calendar/google/callback                       │   │
│  │  /api/calendar/google/disconnect                     │   │
│  │  /api/calendar/google/sync                           │   │
│  │  /api/calendar/google/status                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GoogleCalendarService                               │   │
│  │  - OAuth flow management                             │   │
│  │  - Token refresh logic                               │   │
│  │  - Event sync (bidirectional)                        │   │
│  │  - Conflict resolution                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CalendarService (existing)                          │   │
│  │  - Extended with sync hooks                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┐
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Prisma Client                                       │   │
│  │  - CalendarEvent (existing, extended)                │   │
│  │  - GoogleCalendarToken (existing)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                External Services                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Google Calendar API v3                              │   │
│  │  - OAuth 2.0 endpoints                               │   │
│  │  - Calendar events CRUD                              │   │
│  │  - Push notifications (webhooks)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Synchronization Flow

#### Avails → Google Calendar (Push)
```
User Action (Create/Update/Delete) 
  → CalendarService hook
  → GoogleCalendarService.syncToGoogle()
  → Google Calendar API call
  → Update sourceId in database
```

#### Google Calendar → Avails (Pull)
```
Manual Sync Trigger / Scheduled Job
  → GoogleCalendarService.syncFromGoogle()
  → Fetch events from Google Calendar API
  → Compare with existing CalendarEvents
  → Create/Update/Delete in Avails database
```

## Components and Interfaces

### 1. Google Calendar Service

**File**: `lib/services/google-calendar.service.ts`

Core service for all Google Calendar operations.

```typescript
export class GoogleCalendarService {
  /**
   * Generate OAuth URL for Google Calendar connection
   * @param userId - User ID for state parameter
   * @returns OAuth authorization URL
   */
  static generateAuthUrl(userId: string): string;

  /**
   * Handle OAuth callback and store tokens
   * @param code - Authorization code from Google
   * @param userId - User ID
   * @returns Success status
   */
  static async handleOAuthCallback(
    code: string,
    userId: string
  ): Promise<{ success: boolean }>;

  /**
   * Disconnect Google Calendar and revoke tokens
   * @param userId - User ID
   */
  static async disconnect(userId: string): Promise<void>;

  /**
   * Get authenticated Google Calendar client
   * @param userId - User ID
   * @returns Authenticated calendar client
   */
  static async getCalendarClient(userId: string): Promise<calendar_v3.Calendar>;

  /**
   * Refresh access token if expired
   * @param userId - User ID
   */
  static async refreshTokenIfNeeded(userId: string): Promise<void>;

  /**
   * Sync a time slot from Avails to Google Calendar (create)
   * @param userId - User ID
   * @param timeSlot - Time slot data
   * @returns Google Calendar event ID
   */
  static async createEventInGoogle(
    userId: string,
    timeSlot: CalendarEvent
  ): Promise<string>;

  /**
   * Update a time slot in Google Calendar
   * @param userId - User ID
   * @param timeSlot - Updated time slot data
   */
  static async updateEventInGoogle(
    userId: string,
    timeSlot: CalendarEvent
  ): Promise<void>;

  /**
   * Delete a time slot from Google Calendar
   * @param userId - User ID
   * @param googleEventId - Google Calendar event ID
   */
  static async deleteEventInGoogle(
    userId: string,
    googleEventId: string
  ): Promise<void>;

  /**
   * Sync events from Google Calendar to Avails
   * @param userId - User ID
   * @param startDate - Start of sync range
   * @param endDate - End of sync range
   * @returns Sync statistics
   */
  static async syncFromGoogle(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
  }>;

  /**
   * Get connection status for a user
   * @param userId - User ID
   * @returns Connection status and last sync time
   */
  static async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    connectedAt?: Date;
    lastSyncAt?: Date;
    error?: string;
  }>;
}
```

### 2. Extended Calendar Service

**File**: `lib/services/calendar.service.ts` (modifications)

Add sync hooks to existing methods:

```typescript
export class CalendarService {
  // Existing methods...

  /**
   * Create a new time slot with Google Calendar sync
   */
  static async createTimeSlot(
    userId: string,
    data: TimeSlotData
  ) {
    // Create in database
    const timeSlot = await prisma.calendarEvent.create({...});

    // Sync to Google Calendar if connected
    try {
      const status = await GoogleCalendarService.getConnectionStatus(userId);
      if (status.connected) {
        const googleEventId = await GoogleCalendarService.createEventInGoogle(
          userId,
          timeSlot
        );
        // Update with Google event ID
        await prisma.calendarEvent.update({
          where: { id: timeSlot.id },
          data: { sourceId: googleEventId }
        });
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to sync to Google Calendar:', error);
    }

    return timeSlot;
  }

  /**
   * Update a time slot with Google Calendar sync
   */
  static async updateTimeSlot(
    timeSlotId: string,
    userId: string,
    data: Partial<TimeSlotData>
  ) {
    const timeSlot = await prisma.calendarEvent.findUnique({
      where: { id: timeSlotId }
    });

    // Update in database
    const updated = await prisma.calendarEvent.update({...});

    // Sync to Google Calendar if it's a manual event with sourceId
    if (timeSlot.source === 'manual' && timeSlot.sourceId) {
      try {
        await GoogleCalendarService.updateEventInGoogle(userId, updated);
      } catch (error) {
        console.error('Failed to sync update to Google Calendar:', error);
      }
    }

    return updated;
  }

  /**
   * Delete a time slot with Google Calendar sync
   */
  static async deleteTimeSlot(
    timeSlotId: string,
    userId: string
  ) {
    const timeSlot = await prisma.calendarEvent.findUnique({
      where: { id: timeSlotId }
    });

    // Delete from Google Calendar if it's a manual event with sourceId
    if (timeSlot.source === 'manual' && timeSlot.sourceId) {
      try {
        await GoogleCalendarService.deleteEventInGoogle(
          userId,
          timeSlot.sourceId
        );
      } catch (error) {
        console.error('Failed to delete from Google Calendar:', error);
      }
    }

    // Delete from database
    return await prisma.calendarEvent.delete({
      where: { id: timeSlotId }
    });
  }
}
```

### 3. API Routes

**File**: `app/api/calendar/google/connect/route.ts`

```typescript
// GET /api/calendar/google/connect
// Initiates OAuth flow
// Returns: { authUrl: string }
```

**File**: `app/api/calendar/google/callback/route.ts`

```typescript
// GET /api/calendar/google/callback?code=...&state=...
// Handles OAuth callback
// Redirects to calendar page with success/error
```

**File**: `app/api/calendar/google/disconnect/route.ts`

```typescript
// POST /api/calendar/google/disconnect
// Disconnects Google Calendar
// Returns: { success: boolean }
```

**File**: `app/api/calendar/google/sync/route.ts`

```typescript
// POST /api/calendar/google/sync
// Body: { startDate?: string, endDate?: string }
// Triggers manual sync from Google Calendar
// Returns: { created: number, updated: number, deleted: number }
```

**File**: `app/api/calendar/google/status/route.ts`

```typescript
// GET /api/calendar/google/status
// Returns connection status
// Returns: { connected: boolean, connectedAt?: string, lastSyncAt?: string }
```

### 4. UI Components

**File**: `components/calendar/google-calendar-connect.tsx`

```typescript
interface GoogleCalendarConnectProps {
  onConnect: () => void;
}

// Responsibilities:
// - Display connection button
// - Show bidirectional sync information dialog
// - Handle OAuth flow initiation
```

**File**: `components/calendar/google-calendar-status.tsx`

```typescript
interface GoogleCalendarStatusProps {
  status: {
    connected: boolean;
    connectedAt?: Date;
    lastSyncAt?: Date;
    error?: string;
  };
  onSync: () => void;
  onDisconnect: () => void;
}

// Responsibilities:
// - Display connection status
// - Show last sync time
// - Provide manual sync button
// - Provide disconnect button
// - Display sync errors if any
```

**File**: `components/calendar/sync-info-dialog.tsx`

```typescript
interface SyncInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

// Responsibilities:
// - Explain bidirectional sync
// - List what will be synced
// - Confirm user understanding before OAuth
```

## Data Models

### Existing Models (No Changes Needed)

The existing `GoogleCalendarToken` and `CalendarEvent` models already support the required functionality:

```prisma
model GoogleCalendarToken {
  id           String   @id @default(uuid())
  userId       String   @unique
  accessToken  String   @db.Text
  refreshToken String   @db.Text
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model CalendarEvent {
  id          String      @id @default(uuid())
  userId      String
  title       String
  description String?     @db.Text
  startTime   DateTime
  endTime     DateTime
  timezone    String
  location    String?
  source      EventSource  // 'google' or 'manual'
  sourceId    String?      // Google Calendar event ID
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startTime])
  @@index([userId])
  @@index([sourceId])  // Add this index for efficient lookups
}
```

### Data Flow

#### When User Creates Time Slot in Avails:
1. Create `CalendarEvent` with `source: 'manual'`, `sourceId: null`
2. Call Google Calendar API to create event
3. Update `CalendarEvent` with `sourceId: <google_event_id>`

#### When Syncing from Google Calendar:
1. Fetch events from Google Calendar API
2. For each event:
   - Check if `CalendarEvent` exists with matching `sourceId`
   - If not exists: Create new `CalendarEvent` with `source: 'google'`, `sourceId: <google_event_id>`
   - If exists: Update existing `CalendarEvent`
3. Delete `CalendarEvent`s with `source: 'google'` that no longer exist in Google Calendar

## OAuth 2.0 Flow

### Initial Connection

```
1. User clicks "Connect Google Calendar"
2. Show sync info dialog explaining bidirectional sync
3. User confirms understanding
4. Frontend calls GET /api/calendar/google/connect
5. Backend generates OAuth URL with scopes:
   - https://www.googleapis.com/auth/calendar.events
   - https://www.googleapis.com/auth/calendar.readonly
6. Redirect user to Google OAuth consent screen
7. User grants permissions
8. Google redirects to /api/calendar/google/callback?code=...
9. Backend exchanges code for tokens
10. Store tokens in GoogleCalendarToken table
11. Redirect to /calendar with success message
12. Trigger initial sync from Google Calendar
```

### Token Refresh

```
1. Before each API call, check if token is expired
2. If expired (expiresAt < now):
   - Use refresh token to get new access token
   - Update GoogleCalendarToken with new access token and expiry
3. Proceed with API call
```

### Environment Variables

```env
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=<app_url>/api/calendar/google/callback
```

## Synchronization Strategy

### Sync Triggers

1. **Manual Sync**: User clicks "Sync Now" button
2. **Automatic Sync on Connect**: When user first connects Google Calendar
3. **Post-Operation Sync**: After creating/updating/deleting time slots in Avails
4. **Scheduled Sync** (Future Enhancement): Periodic background job

### Sync Logic

#### From Google to Avails

```typescript
async syncFromGoogle(userId: string, startDate: Date, endDate: Date) {
  // 1. Fetch events from Google Calendar
  const googleEvents = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });

  // 2. Fetch existing Avails events with source='google'
  const availsEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      source: 'google',
      startTime: { gte: startDate },
      endTime: { lte: endDate }
    }
  });

  // 3. Create map of sourceId -> CalendarEvent
  const availsEventMap = new Map(
    availsEvents.map(e => [e.sourceId, e])
  );

  // 4. Process Google events
  const googleEventIds = new Set<string>();
  let created = 0, updated = 0;

  for (const gEvent of googleEvents.items) {
    googleEventIds.add(gEvent.id);
    const existingEvent = availsEventMap.get(gEvent.id);

    if (!existingEvent) {
      // Create new event
      await prisma.calendarEvent.create({
        data: {
          userId,
          title: gEvent.summary || 'Untitled',
          description: gEvent.description,
          startTime: new Date(gEvent.start.dateTime || gEvent.start.date),
          endTime: new Date(gEvent.end.dateTime || gEvent.end.date),
          timezone: gEvent.start.timeZone || 'UTC',
          location: gEvent.location,
          source: 'google',
          sourceId: gEvent.id
        }
      });
      created++;
    } else {
      // Update existing event if changed
      const needsUpdate = 
        existingEvent.title !== (gEvent.summary || 'Untitled') ||
        existingEvent.startTime.getTime() !== new Date(gEvent.start.dateTime || gEvent.start.date).getTime() ||
        existingEvent.endTime.getTime() !== new Date(gEvent.end.dateTime || gEvent.end.date).getTime();

      if (needsUpdate) {
        await prisma.calendarEvent.update({
          where: { id: existingEvent.id },
          data: {
            title: gEvent.summary || 'Untitled',
            description: gEvent.description,
            startTime: new Date(gEvent.start.dateTime || gEvent.start.date),
            endTime: new Date(gEvent.end.dateTime || gEvent.end.date),
            timezone: gEvent.start.timeZone || 'UTC',
            location: gEvent.location
          }
        });
        updated++;
      }
    }
  }

  // 5. Delete events that no longer exist in Google Calendar
  const deletedEvents = availsEvents.filter(
    e => !googleEventIds.has(e.sourceId!)
  );
  let deleted = 0;

  for (const event of deletedEvents) {
    await prisma.calendarEvent.delete({
      where: { id: event.id }
    });
    deleted++;
  }

  return { created, updated, deleted };
}
```

### Conflict Resolution

- **Source of Truth**: The system that made the most recent change
- **Manual Events**: Events created in Avails (`source: 'manual'`) are pushed to Google but never overwritten by Google sync
- **Google Events**: Events from Google (`source: 'google'`) can be updated or deleted by Google sync
- **Deletion**: 
  - Deleting a manual event in Avails deletes it from Google
  - Deleting an event in Google deletes it from Avails (if source='google')
  - Manual events in Avails are never deleted by Google sync

## Error Handling

### OAuth Errors

- **Invalid Grant**: Token expired or revoked → Prompt user to reconnect
- **Access Denied**: User denied permissions → Show message, allow retry
- **Network Error**: Temporary failure → Retry with exponential backoff

### API Errors

- **401 Unauthorized**: Token invalid → Attempt refresh, if fails prompt reconnect
- **403 Forbidden**: Insufficient permissions → Show error, prompt reconnect
- **404 Not Found**: Event doesn't exist → Skip and continue (already deleted)
- **429 Rate Limit**: Too many requests → Implement exponential backoff
- **500 Server Error**: Google API issue → Retry up to 3 times, then log and notify user

### Sync Errors

- **Partial Sync Failure**: Some events fail → Log errors, continue with others, show summary
- **Complete Sync Failure**: All operations fail → Show error message, suggest manual retry
- **Token Refresh Failure**: Can't refresh token → Mark as disconnected, prompt reconnect

### Error Logging

```typescript
interface SyncError {
  userId: string;
  operation: 'create' | 'update' | 'delete' | 'sync';
  eventId?: string;
  error: string;
  timestamp: Date;
}

// Log to console and optionally to database for monitoring
```

## Security Considerations

### Token Storage

- Store tokens encrypted in database (use Prisma's `@db.Text` for long tokens)
- Never expose tokens in API responses
- Implement token rotation on refresh

### API Access

- All Google Calendar API routes require authentication
- Verify user owns the calendar events being modified
- Implement rate limiting to prevent abuse

### OAuth Scopes

Request minimal necessary scopes:
- `https://www.googleapis.com/auth/calendar.events` - Read/write calendar events
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar metadata

### Data Privacy

- Only sync events from user's primary calendar
- Don't sync sensitive event details unless necessary
- Allow users to disconnect and delete all synced data

## Testing Strategy

### Unit Tests

- `GoogleCalendarService` methods with mocked Google API client
- Token refresh logic
- Sync logic with various scenarios (create, update, delete)
- Error handling for different API error codes

### Integration Tests

- OAuth flow end-to-end
- Sync from Google to Avails
- Sync from Avails to Google
- Disconnect and cleanup

### Manual Testing Scenarios

1. Connect Google Calendar and verify initial sync
2. Create event in Avails, verify it appears in Google Calendar
3. Update event in Avails, verify update in Google Calendar
4. Delete event in Avails, verify deletion in Google Calendar
5. Create event in Google Calendar, sync, verify it appears in Avails
6. Update event in Google Calendar, sync, verify update in Avails
7. Delete event in Google Calendar, sync, verify deletion in Avails
8. Disconnect Google Calendar, verify tokens are revoked
9. Test token refresh after expiration
10. Test error scenarios (network failure, invalid token, etc.)

## Performance Considerations

### Sync Optimization

- Sync only date ranges that are visible or relevant (e.g., ±3 months)
- Implement pagination for large event lists
- Use incremental sync with `syncToken` (Google Calendar API feature)
- Cache sync results to avoid redundant API calls

### Rate Limiting

- Google Calendar API has quotas (10,000 requests/day for free tier)
- Implement request batching where possible
- Add exponential backoff for rate limit errors
- Consider implementing a sync queue for high-volume users

### Database Optimization

- Add index on `sourceId` for efficient lookups
- Use transactions for batch operations
- Implement soft deletes for audit trail (optional)

## Future Enhancements

1. **Webhook Support**: Use Google Calendar push notifications instead of polling
2. **Multiple Calendar Support**: Allow syncing with multiple Google Calendars
3. **Selective Sync**: Let users choose which calendars to sync
4. **Sync History**: Track sync operations for debugging
5. **Conflict Resolution UI**: Allow users to resolve conflicts manually
6. **Background Sync Job**: Periodic automatic sync via cron job
7. **Sync Settings**: Customize sync behavior (frequency, date range, etc.)
8. **Calendar Sharing**: Share Avails calendar as read-only Google Calendar

## Implementation Notes

### Package Installation

```bash
npm install googleapis
npm install --save-dev @types/google.auth
```

### Google Cloud Console Setup

1. Create project in Google Cloud Console
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `<app_url>/api/calendar/google/callback`
5. Copy Client ID and Client Secret to environment variables

### Calendar Page Updates

Add Google Calendar status and controls to the existing calendar page:

```tsx
// app/calendar/page.tsx
<div className="mb-4">
  <GoogleCalendarStatus
    status={connectionStatus}
    onSync={handleSync}
    onDisconnect={handleDisconnect}
  />
</div>
```

### Migration Considerations

- No database migrations needed (schema already supports this)
- Add index on `CalendarEvent.sourceId` for performance
- Existing manual events will work without changes
