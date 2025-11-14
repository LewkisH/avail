# Requirements Document

## Introduction

The Group Activity Planner is a Next.js web application that enables users to form groups with friends, share their interests and budgets, sync their calendars, and receive AI-powered suggestions for activities and events that fit the group's collective preferences and availability. The system integrates with Clerk for authentication, uses PostgreSQL for data persistence, imports calendar data via ICS format, aggregates events from multiple external APIs, and leverages an LLM to provide intelligent activity recommendations.

## Glossary

- **System**: The Group Activity Planner web application
- **User**: An authenticated individual who can create or join groups
- **Group**: A collection of users who share interests, budgets, and calendar availability
- **Calendar**: A user's schedule imported from Google Calendar or via ICS format
- **Event**: An activity or time block in a user's calendar
- **External Event**: An activity or event retrieved from third-party APIs
- **Activity Suggestion**: An AI-generated recommendation for group activities
- **Interest**: A category or topic that a user enjoys (e.g., sports, music, dining)
- **Budget**: The monetary range a user is willing to spend on activities
- **Event Aggregator**: The service that fetches and normalizes events from external APIs
- **LLM Service**: The AI service that generates activity suggestions based on group data
- **Unified Event Interface**: A TypeScript interface that standardizes event data from all sources (Google Calendar, ICS files, external APIs, manual entries)
- **Event Adapter**: A component that transforms source-specific event data into the Unified Event Interface format

## Requirements

### Requirement 1

**User Story:** As a new user, I want to authenticate using Clerk, so that I can securely access the application and manage my profile.

#### Acceptance Criteria

1. WHEN a user navigates to the System, THE System SHALL display a Clerk authentication interface
2. WHEN a user completes authentication, THE System SHALL create a user record in the PostgreSQL database
3. WHEN a user logs out, THE System SHALL terminate the user session and redirect to the login page
4. THE System SHALL store the Clerk user identifier in the PostgreSQL database for session management

### Requirement 2

**User Story:** As a user, I want to create a group and invite friends, so that we can plan activities together.

#### Acceptance Criteria

1. WHEN a user requests to create a group, THE System SHALL create a new group record with the user as the owner
2. WHEN a user sends an invitation, THE System SHALL create an invitation record with a unique identifier
3. WHEN an invited user accepts an invitation, THE System SHALL add the user to the group membership
4. THE System SHALL allow a user to view all groups they belong to
5. WHEN a user requests to leave a group, THE System SHALL remove the user from the group membership

### Requirement 3

**User Story:** As a user, I want to specify my interests and budget, so that activity suggestions match my preferences.

#### Acceptance Criteria

1. WHEN a user adds an interest, THE System SHALL store the interest in the PostgreSQL database linked to the user profile
2. WHEN a user sets a budget range, THE System SHALL store the minimum and maximum budget values in the user profile
3. THE System SHALL allow a user to update their interests at any time
4. THE System SHALL allow a user to update their budget range at any time
5. WHEN a user views their profile, THE System SHALL display all current interests and budget information

### Requirement 4

**User Story:** As a user, I want to import my calendar from Google Calendar or via ICS file, so that the system knows my availability.

#### Acceptance Criteria

1. WHEN a user initiates Google Calendar integration, THE System SHALL authenticate with Google Calendar API using OAuth 2.0 and fetch events as JSON data
2. WHEN Google Calendar authentication succeeds, THE System SHALL retrieve calendar events and transform them into the System's event format
3. WHEN a user uploads an ICS file from any calendar provider, THE System SHALL parse the ICS format and extract event information
4. WHEN calendar data is successfully retrieved or parsed, THE System SHALL store the events in the PostgreSQL database linked to the user
5. IF calendar synchronization or parsing fails, THEN THE System SHALL display an error message with details about the failure
6. THE System SHALL allow a user to add individual events manually to their calendar
7. WHEN a user views their calendar, THE System SHALL display all imported and manually added events

### Requirement 5

**User Story:** As a system administrator, I want the Event Aggregator to fetch events from multiple external APIs, so that users have diverse activity options.

#### Acceptance Criteria

1. WHEN the Event Aggregator retrieves an event from an external API, THE System SHALL transform the payload into a unified TypeScript interface
2. THE System SHALL store normalized external events in the PostgreSQL database
3. WHEN an external API request fails, THE System SHALL log the error and continue processing other sources
4. THE System SHALL execute the Event Aggregator on a scheduled basis to refresh external events
5. THE System SHALL include source attribution for each external event

### Requirement 6

**User Story:** As a user, I want to receive AI-powered activity suggestions for my group, so that we can discover activities that fit our collective preferences and availability.

#### Acceptance Criteria

1. WHEN a user requests activity suggestions, THE System SHALL retrieve all group members' interests, budgets, and calendar availability
2. WHEN the LLM Service receives group data, THE System SHALL generate activity suggestions that match the group's criteria
3. THE System SHALL filter external events to only include those within the group's budget range
4. THE System SHALL identify time slots where all group members are available
5. WHEN suggestions are generated, THE System SHALL display the activities with relevant details including time, cost, and description

### Requirement 7

**User Story:** As a developer, I want all calendar and event data to use a unified TypeScript interface, so that the system can handle events from different sources consistently.

#### Acceptance Criteria

1. THE System SHALL define a Unified Event Interface with fields for title, start time, end time, timezone, description, location, and source
2. WHEN the System receives Google Calendar API data, THE System SHALL use the googleapis library to fetch events and transform them via an Event Adapter
3. WHEN the System receives ICS file data, THE System SHALL use the ical.js or node-ical library to parse events and transform them via an Event Adapter
4. WHEN the System receives external API data, THE System SHALL transform the payload via an Event Adapter into the Unified Event Interface
5. THE System SHALL store all events in the PostgreSQL database using the Unified Event Interface schema
6. THE System SHALL use date-fns or luxon library for timezone conversions and date manipulation across all event sources

### Requirement 8

**User Story:** As a user, I want the application to be deployed on Vercel with a PostgreSQL database, so that it is reliable and scalable.

#### Acceptance Criteria

1. THE System SHALL be deployed as a Next.js application on Vercel
2. THE System SHALL connect to a PostgreSQL database for data persistence
3. WHEN the System starts, THE System SHALL verify database connectivity before accepting requests
4. THE System SHALL use environment variables for database connection credentials
5. THE System SHALL handle database connection failures gracefully with appropriate error messages
