# Design Document

## Overview

This feature calculates and displays group availability windows on the dashboard. The system analyzes calendar events from all group members to identify overlapping free time slots on a per-day basis. When users modify their calendars, the system recalculates only the affected day's availability. The frontend provides a self-contained component with a day picker and time slot display showing which members are available.

## Architecture

### High-Level Flow

1. User navigates to dashboard and selects a date
2. Frontend requests group availability for that specific date
3. Backend calculates availability by:
   - Fetching all group members' calendar events for the day
   - Finding overlapping free time windows
   - Prioritizing full-group availability over subgroups
   - Storing results in database
4. Frontend displays time slots with participant avatars
5. When calendar events change, system recalculates affected day's availability

### Database Schema Changes

Add new model for storing calculated group availability windows:

```prisma
model GroupAvailability {
  id          String   @id @default(uuid())
  groupId     String
  date        DateTime @db.Date
  startTime   DateTime
  endTime     DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  group        Group                      @relation(fields: [groupId], references: [id], onDelete: Cascade)
  participants GroupAvailabilityParticipant[]

  @@index([groupId, date])
  @@index([date])
}

model GroupAvailabilityParticipant {
  id                   String   @id @default(uuid())
  groupAvailabilityId  String
  userId               String

  groupAvailability GroupAvailability @relation(fields: [groupAvailabilityId], references: [id], onDelete: Cascade)
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupAvailabilityId, userId])
  @@index([groupAvailabilityId])
  @@index([userId])
}
```

Update User model to add relation:
```prisma
model User {
  // ... existing fields
  availabilityParticipations GroupAvailabilityParticipant[]
}
```

Update Group model to add relation:
```prisma
model Group {
  // ... existing fields
  availabilities GroupAvailability[]
}
```

## Components and Interfaces

### Backend Services

#### GroupAvailabilityService

New service for calculating and managing group availability windows.

```typescript
interface AvailabilityWindow {
  startTime: Date;
  endTime: Date;
  participantIds: string[];
}

interface CalculateAvailabilityParams {
  groupId: string;
  date: Date;
}

interface GetAvailabilityParams {
  groupId: string;
  date: Date;
  userId: string; // For filtering to user's availability
}

class GroupAvailabilityService {
  /**
   * Calculate and store group availability for a specific date
   * Analyzes all group members' calendars to find overlapping free time
   */
  static async calculateGroupAvailability(
    params: CalculateAvailabilityParams
  ): Promise<GroupAvailability[]>

  /**
   * Get stored availability windows for a group on a specific date
   * Filters to only show windows where the requesting user is available
   */
  static async getGroupAvailability(
    params: GetAvailabilityParams
  ): Promise<GroupAvailability[]>

  /**
   * Recalculate availability for all groups a user belongs to on a specific date
   * Called when user creates/updates/deletes calendar events
   */
  static async recalculateUserGroupsAvailability(
    userId: string,
    date: Date
  ): Promise<void>

  /**
   * Find free time windows by analyzing calendar events
   * Returns time ranges where specified users have no conflicts
   */
  private static async findFreeTimeWindows(
    userIds: string[],
    date: Date
  ): Promise<AvailabilityWindow[]>

  /**
   * Generate availability combinations prioritizing full group
   * Only creates subgroup combinations if full group isn't available
   */
  private static generateAvailabilityCombinations(
    allMemberIds: string[],
    freeTimeByUser: Map<string, TimeRange[]>
  ): AvailabilityWindow[]
}
```

#### CalendarService Updates

Extend existing CalendarService to trigger availability recalculation:

```typescript
class CalendarService {
  // ... existing methods

  /**
   * Hook to recalculate availability after calendar changes
   */
  private static async onCalendarEventChange(
    userId: string,
    affectedDates: Date[]
  ): Promise<void>
}
```

### API Endpoints

#### GET /api/groups/[id]/availability

Fetch group availability for a specific date.

**Query Parameters:**
- `date`: ISO date string (required)

**Response:**
```typescript
{
  groupId: string;
  date: string;
  windows: Array<{
    id: string;
    startTime: string;
    endTime: string;
    participants: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  }>;
}
```

#### POST /api/groups/[id]/availability/recalculate

Manually trigger recalculation for a specific date (admin/debugging).

**Body:**
```typescript
{
  date: string; // ISO date
}
```

### Frontend Components

#### GroupAvailabilityView

Self-contained component displaying group availability with day picker and time slots.

**Props:**
```typescript
interface GroupAvailabilityViewProps {
  groupId: string;
  initialDate?: Date;
}
```

**Component Structure:**
- Header with "Select the date you are available" text
- Horizontal scrollable day picker showing 2 weeks
- Time slot list showing available windows for selected date
- Each time slot displays:
  - Time range (e.g., "8:00 - 20:00")
  - Participant avatars

**State Management:**
```typescript
interface GroupAvailabilityState {
  selectedDate: Date;
  availabilityWindows: AvailabilityWindow[];
  loading: boolean;
  error: string | null;
}
```

#### DayPicker

Horizontal scrollable date selector component.

**Features:**
- Shows 14 days (configurable)
- Highlights selected date with orange background
- Shows day number and day name
- Navigation arrows for scrolling
- Auto-scrolls to current date on mount

#### TimeSlotRow

Individual time slot display component.

**Props:**
```typescript
interface TimeSlotRowProps {
  startTime: Date;
  endTime: Date;
  participants: User[];
  onClick?: () => void;
}
```

## Data Models

### GroupAvailability

Represents a calculated time window when group members are available.

**Fields:**
- `id`: Unique identifier
- `groupId`: Reference to group
- `date`: Date (without time) for the availability
- `startTime`: Start of availability window
- `endTime`: End of availability window
- `participants`: Array of users available during this window
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**Constraints:**
- Must have at least 2 participants
- `endTime` must be after `startTime`
- `startTime` and `endTime` must be on the same date as `date` field

### GroupAvailabilityParticipant

Junction table linking users to availability windows.

**Fields:**
- `id`: Unique identifier
- `groupAvailabilityId`: Reference to availability window
- `userId`: Reference to user

## Availability Calculation Algorithm

### Step 1: Fetch Calendar Events

For a given date and group:
1. Get all group members
2. Fetch each member's calendar events for that date
3. Organize events by user

### Step 2: Calculate Free Time Windows

For each user:
1. Start with full day (e.g., 00:00 - 23:59)
2. Subtract all calendar event time ranges
3. Result is list of free time windows for that user

### Step 3: Find Overlapping Free Time

1. Start with all group members
2. Find time ranges where ALL members are free
3. If full-group windows exist, use those
4. If no full-group windows, calculate subgroup combinations:
   - Try n-1 members
   - Try n-2 members
   - Stop at minimum 2 members

### Step 4: Store Results

1. Delete existing availability windows for that group/date
2. Create new GroupAvailability records
3. Create GroupAvailabilityParticipant records for each participant

### Optimization Considerations

- Cache calendar events during calculation to avoid repeated queries
- Use database transactions for atomic updates
- Index on (groupId, date) for fast lookups
- Consider batch processing for multiple dates

## Error Handling

### Backend Errors

**Calculation Failures:**
- Log error details
- Return empty availability array
- Don't block user calendar operations

**Database Errors:**
- Retry transient failures
- Log persistent errors
- Return cached data if available

**Invalid Data:**
- Validate date formats
- Ensure group exists
- Verify user membership

### Frontend Errors

**API Failures:**
- Display user-friendly error message
- Provide retry button
- Fall back to empty state

**Invalid Dates:**
- Default to current date
- Validate date selection
- Handle timezone edge cases

**Loading States:**
- Show skeleton loaders for time slots
- Disable interactions during loading
- Provide loading indicators

## Testing Strategy

### Unit Tests

**GroupAvailabilityService:**
- Test free time calculation with various event configurations
- Test combination generation logic
- Test edge cases (no events, all-day events, overlapping events)
- Test minimum participant filtering

**CalendarService Integration:**
- Test recalculation trigger on event create/update/delete
- Test date extraction from events
- Test multiple group handling

### Integration Tests

**API Endpoints:**
- Test GET /api/groups/[id]/availability with various dates
- Test filtering to current user's availability
- Test empty states (no availability)
- Test authorization (non-members can't access)

**Database Operations:**
- Test atomic updates during recalculation
- Test cascade deletes when group/user deleted
- Test concurrent recalculation requests

### Frontend Tests

**GroupAvailabilityView:**
- Test date selection updates time slots
- Test loading states
- Test empty states
- Test error states

**DayPicker:**
- Test date navigation
- Test selected date highlighting
- Test scrolling behavior

## Performance Considerations

### Database Queries

- Use indexes on (groupId, date) for fast lookups
- Batch fetch calendar events for all group members
- Use database-level date filtering

### Caching Strategy

- Cache availability windows for 5-15 minutes
- Invalidate cache on calendar event changes
- Consider Redis for distributed caching

### Frontend Optimization

- Lazy load availability data per date
- Prefetch adjacent dates on date selection
- Debounce rapid date changes
- Use React Query for data fetching and caching

## Future Enhancements

1. **Hangability Scoring**: Add scoring algorithm considering interests, past activities
2. **Activity Suggestions**: Link availability windows to suggested activities
3. **Recurring Availability**: Calculate patterns across multiple weeks
4. **Availability Preferences**: Let users set preferred times for hangouts
5. **Real-time Updates**: WebSocket notifications when availability changes
