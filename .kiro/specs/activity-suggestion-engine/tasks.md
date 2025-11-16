# Implementation Plan

- [x] 1. Set up Gemini API integration
  - Install @google/generative-ai package
  - Add GEMINI_API_KEY to environment variables
  - Create lib/services/gemini.service.ts with initialization and client setup
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 2. Implement GeminiService core functionality
  - [x] 2.1 Create prompt building method
    - Implement buildPrompt method that constructs contextual prompt
    - Include time of day, locations, interests, season, member count
    - Format prompt to request JSON array response
    - Add instructions for young people demographic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.2 Implement activity generation method
    - Create generateActivities method that calls Gemini API
    - Use gemini-1.5-flash model
    - Pass constructed prompt to API
    - Handle API response and errors
    - _Requirements: 3.7, 6.1_

  - [x] 2.3 Implement response parsing and validation
    - Create parseResponse method to extract JSON from Gemini response
    - Handle markdown code blocks in response
    - Implement validateActivity method to check required fields
    - Filter out invalid activities from response
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.3_

- [x] 3. Implement ActivitySuggestionService
  - [x] 3.1 Create external event matching logic
    - Implement findOverlappingExternalEvents method
    - Query external events with time overlap logic
    - Filter by group members' locations
    - Order by start time and limit results
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Create suggestion creation from external events
    - Implement createSuggestionsFromExternalEvents method
    - Check for existing suggestions to avoid duplicates
    - Create ActivitySuggestion records linked to external events
    - Generate appropriate reasoning text
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.3 Implement AI activity generation
    - Create generateAIActivities method
    - Gather group context (locations, interests, member count)
    - Calculate time of day and season from time slot
    - Call GeminiService.generateActivities
    - Create ActivitySuggestion records from AI-generated activities
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 3.4 Implement main generateSuggestions orchestration method
    - Get current suggestion count for time slot
    - Calculate needed suggestions to reach 6
    - Call findOverlappingExternalEvents and create suggestions
    - Calculate remaining needed suggestions after external events
    - Call generateAIActivities for remaining suggestions
    - Return summary of created suggestions
    - _Requirements: 1.1, 1.2, 1.4, 5.3_

  - [x] 3.5 Implement getSuggestionCount helper method
    - Query ActivitySuggestion table for group and time range
    - Return count of existing suggestions
    - _Requirements: 1.1_

- [x] 4. Create API endpoint for suggestion generation
  - [x] 4.1 Implement POST /api/groups/[id]/time-slots/generate-suggestions route
    - Validate user is member of the group
    - Parse and validate startTime and endTime from request body
    - Call ActivitySuggestionService.generateSuggestions
    - Return formatted response with created suggestions
    - Handle errors gracefully with appropriate status codes
    - _Requirements: 1.2, 5.1, 5.2, 5.5, 6.1, 6.2, 6.4_

- [x] 5. Create frontend AI Suggestion button component
  - [x] 5.1 Add AI Suggestion button to time slot view
    - Identify where to add button in existing time slot modal/view
    - Create button component with conditional rendering
    - Show button only when suggestion count < 6
    - Hide button when suggestion count >= 6
    - _Requirements: 1.1, 1.3_

  - [x] 5.2 Implement button click handler and loading states
    - Create handleGenerateSuggestions function
    - Make POST request to generation endpoint
    - Show loading spinner and "Generating..." text during request
    - Handle success by updating suggestions list
    - Handle errors with user-friendly message and retry option
    - _Requirements: 1.2, 5.1, 5.2, 5.5_

  - [x] 5.3 Update time slot view to display new suggestions
    - Implement callback to refresh suggestions after generation
    - Update UI to show newly created suggestions
    - Ensure button hides after reaching 6 suggestions
    - _Requirements: 5.5_

- [ ] 6. Add error handling and edge cases
  - Handle Gemini API failures gracefully without blocking
  - Handle external event query failures
  - Validate all generated activity data before storing
  - Add logging for debugging generation issues
  - Handle partial success scenarios (some suggestions created)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Add rate limiting and security measures
  - Implement rate limiting on generation endpoint
  - Add input validation and sanitization
  - Verify API key is properly secured in environment
  - Add per-user or per-group generation limits
  - _Requirements: 6.1_
