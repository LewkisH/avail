# Design Document

## Overview

This feature provides an AI-powered activity suggestion engine that generates contextually relevant activities for group time slots. When a time slot has fewer than 6 activity suggestions, users can click an "AI Suggestion" button to trigger automatic generation. The system first searches for overlapping external events, then uses the Gemini API to generate additional activities based on group context (interests, locations, time of day, season, group size).

## Architecture

### High-Level Flow

1. User views a time slot with fewer than 6 activity suggestions
2. UI displays "AI Suggestion" button
3. User clicks button to trigger generation
4. Backend process:
   - Query external events overlapping the time slot
   - Filter by group members' locations
   - Create activity suggestions from matching external events
   - Calculate remaining suggestions needed to reach 6
   - Generate AI activities using Gemini API with group context
   - Store all new suggestions in database
5. Frontend updates to display new suggestions

### Technology Stack

- **AI SDK**: @google/generative-ai (official Google SDK)
- **Model**: gemini-1.5-flash (fast, cost-effective for this use case)
- **API Key**: Stored in environment variable `GEMINI_API_KEY`

## Components and Interfaces

### Backend Services

#### ActivitySuggestionService

New service for managing activity suggestion generation.

```typescript
interface GenerateSuggestionsParams {
  groupId: string;
  timeSlotId: string;
  startTime: Date;
  endTime: Date;
}

interface GenerateSuggestionsResult {
  created: number;
  fromExternalEvents: number;
  fromAI: number;
  total: number;
}

class ActivitySuggestionService {
  /**
   * Generate activity suggestions for a time slot
   * First adds external events, then AI-generated activities
   */
  static async generateSuggestions(
    params: GenerateSuggestionsParams
  ): Promise<GenerateSuggestionsResult>

  /**
   * Find external events overlapping the time slot
   * Filters by group members' locations
   */
  private static async findOverlappingExternalEvents(
    startTime: Date,
    endTime: Date,
    locations: string[]
  ): Promise<ExternalEvent[]>

  /**
   * Create activity suggestions from external events
   */
  private static async createSuggestionsFromExternalEvents(
    groupId: string,
    externalEvents: ExternalEvent[]
  ): Promise<ActivitySuggestion[]>

  /**
   * Generate AI activities using Gemini API
   */
  private static async generateAIActivities(
    groupId: string,
    count: number,
    context: ActivityContext
  ): Promise<ActivitySuggestion[]>

  /**
   * Get current suggestion count for a time slot
   */
  static async getSuggestionCount(
    groupId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number>
}
```

#### GeminiService

New service for interacting with Gemini API.

```typescript
interface ActivityContext {
  startTime: Date;
  endTime: Date;
  locations: string[];
  interests: string[];
  memberCount: number;
  season: string;
  timeOfDay: string;
}

interface GeneratedActivity {
  title: string;
  description: string;
  location: string;
  category: string;
  estimatedCost: number;
  reasoning: string;
}

class GeminiService {
  private static client: GoogleGenerativeAI;
  private static model: GenerativeModel;

  /**
   * Initialize Gemini client
   */
  static initialize(): void

  /**
   * Generate activity suggestions using Gemini API
   */
  static async generateActivities(
    count: number,
    context: ActivityContext
  ): Promise<GeneratedActivity[]>

  /**
   * Build prompt for Gemini based on context
   */
  private static buildPrompt(
    count: number,
    context: ActivityContext
  ): string

  /**
   * Parse Gemini response into structured activities
   */
  private static parseResponse(
    response: string
  ): GeneratedActivity[]

  /**
   * Validate generated activity data
   */
  private static validateActivity(
    activity: GeneratedActivity
  ): boolean
}
```

### API Endpoints

#### POST /api/groups/[id]/time-slots/[timeSlotId]/generate-suggestions

Trigger activity suggestion generation for a time slot.

**Request Body:**
```typescript
{
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
}
```

**Response:**
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
    startTime: string;
    endTime: string;
    cost: number;
    reasoning: string;
    externalEventId?: string;
  }>;
}
```

**Error Responses:**
- 400: Invalid request (missing parameters, invalid dates)
- 401: Unauthorized (user not in group)
- 404: Group or time slot not found
- 500: Generation failed

### Frontend Components

#### AI Suggestion Button

Add button to time slot display when suggestions < 6.

**Component Location:** 
- Integrate into existing time slot modal/view component
- Display below existing activity suggestions

**Props:**
```typescript
interface AISuggestionButtonProps {
  groupId: string;
  timeSlotId: string;
  startTime: Date;
  endTime: Date;
  currentSuggestionCount: number;
  onSuggestionsGenerated: (suggestions: ActivitySuggestion[]) => void;
}
```

**States:**
- Idle: "Generate AI Suggestions" button visible
- Loading: Button shows spinner and "Generating..."
- Success: Button hidden (now has 6+ suggestions)
- Error: Button shows error message with retry option

**Behavior:**
```typescript
const handleGenerateSuggestions = async () => {
  setLoading(true);
  try {
    const response = await fetch(
      `/api/groups/${groupId}/time-slots/${timeSlotId}/generate-suggestions`,
      {
        method: 'POST',
        body: JSON.stringify({ startTime, endTime }),
      }
    );
    const data = await response.json();
    onSuggestionsGenerated(data.suggestions);
  } catch (error) {
    setError('Failed to generate suggestions');
  } finally {
    setLoading(false);
  }
};
```

## Data Flow

### Suggestion Generation Process

```
1. User clicks "AI Suggestion" button
   ↓
2. Frontend sends POST request with time slot details
   ↓
3. Backend: ActivitySuggestionService.generateSuggestions()
   ↓
4. Query existing suggestions count
   ↓
5. Calculate needed suggestions (6 - current count)
   ↓
6. Find overlapping external events
   ├─ Query ExternalEvent table
   ├─ Filter by time overlap
   └─ Filter by group members' locations
   ↓
7. Create suggestions from external events
   ├─ For each external event
   ├─ Create ActivitySuggestion record
   └─ Link to external event
   ↓
8. Calculate remaining needed suggestions
   ↓
9. If still need more suggestions:
   ├─ Gather group context
   │  ├─ Get all member locations
   │  ├─ Get all member interests
   │  ├─ Calculate time of day
   │  ├─ Calculate season
   │  └─ Count members
   ├─ Call GeminiService.generateActivities()
   │  ├─ Build contextual prompt
   │  ├─ Call Gemini API
   │  ├─ Parse JSON response
   │  └─ Validate activities
   └─ Create ActivitySuggestion records
   ↓
10. Return results to frontend
    ↓
11. Frontend updates UI with new suggestions
```

## Gemini Integration

### Prompt Engineering

**Prompt Template:**
```
You are an activity suggestion assistant for a group of young people planning to hang out together.

Context:
- Date & Time: {startTime} to {endTime} ({timeOfDay})
- Season: {season}
- Locations: {locations}
- Group Size: {memberCount} people
- Interests: {interests}

Generate {count} diverse activity suggestions that would appeal to young people in this context.

For each activity, provide:
1. title: Short, catchy name
2. description: 2-3 sentences describing the activity
3. location: Specific venue or area in one of the provided locations
4. category: Type of activity (e.g., Food & Drink, Sports, Arts, Entertainment, Outdoor, Social)
5. estimatedCost: Approximate cost per person in EUR (number only)
6. reasoning: 1-2 sentences explaining why this activity fits the group

Consider:
- Time of day (morning activities vs evening activities)
- Season (indoor vs outdoor based on weather)
- Local culture and venues in {locations}
- Budget-friendly options for young people
- Mix of active and relaxed activities
- Social bonding opportunities

Return ONLY a valid JSON array with no additional text:
[
  {
    "title": "...",
    "description": "...",
    "location": "...",
    "category": "...",
    "estimatedCost": 0,
    "reasoning": "..."
  }
]
```

### Response Parsing

```typescript
private static parseResponse(response: string): GeneratedActivity[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const activities = JSON.parse(jsonMatch[0]);
    
    // Validate each activity
    return activities.filter(activity => 
      this.validateActivity(activity)
    );
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return [];
  }
}

private static validateActivity(activity: any): boolean {
  return (
    typeof activity.title === 'string' &&
    typeof activity.description === 'string' &&
    typeof activity.location === 'string' &&
    typeof activity.category === 'string' &&
    typeof activity.estimatedCost === 'number' &&
    typeof activity.reasoning === 'string' &&
    activity.title.length > 0 &&
    activity.description.length > 0
  );
}
```

### Context Calculation

```typescript
private static calculateContext(
  startTime: Date,
  endTime: Date,
  groupMembers: User[]
): ActivityContext {
  // Extract unique locations
  const locations = [...new Set(
    groupMembers
      .map(m => m.location)
      .filter(Boolean)
  )];

  // Extract all interests
  const interests = groupMembers
    .flatMap(m => m.interests.map(i => i.interest));

  // Calculate time of day
  const hour = startTime.getHours();
  const timeOfDay = 
    hour < 12 ? 'morning' :
    hour < 17 ? 'afternoon' :
    hour < 21 ? 'evening' : 'night';

  // Calculate season
  const month = startTime.getMonth();
  const season = 
    month < 3 ? 'winter' :
    month < 6 ? 'spring' :
    month < 9 ? 'summer' : 'autumn';

  return {
    startTime,
    endTime,
    locations,
    interests,
    memberCount: groupMembers.length,
    season,
    timeOfDay,
  };
}
```

## External Event Matching

### Query Strategy

```typescript
private static async findOverlappingExternalEvents(
  startTime: Date,
  endTime: Date,
  locations: string[]
): Promise<ExternalEvent[]> {
  return await prisma.externalEvent.findMany({
    where: {
      // Time overlap: event starts before slot ends AND event ends after slot starts
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      // Location match
      location: {
        contains: locations.join('|'), // Simple approach
        mode: 'insensitive',
      },
    },
    orderBy: {
      startTime: 'asc',
    },
    take: 6, // Maximum we'd ever need
  });
}
```

### Suggestion Creation

```typescript
private static async createSuggestionsFromExternalEvents(
  groupId: string,
  externalEvents: ExternalEvent[]
): Promise<ActivitySuggestion[]> {
  const suggestions = [];
  
  for (const event of externalEvents) {
    // Check if suggestion already exists for this event
    const existing = await prisma.activitySuggestion.findFirst({
      where: {
        groupId,
        externalEventId: event.id,
      },
    });
    
    if (!existing) {
      const suggestion = await prisma.activitySuggestion.create({
        data: {
          groupId,
          externalEventId: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          startTime: event.startTime,
          endTime: event.endTime,
          cost: event.cost,
          reasoning: `Real event happening in your area during this time slot`,
        },
      });
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}
```

## Error Handling

### Gemini API Errors

**Rate Limiting:**
- Implement exponential backoff
- Cache failed requests for retry
- Log rate limit errors

**Invalid Responses:**
- Validate JSON structure
- Filter out invalid activities
- Generate fewer suggestions if some fail validation
- Never throw error to user for partial success

**API Failures:**
- Log error details
- Return empty array for AI suggestions
- Allow external event suggestions to succeed independently

### External Event Query Errors

**Database Errors:**
- Log error
- Continue with AI generation only
- Don't block the entire process

**No Matching Events:**
- Normal case, not an error
- Proceed with AI generation for all 6 suggestions

### Frontend Error Handling

**Network Errors:**
- Display user-friendly message
- Provide retry button
- Don't disable button permanently

**Partial Success:**
- If some suggestions created, show them
- Update button to reflect remaining needed suggestions

## Performance Considerations

### API Call Optimization

**Batch Generation:**
- Generate all needed AI activities in single Gemini call
- Request JSON array response
- Reduces API calls and latency

**Caching:**
- Cache Gemini responses for similar contexts (optional future enhancement)
- Cache external event queries for short duration

**Async Processing:**
- Run external event query and context gathering in parallel
- Don't block on non-critical operations

### Database Optimization

**Indexes:**
- Ensure index on `ExternalEvent(startTime, location)`
- Ensure index on `ActivitySuggestion(groupId, startTime)`

**Batch Inserts:**
- Use `createMany` for multiple suggestions when possible
- Wrap in transaction for atomicity

## Security Considerations

### API Key Management

- Store `GEMINI_API_KEY` in environment variables
- Never expose in client-side code
- Rotate keys periodically

### Input Validation

- Validate time slot dates
- Verify user is member of group
- Sanitize all user inputs before sending to Gemini
- Limit prompt size to prevent abuse

### Rate Limiting

- Implement per-user rate limiting on generation endpoint
- Prevent spam clicking of AI suggestion button
- Consider daily/hourly limits per group

## Testing Strategy

### Unit Tests

**GeminiService:**
- Test prompt building with various contexts
- Test response parsing with valid/invalid JSON
- Test activity validation
- Mock Gemini API calls

**ActivitySuggestionService:**
- Test external event matching logic
- Test suggestion count calculation
- Test generation orchestration
- Mock database and Gemini calls

### Integration Tests

**API Endpoint:**
- Test full generation flow
- Test with various group contexts
- Test error scenarios (invalid group, unauthorized user)
- Test idempotency (clicking button multiple times)

**External Event Matching:**
- Test time overlap logic
- Test location filtering
- Test with real database data

### Manual Testing

**AI Quality:**
- Review generated activities for relevance
- Test with different contexts (morning vs evening, different locations)
- Verify reasoning makes sense
- Check cost estimates are reasonable

**UI/UX:**
- Test button states (idle, loading, success, error)
- Test with slow network
- Test with API failures
- Verify suggestions display correctly

## Future Enhancements

1. **Learning from User Preferences**: Track which suggestions users select and refine future generations
2. **Suggestion Diversity**: Ensure variety in categories across the 6 suggestions
3. **Budget Filtering**: Respect group members' budget preferences
4. **Collaborative Filtering**: Suggest activities similar to what other groups enjoyed
5. **Real-time Event APIs**: Integrate with Ticketmaster, Eventbrite, etc.
6. **Caching Strategy**: Cache similar context generations to reduce API costs
