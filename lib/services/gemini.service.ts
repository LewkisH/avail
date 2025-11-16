import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { validateApiKey } from '@/lib/utils/input-validation';

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
    const { startTime, endTime, locations, interests, memberCount, season, timeOfDay } = context;

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

    return `You are an activity suggestion assistant for a group of young people planning to hang out together.

Context:
- Date & Time: ${formattedStartTime} to ${formattedEndTime} (${timeOfDay})
- Season: ${season}
- Locations: ${locations.join(', ') || 'Not specified'}
- Group Size: ${memberCount} people
- Interests: ${interests.join(', ') || 'Not specified'}

Generate ${count} diverse activity suggestions that would appeal to young people in this context.

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
- Local culture and venues in ${locations.join(', ') || 'the area'}
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

    // Additional validation: check for reasonable field lengths
    const titleTooLong = activity.title && activity.title.length > 200;
    const descriptionTooLong = activity.description && activity.description.length > 1000;
    const costTooHigh = activity.estimatedCost > 10000; // Sanity check for cost

    if (titleTooLong || descriptionTooLong || costTooHigh) {
      console.warn('GeminiService: Activity has unreasonable field values:', {
        titleLength: activity.title?.length,
        descriptionLength: activity.description?.length,
        cost: activity.estimatedCost,
      });
      return false;
    }

    return (
      hasValidTitle &&
      hasValidDescription &&
      hasValidLocation &&
      hasValidCategory &&
      hasValidCost &&
      hasValidReasoning
    );
  }
}
