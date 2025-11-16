# Requirements Document

## Introduction

This feature implements a modal dialog that displays group events and member availability when users click on a time slot in the group availability view. The modal shows activity suggestions with event details (title, location, category, time), participant avatars, and a "Join" button. It also displays which group members are available or unavailable during the selected time period. The design follows the Figma specifications with a modern card-based layout.

## Glossary

- **Time Slot Modal**: A dialog that appears when clicking on an availability window, showing events and availability information
- **Activity Suggestion**: A proposed group activity that may be linked to an external event, containing details like title, location, category, and time
- **Group Event Interest**: A record indicating a user's participation/interest in an activity suggestion
- **Event Card**: A visual card component displaying event information with category badge, title, location, time, and participants
- **Participant Avatar**: A circular profile image representing a user who has joined an event
- **Availability Section**: The portion of the modal showing which group members are available or unavailable
- **Category Badge**: A rounded pill-shaped element displaying the event category (e.g., "Drinks", "Sports")
- **Time Format**: Display format showing "Today", "Tomorrow", or "1 Jan" followed by time range in 24-hour format

## Requirements

### Requirement 1

**User Story:** As a user, I want to see activity suggestions for a time slot when I click on it, so that I can discover what events are planned during that period

#### Acceptance Criteria

1. WHEN the user clicks on a time slot in the group availability view, THE Time Slot Modal SHALL open and display all activity suggestions that overlap with the selected time period
2. THE Time Slot Modal SHALL fetch activity suggestions from the database including their related external event data if available
3. WHEN no activity suggestions exist for the time slot, THE Time Slot Modal SHALL display "No events scheduled"
4. THE Time Slot Modal SHALL display activity suggestions in chronological order by start time
5. THE Time Slot Modal SHALL show the modal header with the time slot title and formatted date/time range

### Requirement 2

**User Story:** As a user, I want to see event details in a visually appealing card format, so that I can quickly understand what each event is about

#### Acceptance Criteria

1. WHEN displaying an activity suggestion, THE Event Card SHALL show the category in a badge with neutral-800/50 background and rounded-2xl corners
2. THE Event Card SHALL display the event title followed by "@ location" if a location is specified
3. THE Event Card SHALL format the title as white text with text-xl size and font-semibold weight
4. THE Event Card SHALL display the time in the format "Today HH:mm-HH:mm", "Tomorrow HH:mm-HH:mm", or "d MMM HH:mm-HH:mm"
5. THE Event Card SHALL use neutral-300 color for the time text with text-base size and font-medium weight
6. THE Event Card SHALL have px-6 py-7 padding, rounded-2xl corners, and a border
7. THE Event Card SHALL use gap-4 spacing between sections

### Requirement 3

**User Story:** As a user, I want to see who has already joined an event, so that I know which group members are participating

#### Acceptance Criteria

1. WHEN displaying an activity suggestion, THE Event Card SHALL show participant avatars for all users who have a GroupEventInterest record for that activity
2. THE Event Card SHALL display avatars in a horizontal row with -space-x-2 (overlapping) layout
3. THE Event Card SHALL render each avatar as a 32x32 pixel circle with a 2px ring in the background color
4. WHEN a user has an image URL, THE Event Card SHALL display their profile image in the avatar
5. WHEN a user does not have an image URL, THE Event Card SHALL display their initials (first letter of first and last name) in the avatar fallback
6. THE Event Card SHALL limit the number of visible avatars to prevent overflow (implementation detail)

### Requirement 4

**User Story:** As a user, I want to join an event by clicking a button, so that I can indicate my participation and be added to the participant list

#### Acceptance Criteria

1. WHEN displaying an activity suggestion, THE Event Card SHALL show a "Join" button with orange-600 background and rounded-lg corners
2. WHEN the current user has not joined the event, THE Event Card SHALL display the button text as "Join" and enable the button
3. WHEN the current user has already joined the event, THE Event Card SHALL display the button text as "Joined" and disable the button
4. WHEN the user clicks "Join", THE Time Slot Modal SHALL create a GroupEventInterest record linking the user to the activity suggestion
5. WHEN the join action succeeds, THE Time Slot Modal SHALL update the UI to show the user's avatar in the participant list and change the button to "Joined"
6. THE Event Card SHALL position the button on the right side of the card footer, opposite the participant avatars

### Requirement 5

**User Story:** As a user, I want to see which group members are available during the selected time slot, so that I can coordinate activities with available members

#### Acceptance Criteria

1. WHEN displaying the availability section, THE Time Slot Modal SHALL show all group members categorized as "Available" or "Unavailable"
2. THE Time Slot Modal SHALL determine availability by checking if users have calendar events (busy periods) that overlap with the time slot
3. THE Availability Section SHALL display available users with a green UserCheck icon and "Available (N)" label
4. THE Availability Section SHALL display unavailable users with a red UserX icon and "Unavailable (N)" label
5. WHEN no availability data exists, THE Availability Section SHALL display "No availability data"
6. THE Availability Section SHALL be separated from the events section by a horizontal separator line

### Requirement 6

**User Story:** As a user, I want to see member details in the availability list, so that I can identify who is available or unavailable

#### Acceptance Criteria

1. WHEN displaying a user in the availability section, THE Availability Section SHALL show their avatar (24x24 pixels)
2. THE Availability Section SHALL display the user's full name as text-sm font-medium
3. THE Availability Section SHALL display the user's email as text-xs text-muted-foreground
4. THE Availability Section SHALL truncate long names and emails with ellipsis to prevent overflow
5. THE Availability Section SHALL apply 60% opacity to unavailable users to visually distinguish them
6. THE Availability Section SHALL use hover:bg-accent/50 for interactive feedback on user rows

### Requirement 7

**User Story:** As a user, I want the modal to be responsive and work well on different screen sizes, so that I can use it on desktop and mobile devices

#### Acceptance Criteria

1. THE Time Slot Modal SHALL use a maximum width of 500px (sm:max-w-[500px])
2. THE Time Slot Modal SHALL be scrollable when content exceeds viewport height
3. THE Event Card SHALL maintain its layout and spacing on mobile devices
4. THE Availability Section SHALL stack user information vertically on narrow screens
5. THE Time Slot Modal SHALL close when the user clicks outside the modal or presses the escape key

### Requirement 8

**User Story:** As a developer, I want the modal to handle loading and error states gracefully, so that users have a good experience even when data fetching fails

#### Acceptance Criteria

1. WHEN fetching activity suggestions, THE Time Slot Modal SHALL display a loading state
2. WHEN an error occurs fetching data, THE Time Slot Modal SHALL display an error message
3. WHEN the join action fails, THE Time Slot Modal SHALL display an error toast notification
4. THE Time Slot Modal SHALL handle cases where activity suggestions have no external event linked
5. THE Time Slot Modal SHALL gracefully handle missing or null data fields (location, category, etc.)

### Requirement 9

**User Story:** As a user, I want the modal to update in real-time when other users join events, so that I see the most current participation information

#### Acceptance Criteria

1. WHEN the modal is open and another user joins an event, THE Time Slot Modal SHOULD update the participant list (future enhancement)
2. WHEN the user joins an event, THE Time Slot Modal SHALL immediately update the local state to reflect the change
3. THE Time Slot Modal SHALL refetch data when reopened to ensure fresh information
4. THE Time Slot Modal SHALL maintain scroll position when updating participant lists
5. THE Time Slot Modal SHALL handle concurrent join actions gracefully

### Requirement 10

**User Story:** As a group owner, I want to see activity suggestions that I've created for my group, so that I can track what events are planned

#### Acceptance Criteria

1. THE Time Slot Modal SHALL display activity suggestions for the current group context
2. THE Time Slot Modal SHALL only show activity suggestions that fall within the selected time slot boundaries
3. THE Time Slot Modal SHALL include both manually created and AI-generated activity suggestions
4. THE Time Slot Modal SHALL display activity suggestions regardless of whether they have external event links
5. THE Time Slot Modal SHALL use the activity suggestion's own fields (title, location, category, startTime, endTime) as the primary data source
