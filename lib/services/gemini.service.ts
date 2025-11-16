import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { validateApiKey } from '@/lib/utils/input-validation';

interface ActivityContext {
  startTime: Date;
  endTime: Date;
  locations: string[];
  interests: string[]; // Keep for backward compatibility
  memberCount: number;
  season: string;
  timeOfDay: string;
  // New fields for personalization
  userInterests: Array<{
    userName: string;
    interests: string[];
  }>;
  hasAnyInterests: boolean;
}

interface GeneratedActivity {
  title: string;
  description: string;
  location: string;
  category: string;
  estimatedCost: number;
  reasoning: string;
  startTime: string; // ISO datetime string
  endTime: string;   // ISO datetime string
}

export class GeminiService {
  private static client: GoogleGenerativeAI;
  private static model: GenerativeModel;
  private static initialized = false;

  /**
   * Initialize Gemini client with API key from environment
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Validate API key format and security
    try {
      validateApiKey(apiKey, 30); // Gemini API keys are typically 39 characters
    } catch (error: any) {
      throw new Error(`Invalid GEMINI_API_KEY: ${error.message}`);
    }

    this.client = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash - stable, fast, and supports up to 1M tokens
    this.model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.initialized = true;
  }

  /**
   * Generate activity suggestions using Gemini API
   * @param count Number of activities to generate
   * @param context Context information for generating relevant activities
   * @returns Array of generated activities
   */
  static async generateActivities(
    count: number,
    context: ActivityContext
  ): Promise<GeneratedActivity[]> {
    // Validate input parameters
    if (count <= 0) {
      console.warn('GeminiService: Invalid count parameter:', count);
      return [];
    }

    if (!context || !context.startTime || !context.endTime) {
      console.error('GeminiService: Invalid context provided');
      return [];
    }

    try {
      // Ensure client is initialized
      this.initialize();
    } catch (error) {
      console.error('GeminiService: Failed to initialize client:', error);
      return [];
    }

    try {
      const prompt = this.buildPrompt(count, context);

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API request timeout')), 30000);
      });

      const result = await Promise.race([
        this.model.generateContent(prompt),
        timeoutPromise,
      ]);

      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        console.error('GeminiService: Received empty response from API');
        return [];
      }

      const activities = this.parseResponse(text);

      // Log partial success if we got fewer activities than requested
      if (activities.length < count) {
        console.warn(
          `GeminiService: Generated ${activities.length} activities, requested ${count}. Some activities may have failed validation.`
        );
      }

      return activities;
    } catch (error: any) {
      // Provide detailed error logging for different error types
      if (error.message?.includes('timeout')) {
        console.error('GeminiService: API request timed out after 30 seconds');
      } else if (error.message?.includes('API key')) {
        console.error('GeminiService: Invalid or missing API key');
      } else if (error.message?.includes('quota')) {
        console.error('GeminiService: API quota exceeded');
      } else if (error.message?.includes('rate limit')) {
        console.error('GeminiService: Rate limit exceeded');
      } else {
        console.error('GeminiService: Failed to generate activities:', error);
      }

      return [];
    }
  }

  /**
   * Build contextual prompt for Gemini API
   * @param count Number of activities to generate
   * @param context Context information
   * @returns Formatted prompt string
   */
  private static buildPrompt(count: number, context: ActivityContext): string {
    const { startTime, endTime, locations, memberCount, season, timeOfDay, userInterests, hasAnyInterests } = context;

    const formattedStartTime = startTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const formattedEndTime = endTime.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Task 6: Handle empty interests arrays without errors and log warnings for invalid personalization data
    // Format user interests for the prompt (subtask 2.1)
    const userInterestsFormatted = userInterests
      .filter((ui) => {
        // Validate user interest data
        if (!ui || typeof ui !== 'object') {
          console.warn('GeminiService: Invalid user interest object in context:', ui);
          return false;
        }
        if (!ui.userName || typeof ui.userName !== 'string' || ui.userName.trim().length === 0) {
          console.warn('GeminiService: User interest missing valid userName:', ui);
          return false;
        }
        if (!Array.isArray(ui.interests)) {
          console.warn('GeminiService: User interest has invalid interests array:', {
            userName: ui.userName,
            interests: ui.interests,
          });
          return false;
        }
        return true;
      })
      .map((ui) => {
        // Sanitize user name to prevent prompt injection
        const sanitizedUserName = ui.userName.trim().replace(/[<>{}[\]]/g, '');

        // Filter and sanitize interests
        const sanitizedInterests = ui.interests
          .filter((interest) => {
            if (!interest || typeof interest !== 'string' || interest.trim().length === 0) {
              console.warn('GeminiService: Invalid interest for user:', {
                userName: sanitizedUserName,
                interest,
              });
              return false;
            }
            return true;
          })
          .map((interest) => interest.trim().replace(/[<>{}[\]]/g, ''));

        return `- ${sanitizedUserName}: ${sanitizedInterests.length > 0 ? sanitizedInterests.join(', ') : 'No interests specified'}`;
      })
      .join('\n');

    // Task 6: Log warning if no valid user interests after filtering
    if (!userInterestsFormatted || userInterestsFormatted.trim().length === 0) {
      console.warn('GeminiService: No valid user interests available for personalization after filtering');
    }

    // Task 6: Validate and sanitize locations array
    const validLocations = locations
      .filter((loc) => {
        if (!loc || typeof loc !== 'string' || loc.trim().length === 0) {
          console.warn('GeminiService: Invalid location in context:', loc);
          return false;
        }
        return true;
      })
      .map((loc) => loc.trim());

    if (validLocations.length === 0) {
      console.warn('GeminiService: No valid locations provided, using generic location guidance');
    }

    // Task 6: Validate member count
    if (!memberCount || typeof memberCount !== 'number' || memberCount < 1) {
      console.warn('GeminiService: Invalid member count in context:', {
        memberCount,
        type: typeof memberCount,
      });
    }

    // Build interest prompt section if no users have interests (subtask 2.3)
    const interestPromptSection = !hasAnyInterests ? `
IMPORTANT: Since no group members have specified interests, include one special suggestion:
{
  "title": "Add Interests for Better Suggestions",
  "description": "Add interests on the profile page to get better suggestions! We'll be able to recommend activities tailored to what you and your friends enjoy.",
  "location": "Profile Settings",
  "category": "System",
  "estimatedCost": 0,
  "reasoning": "Personalized suggestions work best when we know what you enjoy",
  "startTime": "${startTime.toISOString()}",
  "endTime": "${endTime.toISOString()}"
}
` : '';

    return `You are an activity suggestion assistant for a group of young people planning to hang out together.

Context:
- Date & Time: ${formattedStartTime} to ${formattedEndTime} (${timeOfDay})
- Season: ${season}
- Locations: ${validLocations.length > 0 ? validLocations.join(', ') : 'Not specified'}
- Group Size: ${memberCount > 0 ? memberCount : 1} people

Group Members and Their Interests:
${userInterestsFormatted}
${interestPromptSection}
Generate ${count} diverse activity suggestions that would appeal to young people in this context.

For each activity, provide:
1. title: Short, catchy name
2. description: 2-3 sentences describing the activity
3. location: Specific venue or area in one of the provided locations
4. category: Type of activity (e.g., Food & Drink, Sports, Arts, Entertainment, Outdoor, Social)
5. estimatedCost: Approximate cost per person in EUR (number only)
6. reasoning: PERSONALIZED explanation referencing specific users and their interests (subtask 2.2)
   - Format: "[User name] enjoys [interest] so they would love this event"
   - Example: "Steve enjoys Biking so he would love this mountain trail ride"
   - If multiple users share an interest: "Steve and Sarah both enjoy Art so they would love this gallery opening"
   - Make it personal and specific to the group members
7. startTime: Realistic start time within the available window (ISO format)
8. endTime: Realistic end time based on typical activity duration (ISO format)

IMPORTANT - Realistic Time Frames (subtask 2.4):
- DO NOT use the entire time slot duration for each activity
- Consider typical activity lengths:
  * Coffee/drinks: 1-2 hours
  * Dinner: 2-3 hours
  * Movie: 2-3 hours
  * Sports activity: 1-3 hours
  * Museum/gallery: 2-4 hours
  * Concert/show: 2-4 hours
  * Outdoor activity: 2-6 hours
  * Workshop/class: 2-3 hours
- Start times should be within the available window
- Activities can start at different times within the slot
- Be realistic about what can be accomplished in the time available
- Example for a long slot (2:00 PM - 10:00 PM):
  * Activity 1: Lunch at 2:00 PM - 4:00 PM (2 hours)
  * Activity 2: Museum visit at 3:00 PM - 6:00 PM (3 hours)
  * Activity 3: Dinner at 6:00 PM - 9:00 PM (3 hours)

Consider:
- Time of day (morning activities vs evening activities)
- Season (indoor vs outdoor based on weather)
- Local culture and venues in ${validLocations.length > 0 ? validLocations.join(', ') : 'the area'}
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
]`;
  }

  /**
   * Parse Gemini response and extract activity data
   * @param response Raw response text from Gemini
   * @returns Array of validated activities
   */
  private static parseResponse(response: string): GeneratedActivity[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('GeminiService: No JSON array found in response. Response preview:', response.substring(0, 200));
        return [];
      }

      let activities;
      try {
        activities = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('GeminiService: Failed to parse JSON from response:', parseError);
        console.error('GeminiService: JSON string preview:', jsonMatch[0].substring(0, 200));
        return [];
      }

      // Ensure activities is an array
      if (!Array.isArray(activities)) {
        console.error('GeminiService: Parsed response is not an array:', typeof activities);
        return [];
      }

      // Validate and filter activities
      const validActivities = activities.filter((activity: any, index: number) => {
        const isValid = this.validateActivity(activity);
        if (!isValid) {
          console.warn(`GeminiService: Activity at index ${index} failed validation:`, {
            title: activity?.title,
            hasDescription: !!activity?.description,
            hasLocation: !!activity?.location,
            hasCategory: !!activity?.category,
            hasCost: typeof activity?.estimatedCost === 'number',
            hasReasoning: !!activity?.reasoning,
          });
        }
        return isValid;
      });

      return validActivities;
    } catch (error) {
      console.error('GeminiService: Unexpected error parsing response:', error);
      return [];
    }
  }

  /**
   * Validate that an activity has all required fields
   * @param activity Activity object to validate
   * @returns True if activity is valid
   */
  private static validateActivity(activity: any): boolean {
    // Check if activity is an object
    if (!activity || typeof activity !== 'object') {
      console.warn('GeminiService: Activity is not an object:', typeof activity);
      return false;
    }

    // Validate all required fields exist and have correct types
    const hasValidTitle = typeof activity.title === 'string' && activity.title.trim().length > 0;
    const hasValidDescription = typeof activity.description === 'string' && activity.description.trim().length > 0;
    const hasValidLocation = typeof activity.location === 'string' && activity.location.trim().length > 0;
    const hasValidCategory = typeof activity.category === 'string' && activity.category.trim().length > 0;
    const hasValidCost = typeof activity.estimatedCost === 'number' &&
      !isNaN(activity.estimatedCost) &&
      activity.estimatedCost >= 0;
    const hasValidReasoning = typeof activity.reasoning === 'string' && activity.reasoning.trim().length > 0;

    // Task 6: Validate time parsing and provide fallbacks
    // Validate time fields (new for task 3.2)
    let hasValidStartTime = false;
    let hasValidEndTime = false;

    if (typeof activity.startTime === 'string') {
      const parsedStart = Date.parse(activity.startTime);
      hasValidStartTime = !isNaN(parsedStart);

      if (!hasValidStartTime) {
        console.warn('GeminiService: Invalid startTime format:', {
          title: activity.title,
          startTime: activity.startTime,
        });
      }
    } else {
      console.warn('GeminiService: startTime is not a string:', {
        title: activity.title,
        startTimeType: typeof activity.startTime,
      });
    }

    if (typeof activity.endTime === 'string') {
      const parsedEnd = Date.parse(activity.endTime);
      hasValidEndTime = !isNaN(parsedEnd);

      if (!hasValidEndTime) {
        console.warn('GeminiService: Invalid endTime format:', {
          title: activity.title,
          endTime: activity.endTime,
        });
      }
    } else {
      console.warn('GeminiService: endTime is not a string:', {
        title: activity.title,
        endTimeType: typeof activity.endTime,
      });
    }

    // Validate time logic: startTime must be before endTime
    let validTimeRange = true;
    if (hasValidStartTime && hasValidEndTime) {
      try {
        const start = new Date(activity.startTime);
        const end = new Date(activity.endTime);
        validTimeRange = start < end;

        if (!validTimeRange) {
          console.warn('GeminiService: Invalid time range (start >= end):', {
            title: activity.title,
            startTime: activity.startTime,
            endTime: activity.endTime,
          });
        }

        // Task 6: Additional validation for reasonable duration
        const durationMs = end.getTime() - start.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        if (durationHours < 0.5) {
          console.warn('GeminiService: Activity duration too short (< 30 min):', {
            title: activity.title,
            durationHours: durationHours.toFixed(2),
          });
          validTimeRange = false;
        } else if (durationHours > 12) {
          console.warn('GeminiService: Activity duration too long (> 12 hours):', {
            title: activity.title,
            durationHours: durationHours.toFixed(2),
          });
          validTimeRange = false;
        }
      } catch (error) {
        console.warn('GeminiService: Error validating time range:', {
          title: activity.title,
          error: error instanceof Error ? error.message : String(error),
        });
        validTimeRange = false;
      }
    }

    // Additional validation: check for reasonable field lengths
    const titleTooLong = activity.title && activity.title.length > 200;
    const descriptionTooLong = activity.description && activity.description.length > 1000;
    const costTooHigh = activity.estimatedCost > 10000; // Sanity check for cost

    if (titleTooLong || descriptionTooLong || costTooHigh) {
      console.warn('GeminiService: Activity has unreasonable field values:', {
        title: activity.title,
        titleLength: activity.title?.length,
        descriptionLength: activity.description?.length,
        cost: activity.estimatedCost,
      });
      return false;
    }

    // Task 6: Log detailed validation failure reasons
    const isValid = (
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

    if (!isValid) {
      console.warn('GeminiService: Activity failed validation:', {
        title: activity.title || 'N/A',
        hasValidTitle,
        hasValidDescription,
        hasValidLocation,
        hasValidCategory,
        hasValidCost,
        hasValidReasoning,
        hasValidStartTime,
        hasValidEndTime,
        validTimeRange,
      });
    }

    return isValid;
  }
}
