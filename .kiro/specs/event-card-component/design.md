# Design Document

## Overview

This design extracts the event card rendering logic from TimeSlotEventsSection into a reusable EventCard component with click-to-expand functionality. The component will integrate with Clerk's API to fetch real-time user avatars and display comprehensive event details in an expandable modal. This refactoring improves code maintainability and enables consistent event display across the dashboard and group views.

## Architecture

### Component Hierarchy

```
EventCard (new)
├── Avatar components (participants)
├── Join button
└── Click handler → EventDetailModal

EventDetailModal (new)
├── Event header (title, category, time)
├── Event details (description, reasoning, cost)
├── Participants section
└── Join/Joined button

TimeSlotEventsSection (refactored)
├── EventCard[] (mapped from events)
├── EventDetailModal (controlled by state)
└── AI Suggestions button

DashboardContent (enhanced)
└── ActivitySuggestionsSection (new)
    ├── EventCard[] (top 3 suggestions)
    └── EventDetailModal
```

## Component Design

### EventCard Component

**File:** `components/calendar/event-card.tsx`

**Props Interface:**
```typescript
interface EventCardProps {
  event: {
    id: string;
    title: string;
    description?: string;
    location?: string | null;
    startTime: Date;
    endTime: Date;
    category: string;
    imageUrl?: string | null;
    reasoning?: string;
    cost?: number | null;
    participants: EventParticipant[];
    hasJoined?: boolean;
  };
  onJoin?: (eventId: string) => Promise<void>;
  onClick?: (eventId: string) => void;
  isJoining?: boolean;
  size?: 'default' | 'compact';
}
```

**Key Features:**
- Clickable card with hover effects
- Participant avatars with Clerk integration
- Join/Joined button with loading state
- Responsive grid layout support
- Background image or gradient fallback

**Styling:**
- Default: `px-4 py-5 rounded-2xl` (current size)
- Compact: `px-3 py-4 rounded-xl` (for dashboard)
- Hover: `hover:bg-accent/10 cursor-pointer transition-all`
- Click prevention on button: `onClick={(e) => e.stopPropagation()}`

### EventDetailModal Component

**File:** `components/calendar/event-detail-modal.tsx`

**Props Interface:**
```typescript
interface EventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GroupEvent | null;
  onJoin?: (eventId: string) => Promise<void>;
  isJoining?: boolean;
  groupId: string;
}
```

**Layout Sections:**
1. **Header**: Category badge, title, location
2. **Time & Cost**: Formatted time range, cost if available
3. **Description**: Full event description with line breaks
4. **Reasoning**: AI reasoning for suggestion (collapsible)
5. **Participants**: Grid of avatars with names
6. **Actions**: Join/Joined button

**Styling:**
- Max width: `sm:max-w-[600px]`
- Scrollable content area
- Section spacing: `space-y-6`
- Reasoning section: Collapsible with chevron icon

### Clerk Avatar Integration

**Implementation Strategy:**

1. **Client-side Hook**: `useClerkUsers`
```typescript
// hooks/use-clerk-users.ts
export function useClerkUsers(userIds: string[]) {
  const [users, setUsers] = useState<Map<string, ClerkUser>>(new Map());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch users from Clerk API
    // Cache results in memory
    // Return cached data on subsequent calls
  }, [userIds]);
  
  return { users, loading };
}
```

2. **API Endpoint**: `/api/users/clerk-batch`
```typescript
// Fetches multiple Clerk users in a single request
// Returns: { users: Array<{ id, name, imageUrl, email }> }
// Implements rate limiting and caching
```

3. **Caching Strategy**:
- In-memory cache with 5-minute TTL
- React Query for automatic refetching
- Fallback to database imageUrl on error

### Time Formatting Utility

**File:** `lib/utils/time-formatting.ts`

```typescript
export function formatEventTime(startTime: Date, endTime: Date): string {
  const formatTime = (date: Date) => format(date, 'HH:mm');
  
  if (isToday(startTime)) {
    return `Today ${formatTime(startTime)}-${formatTime(endTime)}`;
  } else if (isTomorrow(startTime)) {
    return `Tomorrow ${formatTime(startTime)}-${formatTime(endTime)}`;
  } else {
    return `${format(startTime, 'd MMM')} ${formatTime(startTime)}-${formatTime(endTime)}`;
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

## Data Flow

### Opening Event Detail Modal

1. User clicks EventCard
2. EventCard calls `onClick(eventId)`
3. Parent component sets `selectedEventId` state
4. EventDetailModal opens with event data
5. Modal fetches fresh participant data from API
6. Clerk avatars load asynchronously

### Joining an Event

1. User clicks Join button in EventCard or Modal
2. Component calls `onJoin(eventId)`
3. Parent makes API call to `/api/groups/[id]/activity-suggestions/[id]/join`
4. API creates GroupEventInterest record
5. API returns updated participants list
6. Component updates local state
7. Toast notification shows success
8. Modal refetches data if open

### Clerk Avatar Loading

1. EventCard receives participants array
2. Extract userIds from participants
3. Call `useClerkUsers(userIds)` hook
4. Hook checks cache for existing data
5. If not cached, fetch from `/api/users/clerk-batch`
6. API calls Clerk's `clerkClient.users.getUserList()`
7. Cache results and return to component
8. Component renders avatars with Clerk imageUrl
9. Fallback to database imageUrl on error

## API Endpoints

### GET /api/users/clerk-batch

Fetches multiple Clerk users in a single request.

**Query Parameters:**
- `userIds`: Comma-separated list of Clerk user IDs

**Response:**
```typescript
{
  users: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    email: string;
  }>;
}
```

**Implementation:**
```typescript
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.get('userIds')?.split(',') || [];
  
  // Fetch users from Clerk
  const users = await clerkClient.users.getUserList({
    userId: userIds,
  });
  
  // Transform to simple format
  return NextResponse.json({
    users: users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      imageUrl: user.imageUrl,
      email: user.emailAddresses[0]?.emailAddress,
    })),
  });
}
```

**Caching:**
- Server-side: 5-minute in-memory cache
- Client-side: React Query with 5-minute stale time

## State Management

### TimeSlotEventsSection State

```typescript
const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
const [events, setEvents] = useState<GroupEvent[]>([]);

// Derived state
const selectedEvent = events.find(e => e.id === selectedEventId);
```

### EventCard State

```typescript
// No internal state - fully controlled by props
// Receives isJoining from parent to show loading state
```

### EventDetailModal State

```typescript
const [isRefetching, setIsRefetching] = useState(false);
const [participants, setParticipants] = useState<EventParticipant[]>([]);
const [showReasoning, setShowReasoning] = useState(false);
```

## Styling Specifications

### EventCard Styling

```css
/* Base card */
.event-card {
  position: relative;
  padding: 1.25rem 1rem;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.event-card:hover {
  background-color: rgba(var(--accent), 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Category badge */
.category-badge {
  padding: 0.375rem 0.5rem;
  background: rgba(38, 38, 38, 0.5);
  border-radius: 0.75rem;
  backdrop-filter: blur(3px);
}

/* Participant avatars */
.avatar-group {
  display: flex;
  align-items: center;
  margin-left: -0.5rem; /* -space-x-2 */
}

.avatar-ring {
  ring: 2px solid var(--background);
  border-radius: 9999px;
}
```

### EventDetailModal Styling

```css
/* Modal content */
.event-detail-modal {
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

/* Section spacing */
.modal-section {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border);
}

/* Reasoning collapsible */
.reasoning-section {
  background: rgba(var(--muted), 0.3);
  padding: 1rem;
  border-radius: 0.5rem;
}

/* Participant grid */
.participant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 1rem;
}
```

## Performance Optimizations

### 1. Clerk API Batching

- Batch multiple user requests into single API call
- Maximum 50 users per request (Clerk limit)
- Debounce requests by 100ms to collect IDs

### 2. Avatar Loading

- Lazy load avatar images with `loading="lazy"`
- Use Next.js Image component for optimization
- Show skeleton while loading

### 3. Modal Rendering

- Lazy load EventDetailModal component
- Only render when `selectedEventId` is not null
- Unmount modal content when closed

### 4. Memoization

```typescript
const EventCard = memo(({ event, onJoin, onClick }: EventCardProps) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for participants array
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.hasJoined === nextProps.event.hasJoined &&
    prevProps.event.participants.length === nextProps.event.participants.length
  );
});
```

## Error Handling

### Clerk API Errors

1. **Rate Limiting**: Implement exponential backoff
2. **Network Errors**: Fall back to database imageUrl
3. **Invalid User IDs**: Filter out and log warning
4. **Timeout**: 5-second timeout, then use fallback

### Join Event Errors

1. **409 Conflict**: Show "Already joined" message
2. **403 Forbidden**: Show "Not authorized" message
3. **Network Error**: Show retry button
4. **Unknown Error**: Show generic error with retry

### Modal Errors

1. **Failed to Load**: Show error state with retry button
2. **Missing Event**: Close modal and show toast
3. **Stale Data**: Auto-refetch on focus

## Accessibility

### EventCard

- `role="button"` for clickable card
- `aria-label` with event title and time
- `tabIndex={0}` for keyboard navigation
- `onKeyDown` handler for Enter/Space keys

### EventDetailModal

- Focus trap within modal
- Focus management (return to trigger on close)
- Escape key to close
- ARIA labels for all sections
- Proper heading hierarchy (h2, h3)

### Avatars

- `alt` text with participant name
- Fallback initials for missing images
- Sufficient color contrast for initials

## Testing Strategy

### Unit Tests

1. **EventCard Component**
   - Renders with all props
   - Handles click events
   - Prevents click on button
   - Shows correct join state

2. **EventDetailModal Component**
   - Renders all sections
   - Handles join action
   - Closes on escape/outside click
   - Refetches data on open

3. **useClerkUsers Hook**
   - Fetches users correctly
   - Caches results
   - Handles errors
   - Batches requests

### Integration Tests

1. **TimeSlotEventsSection**
   - Renders EventCards correctly
   - Opens modal on card click
   - Joins event successfully
   - Updates UI after join

2. **Dashboard Activity Suggestions**
   - Displays top 3 suggestions
   - Opens detail modal
   - Joins from dashboard

### E2E Tests

1. User clicks event card → modal opens
2. User joins event → participant list updates
3. User closes modal → returns to list
4. Clerk avatars load correctly

## Migration Plan

### Phase 1: Create New Components

1. Create EventCard component
2. Create EventDetailModal component
3. Create useClerkUsers hook
4. Create Clerk batch API endpoint

### Phase 2: Refactor TimeSlotEventsSection

1. Import EventCard component
2. Replace inline card rendering
3. Add modal state management
4. Test existing functionality

### Phase 3: Add Dashboard Integration

1. Create ActivitySuggestionsSection
2. Fetch suggestions for user's groups
3. Display top 3 with EventCard
4. Add "View All" button

### Phase 4: Cleanup

1. Remove duplicate code
2. Update tests
3. Document new components
4. Performance testing

## Future Enhancements

1. **Real-time Updates**: WebSocket for live participant updates
2. **Event Sharing**: Share event link with non-members
3. **Event Reminders**: Opt-in notifications before event
4. **Event Comments**: Discussion thread in modal
5. **Event Photos**: Upload photos after event
6. **Event RSVP**: More granular participation status
7. **Event Calendar Export**: Add to personal calendar
8. **Event Recommendations**: ML-based personalization
