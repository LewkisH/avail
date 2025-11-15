# Design Document

## Overview

The Calendar Selection and Filtering feature extends the existing Google Calendar integration by providing users with granular control over which calendars sync with Avails. This design introduces a new settings interface, database schema changes, and modifications to the sync logic to support multi-calendar selection.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Calendar Settings UI  │  Calendar View (Enhanced)          │
│  - Calendar List       │  - Event Color Coding              │
│  - Selection Controls  │  - Calendar Indicators             │
│  - Search/Filter       │  - Calendar Legend                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  /api/calendar/google/calendars                             │
│  - GET: Fetch available calendars                           │
│  - POST: Save calendar selections                           │
│                                                             │
│  /api/calendar/google/sync (Enhanced)                       │
│  - Sync from selected calendars only                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  GoogleCalendarService (Enhanced)                           │
│  - fetchUserCalendars()                                     │
│  - saveCalendarSelections()                                 │
│  - getSelectedCalendars()                                   │
│  - syncFromSelectedCalendars()                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  GoogleCalendarSelection (New Table)                        │
│  - userId, calendarId, calendarName, calendarColor          │
│                                                             │
│  CalendarEvent (Enhanced)                                   │
│  - Add: sourceCalendarId, sourceCalendarName                │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema Changes

#### New Table: GoogleCalendarSelection

```prisma
model GoogleCalendarSelection {
  id            String   @id @default(cuid())
  userId        String
  calendarId    String   // Google Calendar ID
  calendarName  String
  calendarColor String?
  isPrimary     Boolean  @default(false)
  isSelected    Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, calendarId])
  @@index([userId])
}
```

#### Enhanced Table: CalendarEvent

Add new fields:
```prisma
model CalendarEvent {
  // ... existing fields ...
  sourceCalendarId   String?  // Google Calendar ID
  sourceCalendarName String?  // Google Calendar Name
sourceCalendarColor String? // Google Calendar Colore
}
```

### 2. API Endpoints

#### GET /api/calendar/google/calendars

Fetches all available Google Calendars for the authenticated user.

**Response:**
```typescript
{
  calendars: [
    {
      id: string;
      name: string;
      description?: string;
      primary: boolean;
      backgroundColor: string;
      foregroundColor: string;
      accessRole: string;
      selected: boolean; // Based on user's saved selections
    }
  ]
}
```

#### POST /api/calendar/google/calendars

Saves user's calendar selection preferences.

**Request:**
```typescript
{
  selectedCalendarIds: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

### 3. Frontend Components

#### CalendarSettingsDialog Component

A dialog component for managing calendar selections.

**Props:**
```typescript
interface CalendarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}
```

**Features:**
- Displays list of available calendars with checkboxes
- Shows calendar colors and metadata
- Provides search/filter functionality
- Select All / Deselect All controls
- Save and Cancel buttons

#### CalendarLegend Component

Displays a legend showing which colors correspond to which calendars.

**Props:**
```typescript
interface CalendarLegendProps {
  calendars: {
    id: string;
    name: string;
    color: string;
  }[];
}
```

#### Enhanced CalendarView Component

Updates to show calendar indicators on events.

**Changes:**
- Add color-coded border or badge to events
- Show calendar name in event details
- Display calendar legend

### 4. Service Layer Methods

#### GoogleCalendarService Enhancements

```typescript
class GoogleCalendarService {
  /**
   * Fetch all calendars accessible to the user
   */
  static async fetchUserCalendars(userId: string): Promise<GoogleCalendar[]>;

  /**
   * Save user's calendar selection preferences
   */
  static async saveCalendarSelections(
    userId: string,
    selections: CalendarSelection[]
  ): Promise<void>;

  /**
   * Get user's selected calendars
   */
  static async getSelectedCalendars(userId: string): Promise<string[]>;

  /**
   * Sync events from selected calendars only
   */
  static async syncFromSelectedCalendars(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SyncStats>;
}
```

## Data Models

### GoogleCalendar Interface

```typescript
interface GoogleCalendar {
  id: string;
  name: string;
  description?: string;
  primary: boolean;
  backgroundColor: string;
  foregroundColor: string;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  selected: boolean;
}
```

### CalendarSelection Interface

```typescript
interface CalendarSelection {
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  isPrimary: boolean;
  isSelected: boolean;
}
```

### SyncStats Interface (Enhanced)

```typescript
interface SyncStats {
  created: number;
  updated: number;
  deleted: number;
  byCalendar: {
    [calendarId: string]: {
      name: string;
      created: number;
      updated: number;
      deleted: number;
    };
  };
}
```

## Error Handling

### Error Scenarios

1. **Calendar List Fetch Failure**
   - Display error toast
   - Provide retry button
   - Log error details

2. **Save Selection Failure**
   - Display error toast
   - Revert UI to previous state
   - Log error details

3. **No Calendars Selected**
   - Prevent save action
   - Display validation message
   - Highlight primary calendar

4. **Sync Failure for Specific Calendar**
   - Continue syncing other calendars
   - Log which calendar failed
   - Display partial success message

### Error Messages

```typescript
const ERROR_MESSAGES = {
  FETCH_CALENDARS_FAILED: 'Failed to load your Google Calendars. Please try again.',
  SAVE_SELECTIONS_FAILED: 'Failed to save calendar selections. Please try again.',
  NO_CALENDARS_SELECTED: 'Please select at least one calendar to sync.',
  SYNC_PARTIAL_FAILURE: 'Some calendars failed to sync. Check the logs for details.',
};
```

## Testing Strategy

### Unit Tests

1. **GoogleCalendarService Tests**
   - Test fetchUserCalendars with mock Google API responses
   - Test saveCalendarSelections with various selection combinations
   - Test getSelectedCalendars returns correct IDs
   - Test syncFromSelectedCalendars only syncs selected calendars

2. **API Route Tests**
   - Test GET /api/calendar/google/calendars returns calendar list
   - Test POST /api/calendar/google/calendars saves selections
   - Test validation for empty selections
   - Test error handling for API failures

### Integration Tests

1. **End-to-End Calendar Selection Flow**
   - User opens calendar settings
   - User selects/deselects calendars
   - User saves selections
   - Verify database is updated
   - Verify sync respects selections

2. **Multi-Calendar Sync Test**
   - Create events in multiple Google Calendars
   - Select specific calendars
   - Trigger sync
   - Verify only selected calendar events are synced
   - Verify calendar metadata is stored correctly

### Manual Testing Checklist

- [ ] Calendar list displays all user's calendars
- [ ] Primary calendar is selected by default
- [ ] Checkboxes update selection state correctly
- [ ] Search/filter works as expected
- [ ] Select All / Deselect All functions work
- [ ] Save persists selections to database
- [ ] Sync only fetches from selected calendars
- [ ] Event colors match calendar colors
- [ ] Calendar legend displays correctly
- [ ] Error states display appropriate messages

## Performance Considerations

### Optimization Strategies

1. **Calendar List Caching**
   - Cache calendar list for 1 hour
   - Invalidate cache on manual refresh
   - Reduce API calls to Google

2. **Batch Sync Operations**
   - Fetch events from multiple calendars in parallel
   - Use Promise.all for concurrent requests
   - Implement rate limiting to avoid API quotas

3. **Database Indexing**
   - Index on userId in GoogleCalendarSelection
   - Index on sourceCalendarId in CalendarEvent
   - Optimize queries for calendar filtering

4. **Frontend Performance**
   - Virtualize calendar list for users with many calendars
   - Debounce search input
   - Lazy load calendar settings dialog

## Security Considerations

1. **Authorization**
   - Verify user owns the Google Calendar connection
   - Validate calendar IDs belong to the authenticated user
   - Prevent unauthorized access to calendar selections

2. **Data Validation**
   - Validate calendar IDs format
   - Sanitize calendar names and descriptions
   - Prevent SQL injection in queries

3. **API Rate Limiting**
   - Implement rate limiting on calendar fetch endpoint
   - Prevent abuse of sync endpoint
   - Monitor API quota usage

## Migration Strategy

### Database Migration

1. Create GoogleCalendarSelection table
2. Add new fields to CalendarEvent table
3. Migrate existing users to have primary calendar selected by default
4. Backfill sourceCalendarId for existing events (set to 'primary')

### Rollout Plan

1. **Phase 1: Database Migration**
   - Run migration scripts
   - Verify data integrity

2. **Phase 2: Backend Deployment**
   - Deploy new API endpoints
   - Deploy enhanced sync logic
   - Monitor for errors

3. **Phase 3: Frontend Deployment**
   - Deploy calendar settings UI
   - Deploy enhanced calendar view
   - Enable feature flag

4. **Phase 4: User Communication**
   - Announce new feature
   - Provide documentation
   - Gather user feedback

## Future Enhancements

1. **Calendar-Specific Sync Rules**
   - Allow different sync frequencies per calendar
   - Enable/disable bidirectional sync per calendar

2. **Event Filtering Rules**
   - Filter by event type (busy/free)
   - Filter by event organizer
   - Filter by event keywords

3. **Calendar Groups**
   - Create calendar groups for easier management
   - Bulk operations on calendar groups

4. **Sync History**
   - Display sync history per calendar
   - Show last sync time per calendar
   - Provide sync logs for troubleshooting
