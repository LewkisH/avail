# Design Document

## Overview

This design improves the calendar time slot creation and management UX by replacing manual datetime-local inputs with a more intuitive mobile-friendly interface. The new design features:

- Separate date and time pickers for easier input
- Duration slider for quick time slot length adjustment
- Quick duration preset buttons (30min, 1hr, 2hr, etc.)
- "Start Now" quick action button
- Real-time duration display
- Enhanced week view with edit/delete actions and end time display
- Improved touch targets for mobile usability

The design maintains backward compatibility with the existing API and database schema, focusing purely on frontend UX improvements.

## Architecture

### Component Structure

```
TimeSlotDialog (Enhanced)
├── Form Header
│   ├── Title Input
│   └── Description Textarea
├── Date & Time Section
│   ├── Date Picker (type="date")
│   ├── Start Time Picker (type="time")
│   ├── "Start Now" Button (create mode only)
│   └── Duration Display (calculated)
├── Duration Control Section
│   ├── Duration Slider (15min - 48hrs)
│   ├── Duration Preset Buttons
│   └── End Time Display (calculated)
└── Form Actions
    ├── Cancel Button
    └── Save Button

CalendarView (Enhanced - Week View)
└── Week Day Cards
    └── Time Slot Cards
        ├── Title
        ├── Time Range (start - end)
        └── Action Buttons
            ├── Edit Button
            └── Delete Button
```

### State Management

The TimeSlotDialog will manage the following state:

```typescript
interface TimeSlotFormState {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format (24-hour)
  duration: number; // Duration in minutes
  selectedPreset?: number; // Selected preset duration in minutes
}
```

The component will derive:
- `endTime`: Calculated from `startTime + duration`
- `endDate`: Calculated if duration spans multiple days
- Display duration: Formatted as "X hours Y minutes" or "Y minutes"

## Components and Interfaces

### 1. Enhanced TimeSlotDialog Component

**File**: `components/calendar/time-slot-dialog.tsx`

#### Props Interface
```typescript
interface TimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot?: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    description?: string;
  };
  onSuccess: () => void;
}
```

#### Form Schema
```typescript
const timeSlotSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.number().min(15).max(2880), // 15 minutes to 48 hours
}).refine(
  (data) => {
    // Validate date is not in the past
    const selectedDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  },
  {
    message: 'Date cannot be in the past',
    path: ['date'],
  }
);
```

#### Key Functions

**calculateEndTime**
```typescript
function calculateEndTime(
  date: string,
  startTime: string,
  durationMinutes: number
): { endTime: string; endDate: string } {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDateTime = new Date(date);
  startDateTime.setHours(hours, minutes, 0, 0);
  
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
  
  return {
    endTime: endDateTime.toTimeString().slice(0, 5), // HH:MM
    endDate: endDateTime.toISOString().split('T')[0], // YYYY-MM-DD
  };
}
```

**formatDuration**
```typescript
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} minutes`;
}
```

**handleStartNow**
```typescript
function handleStartNow() {
  const now = new Date();
  // Round to nearest 15 minutes
  const minutes = Math.ceil(now.getMinutes() / 15) * 15;
  now.setMinutes(minutes, 0, 0);
  
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);
  
  form.setValue('date', date);
  form.setValue('startTime', time);
  form.setValue('duration', 60); // Default 1 hour
}
```

#### Duration Presets

```typescript
const DURATION_PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: '3 hrs', minutes: 180 },
  { label: '4 hrs', minutes: 240 },
] as const;
```

#### UI Layout

The dialog will be organized into logical sections:

1. **Header Section**: Title and description inputs
2. **Date & Time Section**: 
   - Date picker (full width)
   - Start time picker with "Start Now" button
   - Calculated duration display (read-only, highlighted)
3. **Duration Section**:
   - Duration preset buttons (horizontal scrollable on mobile)
   - Duration slider with value label
   - Calculated end time display (read-only)
4. **Actions Section**: Cancel and Save buttons

### 2. Duration Slider Component

**File**: `components/calendar/duration-slider.tsx` (new component)

```typescript
interface DurationSliderProps {
  value: number; // Duration in minutes
  onChange: (value: number) => void;
  min?: number; // Default: 15
  max?: number; // Default: 2880 (48 hours)
  step?: number; // Default: 15
  disabled?: boolean;
}
```

The slider will use a custom range input with:
- Logarithmic scale for better UX (more granularity at lower durations)
- Visual markers at common intervals (1hr, 2hr, 4hr, 8hr, 24hr)
- Real-time value display above the slider thumb
- Touch-friendly sizing (minimum 44px height)

### 3. Enhanced CalendarView Component

**File**: `components/calendar/calendar-view.tsx`

#### Week View Time Slot Card Enhancement

Current week view card structure:
```tsx
<Card onClick={() => handleEdit(slot)}>
  <CardContent>
    <p>{slot.title}</p>
    <p>{formatTime(slot.startTime)}</p>
  </CardContent>
</Card>
```

Enhanced week view card structure:
```tsx
<Card>
  <CardContent>
    <div className="space-y-2">
      <p className="font-semibold truncate">{slot.title}</p>
      <p className="text-xs text-muted-foreground">
        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
      </p>
      <div className="flex gap-1 pt-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(slot);
          }}
          className="h-8 w-8"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(slot);
          }}
          className="h-8 w-8 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

#### Responsive Considerations

- On mobile (< 640px): Stack action buttons vertically if needed
- On tablet (640px - 1024px): Show compact action buttons
- On desktop (> 1024px): Show full-size action buttons with labels

## Data Models

No changes to the existing data models. The component will continue to work with:

```typescript
interface TimeSlot {
  id: string;
  title: string;
  startTime: string; // ISO 8601 UTC string
  endTime: string; // ISO 8601 UTC string
  description?: string;
}
```

The component will handle conversion between:
- User input (local date + time + duration) → UTC ISO strings for API
- API response (UTC ISO strings) → Local date + time for display

## Error Handling

### Validation Errors

1. **Past Date Selection**
   - Error: "Date cannot be in the past"
   - Display: Inline error message below date picker
   - Prevention: Disable past dates in date picker if supported by browser

2. **Invalid Duration**
   - Error: "Duration must be between 15 minutes and 48 hours"
   - Display: Inline error message below slider
   - Prevention: Slider constraints prevent this

3. **Missing Required Fields**
   - Error: "Title is required", "Date is required", "Start time is required"
   - Display: Inline error messages below respective fields
   - Prevention: Form validation on submit

### API Errors

1. **Network Failure**
   - Display: Toast notification with retry option
   - Message: "Failed to save time slot. Please try again."

2. **Conflict Error** (overlapping time slots)
   - Display: Toast notification with details
   - Message: "This time slot overlaps with an existing slot"

3. **Authentication Error**
   - Display: Toast notification with redirect
   - Message: "Session expired. Please sign in again."

### Edge Cases

1. **Multi-day Time Slots**
   - When duration causes end time to be on a different day
   - Display: Show both start and end dates in the end time display
   - Format: "Ends: 2:00 AM (Nov 16)"

2. **Timezone Changes**
   - Continue using existing timezone utilities
   - All times stored in UTC, displayed in user's local timezone

3. **Browser Compatibility**
   - Fallback for browsers without native date/time picker support
   - Use text input with format hints and validation

## Testing Strategy

### Unit Tests

1. **Time Calculation Functions**
   - Test `calculateEndTime` with various durations
   - Test multi-day spanning scenarios
   - Test edge cases (midnight, DST transitions)

2. **Duration Formatting**
   - Test `formatDuration` with various minute values
   - Test singular vs plural forms
   - Test edge cases (0 minutes, very large durations)

3. **Form Validation**
   - Test schema validation with valid/invalid inputs
   - Test past date rejection
   - Test duration bounds

### Integration Tests

1. **TimeSlotDialog Component**
   - Test form submission with valid data
   - Test preset button interactions
   - Test slider interactions
   - Test "Start Now" functionality
   - Test edit mode pre-population
   - Test error handling and display

2. **CalendarView Week View**
   - Test edit button opens dialog with correct data
   - Test delete button opens confirmation dialog
   - Test time range display formatting
   - Test action button interactions

### Manual Testing Checklist

1. **Mobile Devices** (iOS Safari, Android Chrome)
   - Touch target sizes adequate
   - Slider is easy to use
   - Native pickers work correctly
   - Scrolling and interactions smooth

2. **Desktop Browsers** (Chrome, Firefox, Safari, Edge)
   - All interactions work with mouse
   - Keyboard navigation functional
   - Form validation displays correctly

3. **Accessibility**
   - Screen reader announces all form fields
   - Keyboard navigation works throughout
   - Focus indicators visible
   - ARIA labels present and correct

## Implementation Notes

### Phase 1: Core Time Slot Dialog Improvements
- Replace datetime-local inputs with date + time inputs
- Add duration slider component
- Add duration preset buttons
- Add "Start Now" button
- Add real-time duration display
- Update form validation and submission logic

### Phase 2: Week View Enhancements
- Add end time display to week view cards
- Add edit/delete buttons to week view cards
- Adjust card layout for new elements
- Ensure responsive behavior

### Phase 3: Polish and Testing
- Improve mobile touch targets
- Add loading states
- Add animations/transitions
- Comprehensive testing
- Accessibility audit

### Dependencies

- Existing: `react-hook-form`, `zod`, `@hookform/resolvers`
- Existing: Radix UI components (Dialog, Form)
- Existing: Lucide icons
- Existing: Timezone utilities (`lib/utils/timezone.ts`)
- No new dependencies required

### Backward Compatibility

- API contract remains unchanged
- Database schema unchanged
- Existing time slots display correctly
- No migration required

## Accessibility Considerations

1. **Form Labels**: All inputs have associated labels
2. **ARIA Attributes**: Slider has `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label`
3. **Keyboard Navigation**: All interactive elements accessible via keyboard
4. **Focus Management**: Focus moves logically through form
5. **Error Announcements**: Validation errors announced to screen readers
6. **Touch Targets**: Minimum 44x44px for all interactive elements
7. **Color Contrast**: All text meets WCAG AA standards
8. **Screen Reader Testing**: Test with VoiceOver (iOS/macOS) and TalkBack (Android)

## Performance Considerations

1. **Debouncing**: Slider onChange debounced to prevent excessive re-renders
2. **Memoization**: Calculation functions memoized where appropriate
3. **Lazy Loading**: Dialog content only rendered when open
4. **Optimistic Updates**: UI updates immediately, API call in background

## Future Enhancements

1. **Recurring Time Slots**: Add ability to create repeating availability
2. **Templates**: Save common time slot configurations as templates
3. **Bulk Operations**: Select and delete multiple time slots
4. **Calendar Integration**: Two-way sync with external calendars
5. **Smart Suggestions**: Suggest optimal time slots based on history
