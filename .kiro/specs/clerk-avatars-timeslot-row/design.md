# Design Document

## Overview

This design enhances the TimeSlotRow component to display Clerk profile images for participant avatars, following the established pattern used in EventCard and EventDetailModal components. The implementation leverages the existing useClerkUsers hook for efficient batch fetching.

## Architecture

### Component Structure

```
GroupAvailabilityView (parent)
├── useClerkUsers hook (fetch Clerk data for all participants)
├── TimeSlotsList
    └── InteractiveTimeSlotRow
        └── TimeSlotRow (updated to use Clerk avatars)
```

### Data Flow

1. GroupAvailabilityView fetches availability windows with participant data
2. Extract all unique participant IDs from all windows
3. Use useClerkUsers hook to batch fetch Clerk data for all participants
4. Pass clerkUsers Map to TimeSlotRow components
5. TimeSlotRow prioritizes Clerk imageUrl over fallback initials

## Components and Interfaces

### Modified: TimeSlotRow Component

**Current Implementation:**
- Displays colored circular avatars with initials
- Uses getInitials() and getAvatarColor() helper functions
- No actual profile images

**Updated Implementation:**
- Import Avatar, AvatarImage, AvatarFallback from UI components
- Accept clerkUsers prop (Map<string, ClerkUser>)
- Prioritize Clerk imageUrl when available
- Fall back to colored initials when imageUrl is unavailable

**Props Interface:**
```typescript
interface TimeSlotRowProps {
  groupName: string;
  startTime: Date;
  endTime: Date;
  participants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  clerkUsers?: Map<string, { imageUrl?: string; name?: string }>;
  onClick?: () => void;
}
```

### Modified: GroupAvailabilityView Component

**Changes:**
- Add useClerkUsers hook call to fetch Clerk data for all participants
- Extract unique participant IDs from availabilityWindows
- Pass clerkUsers Map to TimeSlotRow via TimeSlotsList

## Implementation Details

### Avatar Rendering Logic

```typescript
// For each participant
const clerkUser = clerkUsers?.get(participant.id);
const imageUrl = clerkUser?.imageUrl;
const displayName = clerkUser?.name || participant.name;

// Render Avatar component
<Avatar className="w-8 h-8">
  <AvatarImage src={imageUrl || undefined} alt={displayName} />
  <AvatarFallback className={getAvatarColor(participant.id)}>
    {getInitials(displayName)}
  </AvatarFallback>
</Avatar>
```

### Helper Functions

Keep existing helper functions:
- `getInitials(name: string)`: Extract initials from name
- `getAvatarColor(id: string)`: Generate consistent color based on user ID

## Error Handling

- If useClerkUsers fails or returns empty, fall back to initials (no visual change from current behavior)
- If individual Clerk user has no imageUrl, use colored initials fallback
- Handle loading state by showing initials while Clerk data loads

## Testing Strategy

- Verify avatars display Clerk images when available
- Verify fallback to initials when Clerk imageUrl is missing
- Verify consistent colors for initials based on user ID
- Verify loading state shows initials (no skeleton needed)
- Verify avatar styling matches existing design (size, overlap, border)
