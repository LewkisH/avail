# Design Document

## Overview

This feature enhances the existing AI activity suggestion engine with four key improvements:
1. **External Event Prioritization**: Sort results to show real external events before AI-generated suggestions
2. **Personalized Reasoning**: Include user-specific interest-based reasoning in AI suggestions (e.g., "Steve enjoys Biking so he would love this event")
3. **Interest Prompt**: Display a helpful message when no users have interests configured
4. **Realistic Time Frames**: Generate AI activities with appropriate durations instead of using the entire time slot

These improvements build on the existing `ActivitySuggestionService` and `GeminiService` without requiring database schema changes.

## Architecture

### High-Level Changes

**Existing Flow:**
1. User clicks "AI Suggestion" button
2. Backend queries external events
3. Backend generates AI activities for remaining slots
4. Frontend displays all suggestions (mixed order)

**Enhanced Flow:**
1. User clicks "AI Suggestion" button
2. Backend queries external events
3. Backend gathers user names and interests for personalization
4. Backend generates AI activities with:
   - Personalized reasoning based on user interests
   - Realistic time frames (not entire slot duration)
   - Interest prompt if no users have interests
5. Backend sorts results: external events first, then AI suggestions
6. Frontend displays prioritized suggestions

## Components and Interfaces

### Backend Services

#### ActivitySuggestionService (Enhanced)

**New Method:**
```typescript
/**
 * Sort suggestions to prioritize external events over AI-generated ones
 * @param suggestions Array of activity suggestions
 * @returns Sorted array with external events first
 */
private static sortSuggestionsByPriority(
  suggestions: ActivitySuggestion[]
): ActivitySuggestion[]
```

**Modified Method:**
```typescript
/**
 * Generate AI-powered activity suggestions using Gemini
 * NOW INCLUDES: User names and interests for personalization
 * @param groupId ID of the group
 * @param count Number of activities to generate
 * @param context Context information including user details
 * @returns Array of created activity suggestions
 */
private static async generateAIActivities(
  groupId: string,
  count: number,
  context: ActivityContext // Enhanced with user details
): Promise<ActivitySuggestion[]>
```

**Modified Interface:**
```typescript
interface ActivityContext {
  startTime: Date;
  endTime: Date;
  locations: string[];
  interests: string[]; // Keep for backward compatibility
  memberCount: number;
  season: string;
  timeOfDay: string;
  // NEW FIELDS:
  userInterests: Array<{ // Detailed user-interest mapping
    userName: string;
    interests: string[];
  }>;
  hasAnyInterests: boolean; // Flag to determine if interest prompt needed
}
```

#### GeminiService (Enhanced)

**Modified Method:**
```typescript
/**
 * Generate activity suggestions using Gemini API
 * NOW INCLUDES: Personalization and realistic time frames
 * @param count Number of activities to generate
 * @param context Enhanced context with user details
 * @returns Array of generated activities with personalized reasoning
 */
static async generateActivities(
  count: number,
  context: ActivityContext
): Promise<GeneratedActivity[]>
```

**Modified Prompt Building:**
```typescript
/**
 * Build contextual prompt for Gemini API
 * NOW INCLUDES:
 * - User names and their interests for personalization
 * - Instructions for realistic activity durations
 * - Interest prompt handling
 * @param count Number of activities to generate
 * @param context Enhanced context information
 * @returns Formatted prompt string
 */
private static buildPrompt(
  count: number,
  context: ActivityContext
): string
```

### API Endpoints

#### POST /api/groups/[id]/time-slots/generate-suggestions (Enhanced)

**Response Changes:**
```typescript
{
  success: boolean;
  result: {
    created: number;
    fromExternalEvents: number;
    fromAI: number;
    total: number;
  };
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    category: string;
    startTime: string; // NOW: Realistic time within slot
    endTime: string;   // NOW: Realistic duration
    cost: number;
    reasoning: string; // NOW: Personalized with user names
    externalEventId?: string;
    isExternalEvent: boolean; // NEW: Flag for sorting
  }>;
  // Suggestions are now sorted: external events first
}
```

## Data Flow

### Enhanced Suggestion Generation Process

```
1. User clicks "AI Suggestion" button
   ↓
2. Backend: ActivitySuggestionService.generateSuggestions()
   ↓
3. Query existing suggestions count
   ↓
4. Find overlapping external events (unchanged)
   ↓
5. Create suggestions from external events (unchanged)
   ↓
6. Gather enhanced group context:
   ├─ Get all member locations (existing)
   ├─ Get all member interests (existing)
   ├─ NEW: Build userInterests array with names
   │  └─ Format: [{ userName: "Steve", interests: ["Biking", "Hiking"] }]
   ├─ NEW: Set hasAnyInterests flag
   ├─ Calculate time of day (existing)
   ├─ Calculate season (existing)
   └─ Count members (existing)
   ↓
7. Call GeminiService.generateActivities() with enhanced context
   ├─ Build enhanced prompt:
   │  ├─ Include user names and interests
   │  ├─ Add personalization instructions
   │  ├─ Add realistic duration instructions
   │  └─ Add interest prompt handling
   ├─ Call Gemini API
   ├─ Parse JSON response
   └─ Validate activities
   ↓
8. Create ActivitySuggestion records
   ├─ Store personalized reasoning
   └─ Store realistic start/end times
   ↓
9. NEW: Sort all suggestions by priority
   ├─ External events first
   └─ AI suggestions second
   ↓
10. Return sorted results to frontend
    ↓
11. Frontend displays prioritized suggestions
```

## Gemini Integration Enhancements

### Enhanced Prompt Template

```
You are an activity suggestion assistant for a group of young people planning to hang out together.

Context:
- Date & Time: {startTime} to {endTime} ({timeOfDay})
- Season: {season}
- Locations: {locations}
- Group Size: {memberCount} people

Group Members and Their Interests:
{userInterestsFormatted}
// Example:
// - Steve: Biking, Hiking, Photography
// - Sarah: Cooking, Art, Music
// - Mike: Sports, Gaming

{IF hasAnyInterests === false}
IMPORTANT: Since no group members have specified interests, include one special suggestion:
{
  "title": "Add Interests for Better Suggestions",
  "description": "Add interests on the profile page to get better suggestions! We'll be able to recommend activities tailored to what you and your friends enjoy.",
  "location": "Profile Settings",
  "category": "System",
  "estimatedCost": 0,
  "reasoning": "Personalized suggestions work best when we know what you enjoy"
}
{END IF}

Generate {count} diverse activity suggestions that would appeal to young people in this context.

For each activity, provide:
1. title: Short, catchy name
2. description: 2-3 sentences describing the activity
3. location: Specific venue or area in one of the provided locations
4. category: Type of activity (e.g., Food & Drink, Sports, Arts, Entertainment, Outdoor, Social)
5. estimatedCost: Approximate cost per person in EUR (number only)
6. reasoning: PERSONALIZED explanation referencing specific users and their interests
   - Format: "[User name] enjoys [interest] so they would love this event"
   - Example: "Steve enjoys Biking so he would love this mountain trail ride"
   - If multiple users share an interest: "Steve and Sarah both enjoy Art so they would love this gallery opening"
   - Make it personal and specific to the group members
7. startTime: Realistic start time within the available window (ISO format)
8. endTime: Realistic end time based on typical activity duration (ISO format)

IMPORTANT - Realistic Time Frames:
- DO NOT use the entire time slot duration for each activity
- Consider typical activity lengths:
  * Coffee/drinks: 1-2 hours
  * Dinner: 2-3 hours
  * Movie: 2-3 hours
  * Sports activity: 1-3 hours
  * Museum/gallery: 2-4 hours
  * Concert/show: 2-4 hours
  * Outdoor activity: 2-6 hours
- Start times should be within the available window
- Activities can start at different times within the slot
- Be realistic about what can be accomplished in the time available

Consider:
- Time of day (morning activities vs evening activities)
- Season (indoor vs outdoor based on weather)
- Local culture and venues in {locations}
- Budget-friendly options for young people
- Mix of active and relaxed activities
- Social bonding opportunities
- PERSONALIZE based on the specific interests of group members

Return ONLY a valid JSON array with no additional text:
[
  {
    "title": "...",
    "description": "...",
    "location": "...",
    "category": "...",
    "estimatedCost": 0,
    "reasoning": "[User] enjoys [interest] so they would love this...",
    "startTime": "2024-01-15T14:00:00Z",
    "endTime": "2024-01-15T16:00:00Z"
  }
]
```

### Enhanced Response Parsing

```typescript
interface GeneratedActivity {
  title: string;
  description: string;
  location: string;
  category: string;
  estimatedCost: number;
  reasoning: string;
  startTime: string; // NEW: ISO datetime string
  endTime: string;   // NEW: ISO datetime string
}

private static parseResponse(response: string): GeneratedActivity[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      return [];
    }

    const activities = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(activities)) {
      console.error('Parsed response is not an array');
      return [];
    }

    // Validate and filter activities
    return activities.filter((activity: any) => 
      this.validateActivity(activity)
    );
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return [];
  }
}

private static validateActivity(activity: any): boolean {
  // Existing validations
  const hasValidTitle = typeof activity.title === 'string' && activity.title.trim().length > 0;
  const hasValidDescription = typeof activity.description === 'string' && activity.description.trim().length > 0;
  const hasValidLocation = typeof activity.location === 'string' && activity.location.trim().length > 0;
  const hasValidCategory = typeof activity.category === 'string' && activity.category.trim().length > 0;
  const hasValidCost = typeof activity.estimatedCost === 'number' && !isNaN(activity.estimatedCost) && activity.estimatedCost >= 0;
  const hasValidReasoning = typeof activity.reasoning === 'string' && activity.reasoning.trim().length > 0;
  
  // NEW: Validate time fields
  const hasValidStartTime = typeof activity.startTime === 'string' && !isNaN(Date.parse(activity.startTime));
  const hasValidEndTime = typeof activity.endTime === 'string' && !isNaN(Date.parse(activity.endTime));
  
  // NEW: Validate time logic
  let validTimeRange = true;
  if (hasValidStartTime && hasValidEndTime) {
    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);
    validTimeRange = start < end;
  }

  return (
    hasValidTitle &&
    hasValidDescription &&
    hasValidLocation &&
    hasValidCategory &&
    hasValidCost &&
    hasValidReasoning &&
    hasValidStartTime &&
    hasValidEndTime &&
    validTimeRange
  );
}
```

### Enhanced Context Calculation

```typescript
private static calculateContext(
  startTime: Date,
  endTime: Date,
  groupMembers: UserWithInterests[]
): ActivityContext {
  // Existing calculations
  const locations = [...new Set(
    groupMembers
      .map(m => m.location)
      .filter(Boolean) as string[]
  )];

  const interests = groupMembers
    .flatMap(m => m.interests.map(i => i.interest));

  const hour = startTime.getHours();
  const timeOfDay = 
    hour < 12 ? 'morning' :
    hour < 17 ? 'afternoon' :
    hour < 21 ? 'evening' : 'night';

  const month = startTime.getMonth();
  const season = 
    month < 3 ? 'winter' :
    month < 6 ? 'spring' :
    month < 9 ? 'summer' : 'autumn';

  // NEW: Build user-interest mapping
  const userInterests = groupMembers
    .filter(m => m.name) // Ensure user has a name
    .map(m => ({
      userName: m.name!,
      interests: m.interests.map(i => i.interest),
    }));

  // NEW: Check if any users have interests
  const hasAnyInterests = userInterests.some(
    ui => ui.interests.length > 0
  );

  return {
    startTime,
    endTime,
    locations,
    interests, // Keep for backward compatibility
    memberCount: groupMembers.length,
    season,
    timeOfDay,
    // NEW FIELDS:
    userInterests,
    hasAnyInterests,
  };
}
```

## Sorting Logic

### Priority-Based Sorting

```typescript
/**
 * Sort suggestions to prioritize external events over AI-generated ones
 * External events are always shown first
 */
private static sortSuggestionsByPriority(
  suggestions: ActivitySuggestion[]
): ActivitySuggestion[] {
  return suggestions.sort((a, b) => {
    // External events (have externalEventId) come first
    const aIsExternal = !!a.externalEventId;
    const bIsExternal = !!b.externalEventId;
    
    if (aIsExternal && !bIsExternal) return -1;
    if (!aIsExternal && bIsExternal) return 1;
    
    // Within same type, maintain creation order (most recent first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
```

### Application in API Response

```typescript
// In generate-suggestions route.ts
// After fetching suggestions from database:

const sortedSuggestions = suggestions.sort((a, b) => {
  const aIsExternal = !!a.externalEventId;
  const bIsExternal = !!b.externalEventId;
  
  if (aIsExternal && !bIsExternal) return -1;
  if (!aIsExternal && bIsExternal) return 1;
  
  return b.createdAt.getTime() - a.createdAt.getTime();
});

// Format and return sorted suggestions
const formattedSuggestions = sortedSuggestions.map(suggestion => ({
  // ... existing fields
  isExternalEvent: !!suggestion.externalEventId,
}));
```

## Interest Prompt Handling

### Special Suggestion Creation

When `hasAnyInterests === false`, the Gemini API will include a special suggestion in its response:

```json
{
  "title": "Add Interests for Better Suggestions",
  "description": "Add interests on the profile page to get better suggestions! We'll be able to recommend activities tailored to what you and your friends enjoy.",
  "location": "Profile Settings",
  "category": "System",
  "estimatedCost": 0,
  "reasoning": "Personalized suggestions work best when we know what you enjoy",
  "startTime": "[same as slot start]",
  "endTime": "[same as slot end]"
}
```

This suggestion will:
- Be stored in the database like other AI suggestions
- Be displayed in the UI with other suggestions
- Not count toward the 6-suggestion limit (we'll request count + 1 if no interests)

### Implementation in generateAIActivities

```typescript
private static async generateAIActivities(
  groupId: string,
  count: number,
  context: ActivityContext
): Promise<ActivitySuggestion[]> {
  // If no interests, request one extra for the interest prompt
  const requestCount = context.hasAnyInterests ? count : count + 1;
  
  const generatedActivities = await GeminiService.generateActivities(
    requestCount,
    context
  );
  
  // Create suggestions from generated activities
  // The interest prompt will be included automatically if present
  // ...
}
```

## Realistic Time Frame Logic

### Duration Guidelines

The Gemini prompt will include specific duration guidelines:

| Activity Type | Typical Duration |
|--------------|------------------|
| Coffee/Drinks | 1-2 hours |
| Meal (Lunch/Dinner) | 2-3 hours |
| Movie/Show | 2-3 hours |
| Sports Activity | 1-3 hours |
| Museum/Gallery | 2-4 hours |
| Concert/Performance | 2-4 hours |
| Outdoor Activity | 2-6 hours |
| Workshop/Class | 2-3 hours |

### Time Window Calculation

For long time slots (> 4 hours), activities should:
- Start at various times within the window
- Have durations appropriate to the activity type
- Not automatically fill the entire slot

Example:
- Time Slot: 2:00 PM - 10:00 PM (8 hours)
- Activity 1: Lunch at 2:00 PM - 4:00 PM (2 hours)
- Activity 2: Museum visit at 3:00 PM - 6:00 PM (3 hours)
- Activity 3: Dinner at 6:00 PM - 9:00 PM (3 hours)
- Activity 4: Movie at 7:00 PM - 9:30 PM (2.5 hours)

### Validation

The `validateActivity` method will ensure:
- Start time is within the original time slot
- End time is within the original time slot
- Duration is reasonable (not too short, not too long)
- Start time < End time

## Error Handling

### Personalization Failures

**Missing User Names:**
- Skip users without names in personalization
- Fall back to generic reasoning if no names available
- Log warning but don't fail generation

**Empty Interests:**
- Generate interest prompt suggestion
- Continue with generic reasoning for other activities
- Don't fail the entire generation

### Time Parsing Failures

**Invalid Time Strings:**
- Validate ISO format in parseResponse
- Filter out activities with invalid times
- Log warning and continue with valid activities

**Times Outside Slot:**
- Validate times are within original slot
- Adjust if slightly outside (grace period)
- Filter out if significantly outside

### Sorting Failures

**Missing Fields:**
- Handle null/undefined externalEventId gracefully
- Default to treating as AI suggestion
- Maintain stable sort order

## Performance Considerations

### Minimal Database Changes

- No schema changes required
- Uses existing ActivitySuggestion model
- Sorting happens in-memory after fetch

### Prompt Size

- User interest list adds ~50-200 characters per user
- Still well within Gemini token limits
- No significant performance impact

### Response Parsing

- Additional validation for time fields
- Minimal overhead (~1-2ms per activity)
- Fail gracefully on invalid data

## Testing Strategy

### Unit Tests

**GeminiService:**
- Test enhanced prompt building with user interests
- Test prompt building without interests (interest prompt)
- Test response parsing with time fields
- Test validation with realistic time ranges

**ActivitySuggestionService:**
- Test context calculation with user interests
- Test sorting logic (external events first)
- Test interest prompt handling
- Test realistic time frame validation

### Integration Tests

**API Endpoint:**
- Test full flow with users who have interests
- Test full flow with users who have no interests
- Test sorting in response
- Test personalized reasoning in results

### Manual Testing

**Personalization Quality:**
- Review reasoning for relevance to user interests
- Verify user names appear correctly
- Check interest prompt appears when appropriate

**Time Realism:**
- Verify activities have appropriate durations
- Check activities don't always fill entire slot
- Ensure times are within original slot

**Sorting:**
- Verify external events appear first
- Check AI suggestions appear after external events
- Confirm order is stable and predictable

## Future Enhancements

1. **Multi-language Support**: Personalize reasoning in user's preferred language
2. **Interest Weighting**: Prioritize activities matching multiple users' interests
3. **Time Preference Learning**: Learn preferred activity times from user behavior
4. **Dynamic Duration Adjustment**: Adjust durations based on group size
5. **Conflict Detection**: Warn if suggested times conflict with user calendars
