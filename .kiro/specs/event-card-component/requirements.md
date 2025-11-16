# Requirements Document

## Introduction

This feature extracts the event display logic from the TimeSlotEventsSection into a separate, reusable EventCard component. The component will support click-to-expand functionality to show full activity suggestion details in a modal dialog. Additionally, it will integrate with Clerk to fetch user avatars directly from the authentication provider, ensuring profile images are always up-to-date.

## Glossary

- **EventCard Component**: A reusable React component that displays a single activity suggestion with event details, participant avatars, and action buttons
- **Activity Suggestion**: A proposed group activity containing details like title, location, category, time, and participant list
- **Clerk**: The authentication provider used for user management and profile data
- **Clerk User Object**: The user data object from Clerk containing profile information including imageUrl
- **Event Detail Modal**: An expanded view that displays comprehensive information about an activity suggestion when the EventCard is clicked
- **Participant Avatar**: A circular profile image representing a user who has joined an event, sourced from Clerk
- **Event Participant**: A user who has expressed interest in an activity suggestion via GroupEventInterest record

## Requirements

### Requirement 1

**User Story:** As a developer, I want a reusable EventCard component, so that I can display activity suggestions consistently across different parts of the application

#### Acceptance Criteria

1. THE EventCard Component SHALL be a standalone component in the components/calendar directory
2. THE EventCard Component SHALL accept event data as props including id, title, location, category, startTime, endTime, and participants
3. THE EventCard Component SHALL accept callback functions for join and click actions as props
4. THE EventCard Component SHALL render with the same visual design as the current event cards (px-6 py-7, rounded-2xl, border)
5. THE EventCard Component SHALL be importable and usable in any parent component

### Requirement 2

**User Story:** As a user, I want to click on an event card to see more details, so that I can learn more about the activity before deciding to join

#### Acceptance Criteria

1. WHEN the user clicks anywhere on the EventCard, THE EventCard Component SHALL trigger an onClick callback with the activity suggestion ID
2. THE EventCard Component SHALL apply hover:bg-accent/50 styling to indicate it is clickable
3. THE EventCard Component SHALL show a cursor-pointer to indicate interactivity
4. WHEN the EventCard is clicked, THE parent component SHALL open an Event Detail Modal with full activity information
5. THE EventCard Component SHALL prevent the click event from triggering when the user clicks the Join button

### Requirement 3

**User Story:** As a user, I want to see an expanded modal with full event details when I click on an event card, so that I can view all information including description and reasoning

#### Acceptance Criteria

1. THE Event Detail Modal SHALL display the activity suggestion title, location, category, and time range
2. THE Event Detail Modal SHALL display the full description text with proper formatting
3. THE Event Detail Modal SHALL display the AI reasoning for why this activity was suggested
4. THE Event Detail Modal SHALL display the cost if available
5. THE Event Detail Modal SHALL show all participants with their avatars and names
6. THE Event Detail Modal SHALL include a Join/Joined button with the same functionality as the card
7. THE Event Detail Modal SHALL be closable via close button, escape key, or clicking outside

### Requirement 4

**User Story:** As a user, I want to see accurate profile pictures from Clerk, so that I can easily identify group members by their current profile images

#### Acceptance Criteria

1. WHEN displaying participant avatars, THE EventCard Component SHALL fetch user data from Clerk using the Clerk user ID
2. THE EventCard Component SHALL use the imageUrl from the Clerk user object as the avatar source
3. WHEN a Clerk user has no imageUrl, THE EventCard Component SHALL display initials as fallback
4. THE EventCard Component SHALL handle cases where Clerk API is unavailable by falling back to cached imageUrl from database
5. THE EventCard Component SHALL cache Clerk avatar URLs to minimize API calls

### Requirement 5

**User Story:** As a developer, I want the EventCard component to handle loading and error states, so that users have a smooth experience even when data is loading or unavailable

#### Acceptance Criteria

1. WHEN participant data is loading, THE EventCard Component SHALL display skeleton avatars
2. WHEN an error occurs fetching Clerk data, THE EventCard Component SHALL fall back to database imageUrl
3. THE EventCard Component SHALL handle missing or null data fields gracefully (location, category, cost)
4. THE EventCard Component SHALL display "Location TBD" when location is null
5. THE EventCard Component SHALL hide the category badge when category is null

### Requirement 6

**User Story:** As a user, I want the event detail modal to be responsive and accessible, so that I can view event details on any device

#### Acceptance Criteria

1. THE Event Detail Modal SHALL use a maximum width of 600px (sm:max-w-[600px])
2. THE Event Detail Modal SHALL be scrollable when content exceeds viewport height
3. THE Event Detail Modal SHALL maintain proper spacing and layout on mobile devices
4. THE Event Detail Modal SHALL support keyboard navigation (Tab, Escape)
5. THE Event Detail Modal SHALL have proper ARIA labels for screen readers

### Requirement 7

**User Story:** As a developer, I want to refactor TimeSlotEventsSection to use the new EventCard component, so that the codebase is more maintainable

#### Acceptance Criteria

1. THE TimeSlotEventsSection SHALL import and use the EventCard component for each activity suggestion
2. THE TimeSlotEventsSection SHALL pass event data and callbacks to EventCard as props
3. THE TimeSlotEventsSection SHALL handle the onClick callback to open the Event Detail Modal
4. THE TimeSlotEventsSection SHALL maintain the same visual appearance and functionality as before
5. THE TimeSlotEventsSection SHALL remove duplicate event rendering code

### Requirement 8

**User Story:** As a user, I want to see participant avatars update in real-time when viewing event details, so that I always see the current list of participants

#### Acceptance Criteria

1. WHEN the Event Detail Modal is open, THE modal SHALL refetch participant data from the API
2. WHEN a user joins an event, THE Event Detail Modal SHALL update the participant list immediately
3. THE Event Detail Modal SHALL update the parent EventCard's participant list when closed
4. THE EventCard Component SHALL accept an onParticipantsUpdate callback to sync state with parent
5. THE Event Detail Modal SHALL display a loading indicator while refetching data

### Requirement 9

**User Story:** As a developer, I want to integrate Clerk's user API efficiently, so that avatar fetching doesn't impact performance

#### Acceptance Criteria

1. THE EventCard Component SHALL batch Clerk user API requests when multiple cards are rendered
2. THE EventCard Component SHALL implement a caching layer for Clerk user data with 5-minute TTL
3. THE EventCard Component SHALL use React Query or SWR for data fetching and caching
4. THE EventCard Component SHALL fetch Clerk data in parallel with activity suggestion data
5. THE EventCard Component SHALL limit concurrent Clerk API requests to prevent rate limiting

### Requirement 10

**User Story:** As a user, I want to see the event card in the dashboard activity suggestions, so that I can quickly view and join suggested activities

#### Acceptance Criteria

1. THE Dashboard Activity Suggestions SHALL use the EventCard component to display activity suggestions
2. THE Dashboard Activity Suggestions SHALL support the same click-to-expand functionality
3. THE Dashboard Activity Suggestions SHALL show participant avatars from Clerk
4. THE Dashboard Activity Suggestions SHALL display a maximum of 3 activity suggestions initially
5. THE Dashboard Activity Suggestions SHALL include a "View All" button to see more suggestions
