import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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
    // Ensure client is initialized
    this.initialize();

    try {
      const prompt = this.buildPrompt(count, context);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return this.parseResponse(text);
    } catch (error) {
      console.error('Failed to generate activities with Gemini:', error);
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
        console.error('No JSON array found in Gemini response');
        return [];
      }

      const activities = JSON.parse(jsonMatch[0]);

      // Validate and filter activities
      return activities.filter((activity: any) => this.validateActivity(activity));
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      return [];
    }
  }

  /**
   * Validate that an activity has all required fields
   * @param activity Activity object to validate
   * @returns True if activity is valid
   */
  private static validateActivity(activity: any): boolean {
    return (
      typeof activity.title === 'string' &&
      typeof activity.description === 'string' &&
      typeof activity.location === 'string' &&
      typeof activity.category === 'string' &&
      typeof activity.estimatedCost === 'number' &&
      typeof activity.reasoning === 'string' &&
      activity.title.length > 0 &&
      activity.description.length > 0 &&
      activity.location.length > 0 &&
      activity.category.length > 0 &&
      activity.reasoning.length > 0
    );
  }
}
