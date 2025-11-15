# Design Document: User Calendar

## Overview

The User Calendar feature provides a mobile-friendly interface for users to manage their available time slots. The system leverages the existing `CalendarEvent` model in the database and follows the established architectural patterns in the application (Next.js App Router, Prisma ORM, React Server Components with Client Components for interactivity).

The calendar will be accessible via a new navigation tab and will display time slots in a weekly or daily view optimized for mobile devices. Users can perform CRUD operations on their time slots through an intuitive touch-friendly interface.

## Architecture

### Technology Stack
- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript
- **UI Components**: Shadcn/ui components (existing pattern)
- **Styling**: Tailwind CSS with mobile-first responsive design
- **Forms**: React Hook Form with Zod validation (existing pattern)
- **State Management**: React hooks for client-side state
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Clerk (existing)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Calendar Page│  │ Calendar View│  │ Time Slot    │  │
│  │ (RSC)        │  │ Component    │  │ Dialogs      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     API Layer                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/calendar/timeslots                         │   │
│  │  - GET: Fetch user time slots                    │   │
│  │  - POST: Create new time slot                    │   │
│  │  - PUT: Update time slot                         │   │
│  │  - DELETE: Delete time slot                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CalendarService                                 │   │
│  │  - getUserTimeSlots()                            │   │
│  │  - createTimeSlot()                              │   │
│  │  - updateTimeSlot()                              │   │
│  │  - deleteTimeSlot()                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Prisma Client                                   │   │
│  │  - CalendarEvent model (existing)                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Page Component

**File**: `app/calendar/page.tsx`

Server Component that handles authentication and initial data loading.

```typescript
interface CalendarPageProps {}

// Responsibilities:
// - Verify user authentication
// - Render ProtectedLayout wrapper
// - Render CalendarView client component
```

### 2. Calendar View Component

**File**: `components/calendar/calendar-view.tsx`

Client Component that displays the calendar interface and manages time slots.

```typescript
interface TimeSlot {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

interface CalendarViewProps {
  initialTimeSlots?: TimeSlot[];
}

// Responsibilities:
// - Display time slots in a calendar format
// - Handle view switching (day/week)
// - Manage add/edit/delete dialog states
// - Fetch and refresh time slot data
// - Responsive layout for mobile and desktop
```

### 3. Time Slot Dialog Components

**File**: `components/calendar/time-slot-dialog.tsx`

Client Component for creating and editing time slots.

```typescript
interface TimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot?: TimeSlot; // undefined for create, defined for edit
  onSuccess: () => void;
}

// Responsibilities:
// - Form for time slot input (title, start time, end time, description)
// - Validation using Zod schema
// - Submit to API endpoint
// - Handle loading and error states
// - Mobile-friendly date/time pickers
```

**File**: `components/calendar/delete-time-slot-dialog.tsx`

Client Component for confirming time slot deletion.

```typescript
interface DeleteTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot: TimeSlot;
  onSuccess: () => void;
}

// Responsibilities:
// - Display confirmation message
// - Call delete API endpoint
// - Handle loading and error states
```

### 4. Calendar Service

**File**: `lib/services/calendar.service.ts`

Service layer for calendar operations.

```typescript
export class CalendarService {
  // Fetch all time slots for a user within a date range
  static async getUserTimeSlots(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]>;

  // Create a new time slot
  static async createTimeSlot(
    userId: string,
    data: {
      title: string;
      startTime: Date;
      endTime: Date;
      description?: string;
      timezone: string;
    }
  ): Promise<CalendarEvent>;

  // Update an existing time slot
  static async updateTimeSlot(
    timeSlotId: string,
    userId: string,
    data: {
      title?: string;
      startTime?: Date;
      endTime?: Date;
      description?: string;
    }
  ): Promise<CalendarEvent>;

  // Delete a time slot
  static async deleteTimeSlot(
    timeSlotId: string,
    userId: string
  ): Promise<void>;
}
```

### 5. API Routes

**File**: `app/api/calendar/timeslots/route.ts`

```typescript
// GET /api/calendar/timeslots?start=ISO_DATE&end=ISO_DATE
// Returns: TimeSlot[]

// POST /api/calendar/timeslots
// Body: { title, startTime, endTime, description?, timezone }
// Returns: TimeSlot
```

**File**: `app/api/calendar/timeslots/[id]/route.ts`

```typescript
// PUT /api/calendar/timeslots/[id]
// Body: { title?, startTime?, endTime?, description? }
// Returns: TimeSlot

// DELETE /api/calendar/timeslots/[id]
// Returns: { success: true }
```

## Data Models

### Existing CalendarEvent Model

The existing `CalendarEvent` model will be used to store time slots:

```prisma
model CalendarEvent {
  id          String      @id @default(uuid())
  userId      String
  title       String
  description String?     @db.Text
  startTime   DateTime
  endTime     DateTime
  timezone    String
  location    String?
  source      EventSource
  sourceId    String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startTime])
  @@index([userId])
}

enum EventSource {
  google
  ics
  manual
}
```

For manually created time slots:
- `source` will be set to `EventSource.manual`
- `sourceId` will be `null`
- `location` will be optional
- `timezone` will default to user's browser timezone

### Validation Schema

```typescript
const timeSlotSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  description: z.string().max(1000).optional(),
  timezone: z.string().default("UTC"),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});
```

## Mobile-Friendly Design Considerations

### Responsive Layout
- **Mobile (< 768px)**: Single column, day view by default
- **Tablet (768px - 1024px)**: Flexible layout, week view option
- **Desktop (> 1024px)**: Multi-column, week view by default

### Touch Interactions
- Minimum touch target size: 44x44 pixels
- Swipe gestures for navigation between days/weeks
- Pull-to-refresh for reloading time slots
- Long-press for quick actions (edit/delete)

### Mobile-Optimized Components
- Native date/time pickers using HTML5 input types
- Bottom sheet dialogs for mobile (full-screen on small devices)
- Simplified navigation with clear back buttons
- Loading states with skeleton screens
- Toast notifications for feedback

### Performance
- Lazy loading of time slots by date range
- Optimistic UI updates for better perceived performance
- Debounced API calls
- Minimal re-renders using React.memo where appropriate

## Error Handling

### Client-Side Errors
- Form validation errors displayed inline
- Network errors shown via toast notifications
- Retry mechanisms for failed API calls
- Graceful degradation for offline scenarios

### Server-Side Errors
- Standardized error response format:
```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User doesn't own the resource
- `NOT_FOUND`: Time slot not found
- `CONFLICT`: Time slot overlaps with existing slot
- `INTERNAL_ERROR`: Server error

### Validation Rules
- Start time must be before end time
- Title is required (1-200 characters)
- Description is optional (max 1000 characters)
- Time slots must be in the future (optional constraint)
- Timezone must be valid IANA timezone string

## Testing Strategy

### Unit Tests
- CalendarService methods with mocked Prisma client
- Validation schemas with various input combinations
- Utility functions for date/time manipulation

### Integration Tests
- API routes with test database
- Full CRUD flow for time slots
- Authentication and authorization checks
- Error handling scenarios

### Component Tests
- CalendarView rendering with different data states
- TimeSlotDialog form submission and validation
- DeleteTimeSlotDialog confirmation flow
- Mobile responsive behavior

### E2E Tests (Optional)
- Complete user flow: navigate to calendar, add time slot, edit, delete
- Mobile device simulation
- Cross-browser compatibility

## Implementation Notes

### Navigation Update
Add "Calendar" link to the navigation in `components/protected-layout.tsx`:

```tsx
<a href="/calendar" className="text-sm font-medium hover:underline">
  Calendar
</a>
```

### Timezone Handling
- Use browser's timezone by default: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Store all times in UTC in the database
- Convert to user's timezone for display
- Use `date-fns-tz` or similar library for timezone conversions

### Date Range Loading
- Initially load current week's time slots
- Implement pagination/infinite scroll for loading additional weeks
- Cache loaded data to minimize API calls

### Accessibility
- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly announcements for actions
- Focus management in dialogs

### Future Enhancements (Out of Scope)
- Recurring time slots
- Calendar sync with Google Calendar
- Conflict detection with group activities
- Availability sharing with groups
- Calendar export (iCal format)
