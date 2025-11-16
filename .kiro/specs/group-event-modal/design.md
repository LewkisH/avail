# Design Document

## Architecture Overview

The Group Event Modal feature consists of three main layers:

1. **UI Components Layer**: React components for the modal, event cards, and availability display
2. **API Layer**: Next.js API routes for fetching activity suggestions and managing event interests
3. **Data Layer**: Prisma models for ActivitySuggestion, GroupEventInterest, and related entities

## Component Structure

```
components/calendar/
├── time-slot-modal.tsx              # Main modal container
├── time-slot-events-section.tsx     # Events display with cards
└── time-slot-availability-section.tsx # Availability display
```

## Data Flow

### Opening the Modal

1. User clicks on a time slot in the group availability view
2. Parent component passes time slot data, group ID, and user ID to TimeSlotModal
3. Modal fetches activity suggestions and availability data via API
4. Data is rendered in the events and availability sections

### Joining an Event

1. User clicks "Join" button on an event card
2. Component calls onJoinEvent callback with activity suggestion ID
3. Parent component calls API to create GroupEventInterest record
4. API returns updated participant list
5. Component updates local state to show "Joined" and add user avatar

## Database Schema

### ActivitySuggestion Model

```prisma
model ActivitySuggestion {
  id              String   @id @default(uuid())
  groupId         String
  externalEventId String?
  title           String
  description     String   @db.Text
  location        String?
  category        String?
  startTime       DateTime
  endTime         DateTime
  cost            Decimal? @db.Decimal(10, 2)
  reasoning       String   @db.Text
  createdAt       DateTime @default(now())

  group         Group                @relation(...)
  externalEvent ExternalEvent?       @relation(...)
  interests     GroupEventInterest[]
}
```

### GroupEventInterest Model

```prisma
model GroupEventInterest {
  id                   String   @id @default(uuid())
  activitySuggestionId String
  userId               String
  createdAt            DateTime @default(now())

  activitySuggestion ActivitySuggestion @relation(...)

  @@unique([activitySuggestionId, userId])
}
```

## API Endpoints

### GET /api/groups/[groupId]/time-slots/[timeSlotId]/events

Fetches activity suggestions and availability for a time slot.

**Request:**
- Path params: groupId, timeSlotId (or startTime/endTime as query params)
- Query params: startTime, endTime

**Response:**
```typescript
{
  activitySuggestions: Array<{
    id: string;
    title: string;
    location: string | null;
    category: string | null;
    startTime: string;
    endTime: string;
    participants: Array<{
      id: string;
      name: string;
      imageUrl: string | null;
    }>;
    hasJoined: boolean;
  }>;
  availability: Array<{
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
    isAvailable: boolean;
  }>;
}
```

### POST /api/groups/[groupId]/activity-suggestions/[suggestionId]/join

Creates a GroupEventInterest record for the current user.

**Request:**
- Path params: groupId, suggestionId
- Body: (empty, user ID from auth)

**Response:**
```typescript
{
  success: boolean;
  participants: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
  }>;
}
```

### DELETE /api/groups/[groupId]/activity-suggestions/[suggestionId]/leave

Removes a GroupEventInterest record for the current user.

**Request:**
- Path params: groupId, suggestionId

**Response:**
```typescript
{
  success: boolean;
}
```

## Component Interfaces

### TimeSlotModal

```typescript
interface TimeSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  } | null;
  groupId: string;
  userId: string;
}
```

### TimeSlotEventsSection

```typescript
interface GroupEvent {
  id: string;
  title: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  category: string;
  participants: EventParticipant[];
  hasJoined?: boolean;
}

interface EventParticipant {
  id: string;
  name: string;
  imageUrl?: string;
}

interface TimeSlotEventsSectionProps {
  events: GroupEvent[];
  onJoinEvent?: (eventId: string) => void;
}
```

### TimeSlotAvailabilitySection

```typescript
interface UserAvailability {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface TimeSlotAvailabilitySectionProps {
  availability: UserAvailability[];
}
```

## State Management

### Modal State

The modal manages the following state:
- `isLoading`: Boolean for loading state
- `events`: Array of GroupEvent objects
- `availability`: Array of UserAvailability objects
- `error`: Error message if data fetching fails

### Event Card State

Each event card tracks:
- `hasJoined`: Whether current user has joined
- `isJoining`: Loading state for join action
- `participants`: Array of participant data

## Styling Approach

### Event Card Styling

Following the Figma design:
- Container: `px-6 py-7 rounded-2xl flex flex-col gap-4 bg-card border`
- Category badge: `px-2 py-2 bg-neutral-800/50 rounded-2xl backdrop-blur-[3px]`
- Title: `text-white text-xl font-semibold leading-6`
- Time: `text-neutral-300 text-base font-medium leading-6`
- Avatar ring: `ring-2 ring-background`
- Join button: `min-h-9 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg`

### Availability Section Styling

- Available icon: `text-green-600 dark:text-green-400`
- Unavailable icon: `text-red-600 dark:text-red-400`
- Unavailable users: `opacity-60`
- User row: `hover:bg-accent/50 transition-colors`

## Time Formatting Logic

```typescript
function formatEventTime(startTime: Date, endTime: Date): string {
  const formatTime = (date: Date) => format(date, 'HH:mm');
  
  if (isToday(startTime)) {
    return `Today ${formatTime(startTime)}-${formatTime(endTime)}`;
  } else if (isTomorrow(startTime)) {
    return `Tomorrow ${formatTime(startTime)}-${formatTime(endTime)}`;
  } else {
    return `${format(startTime, 'd MMM')} ${formatTime(startTime)}-${formatTime(endTime)}`;
  }
}
```

## Availability Calculation Logic

```typescript
async function calculateAvailability(
  groupId: string,
  startTime: Date,
  endTime: Date
): Promise<UserAvailability[]> {
  // 1. Get all group members
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true }
  });

  // 2. For each member, check for overlapping calendar events
  const availability = await Promise.all(
    members.map(async (member) => {
      const busyEvents = await prisma.calendarEvent.findMany({
        where: {
          userId: member.userId,
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } }
              ]
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } }
              ]
            }
          ]
        }
      });

      return {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        imageUrl: member.user.imageUrl,
        isAvailable: busyEvents.length === 0
      };
    })
  );

  return availability;
}
```

## Error Handling

### API Errors

- 401 Unauthorized: User not authenticated
- 403 Forbidden: User not a member of the group
- 404 Not Found: Group or activity suggestion not found
- 409 Conflict: User already joined the event
- 500 Internal Server Error: Database or server error

### UI Error States

- Display toast notifications for join/leave errors
- Show error message in modal if data fetching fails
- Gracefully handle missing data fields with fallbacks

## Performance Considerations

1. **Data Fetching**: Fetch activity suggestions and availability in parallel
2. **Avatar Loading**: Use lazy loading for avatar images
3. **Participant Limit**: Limit visible avatars to 10, show "+N more" indicator
4. **Debouncing**: Debounce join button clicks to prevent duplicate requests
5. **Caching**: Consider caching activity suggestions for recently viewed time slots

## Accessibility

1. **Keyboard Navigation**: Modal can be closed with Escape key
2. **Focus Management**: Focus returns to trigger element when modal closes
3. **Screen Readers**: Proper ARIA labels for buttons and sections
4. **Color Contrast**: Ensure text meets WCAG AA standards
5. **Touch Targets**: Minimum 44x44px touch targets for mobile

## Future Enhancements

1. **Real-time Updates**: WebSocket or polling for live participant updates
2. **Event Details**: Expand cards to show full description and reasoning
3. **Leave Event**: Allow users to leave events they've joined
4. **Event Creation**: Add button to create new activity suggestions from modal
5. **Notifications**: Notify users when someone joins their event
