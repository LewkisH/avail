# Requirements Document

## Introduction

This feature enhances the AI activity suggestion engine to provide more personalized, realistic, and user-friendly suggestions. The improvements focus on prioritizing external events, adding personalized reasoning based on user interests, handling cases where users lack interests, and generating realistic time frames for AI suggestions.

## Glossary

- **Activity Suggestion Engine**: The system component that generates and manages activity suggestions for group time slots
- **External Event**: A real-world event from external APIs (concerts, meetups, etc.) that can be suggested as an activity
- **AI-Generated Activity**: An activity suggestion created by the Gemini API based on contextual factors
- **Activity Suggestion**: A proposed activity for a group, either from an external event or AI-generated
- **User Interest**: A topic or activity type that a user has indicated they enjoy
- **Personalized Reasoning**: An explanation for why an activity was suggested that references specific user interests

## Requirements

### Requirement 1

**User Story:** As a user, I want to see external events prioritized over AI suggestions in the results, so that I can discover real events happening in my area first

#### Acceptance Criteria

1. WHEN displaying activity suggestions, THE Activity Suggestion Engine SHALL sort external event suggestions before AI-generated suggestions
2. THE Activity Suggestion Engine SHALL maintain the prioritization order when returning suggestions to the frontend
3. THE Activity Suggestion Engine SHALL display external events at the top of the suggestion list in the UI

### Requirement 2

**User Story:** As a user, I want AI suggestions to include personalized reasoning based on my interests, so that I understand why each activity was recommended for me

#### Acceptance Criteria

1. WHEN generating AI activity descriptions, THE Activity Suggestion Engine SHALL include reasoning that references specific user interests
2. THE Activity Suggestion Engine SHALL format personalized reasoning as "[User name] enjoys [interest] so they would love this event"
3. WHEN multiple users share an interest, THE Activity Suggestion Engine SHALL mention multiple users in the reasoning
4. THE Activity Suggestion Engine SHALL provide the Gemini API with user names and their interests for personalization

### Requirement 3

**User Story:** As a user without interests configured, I want to see a helpful message encouraging me to add interests, so that I can get better suggestions in the future

#### Acceptance Criteria

1. WHEN no group members have interests configured, THE Activity Suggestion Engine SHALL include a special suggestion message
2. THE Activity Suggestion Engine SHALL display "Add interests on the profile page to get better suggestions!" as a suggestion item
3. THE Activity Suggestion Engine SHALL programmatically insert the interests message when generating suggestions
4. THE Activity Suggestion Engine SHALL not count the interests message toward the 6 suggestion limit

### Requirement 4

**User Story:** As a user, I want AI-generated activities to have realistic time frames, so that the suggestions are practical and achievable

#### Acceptance Criteria

1. WHEN generating AI activities for long time slots, THE Activity Suggestion Engine SHALL not use the entire available time
2. THE Activity Suggestion Engine SHALL generate activity durations appropriate for the activity type
3. THE Activity Suggestion Engine SHALL provide the Gemini API with guidance on realistic activity durations
4. THE Activity Suggestion Engine SHALL instruct the Gemini API to consider typical activity lengths (e.g., 2-3 hours for dinner, 1-2 hours for coffee)
5. WHEN a time slot is longer than 4 hours, THE Activity Suggestion Engine SHALL generate activities that fit within reasonable sub-windows of the available time

### Requirement 5

**User Story:** As a developer, I want the personalization logic to handle edge cases gracefully, so that the system works reliably for all user configurations

#### Acceptance Criteria

1. WHEN some users have interests and others do not, THE Activity Suggestion Engine SHALL generate personalized reasoning for users with interests
2. WHEN generating reasoning for users without interests, THE Activity Suggestion Engine SHALL use generic reasoning
3. THE Activity Suggestion Engine SHALL validate that user names exist before including them in reasoning
4. THE Activity Suggestion Engine SHALL handle empty or null interest arrays without errors
