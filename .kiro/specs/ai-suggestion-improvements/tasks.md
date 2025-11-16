# Implementation Plan

- [x] 1. Enhance ActivityContext interface and context calculation
  - Update ActivityContext interface in activity-suggestion.service.ts to include userInterests array and hasAnyInterests flag
  - Modify calculateContext method to build user-interest mapping with user names
  - Add logic to determine if any group members have interests configured
  - Ensure backward compatibility with existing interests array
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Update GeminiService prompt building for personalization
  - [x] 2.1 Enhance buildPrompt method to include user interests
    - Add section to prompt that lists each user's name and their interests
    - Format as "- [User name]: [interest1], [interest2], ..."
    - Pass userInterests array from enhanced context
    - _Requirements: 2.1, 2.4_

  - [x] 2.2 Add personalization instructions to prompt
    - Include instructions for formatting personalized reasoning
    - Specify format: "[User name] enjoys [interest] so they would love this event"
    - Add examples for single user and multiple users with shared interests
    - _Requirements: 2.2, 2.3_

  - [x] 2.3 Add interest prompt handling to prompt
    - Add conditional section when hasAnyInterests is false
    - Include instructions to generate special "Add interests" suggestion
    - Specify exact format for the interest prompt suggestion
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.4 Add realistic time frame instructions to prompt
    - Include table of typical activity durations by category
    - Add instructions to not use entire time slot duration
    - Specify that activities should have realistic start and end times within the slot
    - Add examples of varied start times for long slots
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Update GeneratedActivity interface and validation
  - [x] 3.1 Add time fields to GeneratedActivity interface
    - Add startTime: string field for ISO datetime
    - Add endTime: string field for ISO datetime
    - Update interface in gemini.service.ts
    - _Requirements: 4.1, 4.2_

  - [x] 3.2 Enhance validateActivity method
    - Add validation for startTime field (string, valid ISO format)
    - Add validation for endTime field (string, valid ISO format)
    - Add validation that startTime < endTime
    - Add validation that times are within reasonable bounds
    - _Requirements: 4.1, 4.2, 5.4_

- [x] 4. Update generateAIActivities to use realistic times
  - [x] 4.1 Modify generateAIActivities to handle interest prompt
    - Calculate requestCount: add 1 if hasAnyInterests is false
    - Pass enhanced context to GeminiService.generateActivities
    - _Requirements: 3.3, 3.4_

  - [x] 4.2 Update activity suggestion creation with realistic times
    - Parse startTime and endTime from generated activities
    - Convert ISO strings to Date objects
    - Store parsed times in ActivitySuggestion records instead of slot times
    - Validate times are within original slot boundaries
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 5. Implement suggestion sorting logic
  - [x] 5.1 Add sorting in generateSuggestions method
    - After creating all suggestions, fetch them from database
    - Sort suggestions with external events first (check externalEventId)
    - Within same type, sort by creation time (most recent first)
    - Return sorted suggestions
    - _Requirements: 1.1, 1.2_

  - [x] 5.2 Update API endpoint to return sorted suggestions
    - Modify generate-suggestions route.ts to sort fetched suggestions
    - Add isExternalEvent flag to formatted response
    - Ensure sorting is applied before returning to frontend
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Add error handling for edge cases
  - Handle missing user names gracefully in context calculation
  - Handle empty interests arrays without errors
  - Validate time parsing and provide fallbacks
  - Log warnings for invalid personalization data
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Update frontend to display sorted suggestions
  - Verify frontend correctly displays suggestions in returned order
  - Ensure external events appear at top of list
  - Confirm personalized reasoning is displayed properly
  - Check that interest prompt suggestion is visible when present
  - _Requirements: 1.3, 2.1, 3.2_
P