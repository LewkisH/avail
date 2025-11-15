# Requirements Document

## Introduction

This document specifies the requirements for fixing a critical bug in the Google Calendar synchronization feature. Currently, when a user creates a time slot in Avail and then triggers a sync from Google Calendar, the system creates duplicate entries. This occurs because manually created events that are synced to Google Calendar maintain their `source: manual` status, but the sync logic only checks for events with `source: google` when determining if an event already exists locally.

## Glossary

- **Avail System**: The local calendar management system where users create and manage time slots
- **Google Calendar**: External calendar service that can be connected for bidirectional synchronization
- **Time Slot**: A calendar event entry with start time, end time, title, and other metadata
- **Source**: An attribute indicating the origin of a time slot (either 'manual' for locally created or 'google' for synced from Google)
- **SourceId**: The Google Calendar event ID stored with a time slot to track its Google Calendar counterpart
- **Sync Operation**: The process of fetching events from Google Calendar and reconciling them with local time slots
- **Duplicate Event**: Two or more time slot entries representing the same calendar event

## Requirements

### Requirement 1

**User Story:** As a user with Google Calendar connected, I want to create time slots in Avail without them being duplicated when I sync, so that my calendar remains accurate and clutter-free.

#### Acceptance Criteria

1. WHEN a user creates a time slot in the Avail System AND the time slot is synced to Google Calendar, THE Avail System SHALL store the Google Calendar event ID in the sourceId field
2. WHEN a sync operation is triggered, THE Avail System SHALL identify existing time slots by checking the sourceId field regardless of the source attribute value
3. WHEN a sync operation finds a Google Calendar event with an ID matching an existing time slot's sourceId, THE Avail System SHALL skip creating a new time slot
4. WHEN a sync operation finds a Google Calendar event with an ID matching an existing time slot's sourceId AND the event details have changed, THE Avail System SHALL update the existing time slot

### Requirement 2

**User Story:** As a user, I want manually created time slots that are synced to Google Calendar to be properly tracked, so that the system can prevent duplicates during subsequent syncs.

#### Acceptance Criteria

1. WHEN a time slot is created with source 'manual' AND successfully synced to Google Calendar, THE Avail System SHALL maintain the sourceId field with the Google Calendar event ID
2. WHEN querying for existing time slots during sync, THE Avail System SHALL include time slots with source 'manual' that have a non-null sourceId value
3. THE Avail System SHALL NOT change the source attribute from 'manual' to 'google' when a manually created time slot is synced to Google Calendar

### Requirement 3

**User Story:** As a user, I want the sync operation to correctly handle all scenarios including creates, updates, and deletes, so that my Avail calendar accurately reflects my Google Calendar.

#### Acceptance Criteria

1. WHEN a sync operation finds a Google Calendar event that does not match any existing time slot sourceId, THE Avail System SHALL create a new time slot with source 'google'
2. WHEN a sync operation completes, THE Avail System SHALL delete time slots with source 'google' that no longer exist in Google Calendar
3. WHEN a sync operation completes, THE Avail System SHALL preserve time slots with source 'manual' even if they do not exist in Google Calendar
4. WHEN a sync operation completes, THE Avail System SHALL return statistics showing the number of time slots created, updated, and deleted

### Requirement 4

**User Story:** As a developer, I want the sync logic to be maintainable and clear, so that future modifications can be made safely without introducing new bugs.

#### Acceptance Criteria

1. THE Avail System SHALL use a single consistent method for matching Google Calendar events to existing time slots based on sourceId
2. THE Avail System SHALL include logging statements that indicate when duplicates are prevented during sync operations
3. THE Avail System SHALL handle edge cases where sourceId might be null or empty string
