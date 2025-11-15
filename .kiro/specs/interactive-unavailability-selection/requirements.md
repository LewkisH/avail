# Requirements Document

## Introduction

This feature introduces an interactive drag-to-select interface for marking unavailable time ranges within group availability windows. When viewing group availability, users can click and drag horizontally across availability window rows to create orange-highlighted unavailability ranges with 15-minute granularity. These ranges can be adjusted by dragging their endpoints and are confirmed or cancelled via header buttons. When confirmed, unavailability ranges are saved as "Busy" calendar events. Simple clicks without dragging open a modal for additional actions.

## Glossary

- **Availability Window**: A time period when group members are collectively available, displayed as a row in the group availability view
- **Unavailability Range**: A user-selected period within an availability window marked as unavailable, visually represented with an orange highlight
- **Grid Step**: The minimum time increment for selection, set to 15 minutes
- **Drag Selection**: The interaction pattern where a user presses and drags horizontally to create a range
- **Range Handle**: The draggable endpoints of an unavailability range that allow resizing
- **Group Availability System**: The application's group availability interface that displays availability windows and manages unavailability selections
- **Confirmation Controls**: The "Confirm Unavailables" and "Cancel" buttons that appear in the header when ranges exist
- **Busy Event**: A calendar event with source='manual' that represents a period when the user is unavailable

## Requirements

### Requirement 1

**User Story:** As a user, I want to click and drag horizontally across an availability window to mark unavailable periods, so that I can quickly indicate when I'm not available during group availability times

#### Acceptance Criteria

1. WHEN the user presses down on an availability window row and drags horizontally without releasing, THE Group Availability System SHALL create an orange-highlighted area representing the unavailability range
2. THE Group Availability System SHALL constrain the unavailability range to 15-minute grid steps
3. WHEN the user drags to the right, THE Group Availability System SHALL expand the range from the initial click point to the current cursor position
4. WHEN the user drags to the left, THE Group Availability System SHALL expand the range from the current cursor position to the initial click point
5. THE Group Availability System SHALL display the unavailability range only within the boundaries of the availability window row

### Requirement 2

**User Story:** As a user, I want to see the start and end times displayed on my unavailability range, so that I know exactly which period I'm marking as unavailable

#### Acceptance Criteria

1. WHEN an unavailability range is created, THE Group Availability System SHALL display the start time at the beginning of the orange range
2. WHEN an unavailability range is created, THE Group Availability System SHALL display the end time at the end of the orange range
3. THE Group Availability System SHALL update the displayed times in real-time as the user adjusts the range
4. THE Group Availability System SHALL format times in a readable format (e.g., "9:00", "14:30")
5. THE Group Availability System SHALL ensure time labels remain visible and do not overlap with each other

### Requirement 3

**User Story:** As a user, I want to adjust the size of my unavailability range by dragging its endpoints, so that I can fine-tune the exact period I'm marking as unavailable

#### Acceptance Criteria

1. WHEN an unavailability range exists, THE Group Availability System SHALL display draggable handles at both the start and end of the range
2. WHEN the user drags the start handle, THE Group Availability System SHALL adjust the start time while keeping the end time fixed
3. WHEN the user drags the end handle, THE Group Availability System SHALL adjust the end time while keeping the start time fixed
4. THE Group Availability System SHALL constrain handle dragging to 15-minute grid steps
5. THE Group Availability System SHALL prevent the start handle from being dragged past the end handle and vice versa

### Requirement 4

**User Story:** As a user, I want to confirm or cancel my unavailability selections, so that I have control over whether the changes are saved

#### Acceptance Criteria

1. WHEN at least one unavailability range exists, THE Group Availability System SHALL display a "Confirm Unavailables" button in the header
2. WHEN at least one unavailability range exists, THE Group Availability System SHALL display a "Cancel" button in the header
3. WHEN the user clicks "Confirm Unavailables", THE Group Availability System SHALL create Busy Event calendar entries for all unavailability ranges
4. WHEN the user clicks "Cancel", THE Group Availability System SHALL remove all unsaved unavailability ranges from the view
5. WHEN no unavailability ranges exist, THE Group Availability System SHALL hide both the "Confirm Unavailables" and "Cancel" buttons

### Requirement 5

**User Story:** As a user, I want to simply click on an availability window without dragging to open a modal, so that I can access additional availability window actions

#### Acceptance Criteria

1. WHEN the user clicks on an availability window row without dragging, THE Group Availability System SHALL open a modal dialog
2. THE Group Availability System SHALL distinguish between a click (press and release without movement) and a drag (press, move, and release)
3. THE Group Availability System SHALL set a movement threshold of 5 pixels to differentiate clicks from drags
4. WHEN the modal opens, THE Group Availability System SHALL display an empty modal interface for future functionality
5. THE Group Availability System SHALL not create an unavailability range when a simple click is detected

### Requirement 6

**User Story:** As a user, I want visual feedback during drag interactions, so that I understand what action I'm performing

#### Acceptance Criteria

1. WHEN the user hovers over an availability window row, THE Group Availability System SHALL display a cursor indicating the row is interactive
2. WHEN the user begins dragging, THE Group Availability System SHALL change the cursor to indicate a selection action is in progress
3. THE Group Availability System SHALL render the orange unavailability range with sufficient opacity to distinguish it from the availability window background
4. WHEN the user drags a range handle, THE Group Availability System SHALL provide visual feedback indicating which handle is being manipulated
5. THE Group Availability System SHALL snap the range boundaries to the 15-minute grid visually as the user drags

### Requirement 7

**User Story:** As a user, I want to create multiple unavailability ranges within a single availability window, so that I can mark multiple non-contiguous unavailable periods

#### Acceptance Criteria

1. THE Group Availability System SHALL allow the user to create multiple unavailability ranges within the same availability window row
2. WHEN the user creates a new range, THE Group Availability System SHALL preserve all existing ranges in that availability window
3. THE Group Availability System SHALL prevent unavailability ranges from overlapping with each other
4. WHEN the user drags a range into another range, THE Group Availability System SHALL merge them into a single continuous range
5. THE Group Availability System SHALL save all ranges within an availability window when the user clicks "Confirm Unavailables"

### Requirement 8

**User Story:** As a mobile user, I want to use touch gestures to create and adjust unavailability ranges, so that I can mark unavailable periods on my mobile device

#### Acceptance Criteria

1. THE Group Availability System SHALL support touch press and drag gestures for creating unavailability ranges on mobile devices
2. THE Group Availability System SHALL support touch drag gestures on range handles for adjusting ranges on mobile devices
3. THE Group Availability System SHALL provide touch-friendly handle sizes with a minimum touch target of 44x44 pixels
4. WHEN the user performs a touch tap without dragging, THE Group Availability System SHALL open the modal dialog
5. THE Group Availability System SHALL prevent default touch scrolling behavior during drag operations to avoid conflicts
