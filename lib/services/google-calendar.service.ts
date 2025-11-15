import { google, calendar_v3 } from 'googleapis';
import { prisma } from '../prisma';
import { CalendarEvent, EventSource } from '@prisma/client';
import {
  getGoogleOAuth2Client,
  generateAuthUrl as generateOAuthUrl,
  exchangeCodeForTokens,
  createAuthenticatedClient,
  revokeToken,
} from '../google-calendar-config';

/**
 * Google Calendar Service
 * 
 * Handles all Google Calendar integration functionality including:
 * - OAuth authentication and token management
 * - Bidirectional sync between Avails and Google Calendar
 * - Event CRUD operations
 */
export class GoogleCalendarService {
  /**
   * Generate OAuth URL for Google Calendar connection
   * @param userId - User ID for state parameter
   * @returns OAuth authorization URL
   */
  static generateAuthUrl(userId: string): string {
    return generateOAuthUrl(userId);
  }

  /**
   * Handle OAuth callback and store tokens
   * @param code - Authorization code from Google
   * @param userId - User ID
   * @returns Success status
   */
  static async handleOAuthCallback(
    code: string,
    userId: string
  ): Promise<{ success: boolean }> {
    try {
      console.log('[GoogleCalendarService] Exchanging code for tokens');
      // Exchange code for tokens
      const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code);
      console.log('[GoogleCalendarService] Token exchange successful, storing in database');

      // Store tokens in database
      await prisma.googleCalendarToken.upsert({
        where: { userId },
        create: {
          userId,
          accessToken,
          refreshToken,
          expiresAt,
        },
        update: {
          accessToken,
          refreshToken,
          expiresAt,
        },
      });

      console.log('[GoogleCalendarService] Tokens stored successfully');
      return { success: true };
    } catch (error) {
      console.error('[GoogleCalendarService] Error handling OAuth callback:', error);
      console.error('[GoogleCalendarService] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error('Failed to complete Google Calendar authentication');
    }
  }

  /**
   * Disconnect Google Calendar and revoke tokens
   * @param userId - User ID
   */
  static async disconnect(userId: string): Promise<void> {
    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!tokenRecord) {
      return; // Already disconnected
    }

    // Revoke tokens with Google
    try {
      await revokeToken(tokenRecord.accessToken);
    } catch (error) {
      console.error('Error revoking token:', error);
      // Continue with deletion even if revocation fails
    }

    // Delete tokens from database
    await prisma.googleCalendarToken.delete({
      where: { userId },
    });
  }

  /**
   * Get authenticated Google Calendar client
   * @param userId - User ID
   * @returns Authenticated calendar client
   */
  static async getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
    // Refresh token if needed
    await this.refreshTokenIfNeeded(userId);

    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!tokenRecord) {
      throw new Error('Google Calendar not connected');
    }

    const oauth2Client = createAuthenticatedClient(
      tokenRecord.accessToken,
      tokenRecord.refreshToken
    );

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Refresh access token if expired
   * @param userId - User ID
   */
  static async refreshTokenIfNeeded(userId: string): Promise<void> {
    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!tokenRecord) {
      return;
    }

    // Check if token is expired or will expire in the next 5 minutes
    const now = new Date();
    const expiryBuffer = new Date(tokenRecord.expiresAt.getTime() - 5 * 60 * 1000);

    if (now < expiryBuffer) {
      return; // Token is still valid
    }

    // Refresh the token
    try {
      const oauth2Client = createAuthenticatedClient(
        tokenRecord.accessToken,
        tokenRecord.refreshToken
      );

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update token in database
      await prisma.googleCalendarToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token,
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh Google Calendar token');
    }
  }

  /**
   * Get connection status for a user
   * @param userId - User ID
   * @returns Connection status and last sync time
   */
  static async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    connectedAt?: Date;
    lastSyncAt?: Date;
    error?: string;
  }> {
    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!tokenRecord) {
      return { connected: false };
    }

    // Find the most recent Google Calendar event to determine last sync
    const lastSyncedEvent = await prisma.calendarEvent.findFirst({
      where: {
        userId,
        source: EventSource.google,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      connected: true,
      connectedAt: tokenRecord.createdAt,
      lastSyncAt: lastSyncedEvent?.updatedAt,
    };
  }

  /**
   * Sync a time slot from Avails to Google Calendar (create)
   * @param userId - User ID
   * @param timeSlot - Time slot data
   * @returns Google Calendar event ID
   */
  static async createEventInGoogle(
    userId: string,
    timeSlot: CalendarEvent
  ): Promise<string> {
    return await this.retryWithBackoff(async () => {
      const calendar = await this.getCalendarClient(userId);

      const event: calendar_v3.Schema$Event = {
        summary: timeSlot.title,
        description: timeSlot.description ?? undefined,
        location: timeSlot.location ?? undefined,
        start: {
          dateTime: timeSlot.startTime.toISOString(),
          timeZone: timeSlot.timezone,
        },
        end: {
          dateTime: timeSlot.endTime.toISOString(),
          timeZone: timeSlot.timezone,
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      if (!response.data.id) {
        throw new Error('Failed to create event in Google Calendar');
      }

      return response.data.id;
    });
  }

  /**
   * Update a time slot in Google Calendar
   * @param userId - User ID
   * @param timeSlot - Updated time slot data
   */
  static async updateEventInGoogle(
    userId: string,
    timeSlot: CalendarEvent
  ): Promise<void> {
    if (!timeSlot.sourceId) {
      throw new Error('Cannot update event without sourceId');
    }

    const eventId = timeSlot.sourceId;

    await this.retryWithBackoff(async () => {
      const calendar = await this.getCalendarClient(userId);

      const event: calendar_v3.Schema$Event = {
        summary: timeSlot.title,
        description: timeSlot.description ?? undefined,
        location: timeSlot.location ?? undefined,
        start: {
          dateTime: timeSlot.startTime.toISOString(),
          timeZone: timeSlot.timezone,
        },
        end: {
          dateTime: timeSlot.endTime.toISOString(),
          timeZone: timeSlot.timezone,
        },
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
      });
    });
  }

  /**
   * Delete a time slot from Google Calendar
   * @param userId - User ID
   * @param googleEventId - Google Calendar event ID
   */
  static async deleteEventInGoogle(
    userId: string,
    googleEventId: string
  ): Promise<void> {
    await this.retryWithBackoff(async () => {
      const calendar = await this.getCalendarClient(userId);

      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: googleEventId,
        });
      } catch (error: any) {
        // If event doesn't exist (404), consider it already deleted
        if (error.code === 404 || error.status === 404) {
          return;
        }
        throw error;
      }
    });
  }

  /**
   * Sync events from Google Calendar to Avails
   * @param userId - User ID
   * @param startDate - Start of sync range
   * @param endDate - End of sync range
   * @returns Sync statistics
   */
  static async syncFromGoogle(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
  }> {
    console.log('[Sync] Starting sync from Google Calendar', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const calendar = await this.getCalendarClient(userId);

    // Fetch events from Google Calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleEvents = response.data.items || [];
    console.log(`[Sync] Found ${googleEvents.length} events in Google Calendar`);

    // Fetch existing Avails events with source='google'
    const availsEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        source: EventSource.google,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
    });

    // Create map of sourceId -> CalendarEvent
    const availsEventMap = new Map(
      availsEvents.map((e) => [e.sourceId, e])
    );

    // Process Google events
    const googleEventIds = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const gEvent of googleEvents) {
      if (!gEvent.id) continue;

      googleEventIds.add(gEvent.id);
      const existingEvent = availsEventMap.get(gEvent.id);

      // Parse start and end times
      const startTime = gEvent.start?.dateTime
        ? new Date(gEvent.start.dateTime)
        : gEvent.start?.date
        ? new Date(gEvent.start.date)
        : null;

      const endTime = gEvent.end?.dateTime
        ? new Date(gEvent.end.dateTime)
        : gEvent.end?.date
        ? new Date(gEvent.end.date)
        : null;

      if (!startTime || !endTime) {
        continue; // Skip events without valid times
      }

      const timezone = gEvent.start?.timeZone || 'UTC';

      if (!existingEvent) {
        // Create new event
        console.log('[Sync] Creating new event:', {
          title: gEvent.summary || 'Untitled',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        await prisma.calendarEvent.create({
          data: {
            userId,
            title: gEvent.summary || 'Untitled',
            description: gEvent.description || null,
            startTime,
            endTime,
            timezone,
            location: gEvent.location || null,
            source: EventSource.google,
            sourceId: gEvent.id,
          },
        });
        created++;
      } else {
        // Check if update is needed
        const needsUpdate =
          existingEvent.title !== (gEvent.summary || 'Untitled') ||
          existingEvent.startTime.getTime() !== startTime.getTime() ||
          existingEvent.endTime.getTime() !== endTime.getTime() ||
          existingEvent.description !== (gEvent.description || null) ||
          existingEvent.location !== (gEvent.location || null);

        if (needsUpdate) {
          await prisma.calendarEvent.update({
            where: { id: existingEvent.id },
            data: {
              title: gEvent.summary || 'Untitled',
              description: gEvent.description || null,
              startTime,
              endTime,
              timezone,
              location: gEvent.location || null,
            },
          });
          updated++;
        }
      }
    }

    // Delete events that no longer exist in Google Calendar
    const deletedEvents = availsEvents.filter(
      (e) => e.sourceId && !googleEventIds.has(e.sourceId)
    );
    let deleted = 0;

    for (const event of deletedEvents) {
      await prisma.calendarEvent.delete({
        where: { id: event.id },
      });
      deleted++;
    }

    console.log('[Sync] Sync completed:', { created, updated, deleted });
    return { created, updated, deleted };
  }

  /**
   * Retry a function with exponential backoff
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries (default: 3)
   * @returns Result of the function
   */
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (
          error.code === 401 ||
          error.code === 403 ||
          error.status === 401 ||
          error.status === 403
        ) {
          throw error;
        }

        // Calculate backoff delay: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;

        // Wait before retrying
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
