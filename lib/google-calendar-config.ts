import { google } from 'googleapis';

/**
 * Google Calendar OAuth Configuration
 * 
 * This utility provides configuration for Google Calendar API OAuth 2.0 authentication.
 * It manages the OAuth2 client setup with the required credentials and scopes.
 */

// OAuth2 scopes required for Google Calendar integration
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events', // Read/write calendar events
  'https://www.googleapis.com/auth/calendar.readonly', // Read calendar metadata
];

/**
 * Creates and returns a configured OAuth2 client for Google Calendar API
 * 
 * @returns Configured OAuth2 client instance
 * @throws Error if required environment variables are missing
 */
export function getGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing required Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  return oauth2Client;
}

/**
 * Generates the Google OAuth authorization URL
 * 
 * @param userId - User ID to include in state parameter for security
 * @returns Authorization URL for user to grant permissions
 */
export function generateAuthUrl(userId: string): string {
  const oauth2Client = getGoogleOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: GOOGLE_CALENDAR_SCOPES,
    state: userId, // Include user ID for verification in callback
    prompt: 'consent', // Force consent screen to ensure refresh token is returned
  });

  return authUrl;
}

/**
 * Exchanges authorization code for access and refresh tokens
 * 
 * @param code - Authorization code from OAuth callback
 * @returns Token response containing access token, refresh token, and expiry
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getGoogleOAuth2Client();

  console.log('[OAuth] Exchanging authorization code for tokens');
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('[OAuth] Token response received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access token or refresh token from Google');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000), // Default to 1 hour if not provided
    };
  } catch (error) {
    console.error('[OAuth] Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Creates an authenticated OAuth2 client with stored tokens
 * 
 * @param accessToken - Access token from database
 * @param refreshToken - Refresh token from database
 * @returns Configured OAuth2 client with credentials
 */
export function createAuthenticatedClient(
  accessToken: string,
  refreshToken: string
) {
  const oauth2Client = getGoogleOAuth2Client();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Revokes OAuth tokens with Google
 * 
 * @param accessToken - Access token to revoke
 */
export async function revokeToken(accessToken: string): Promise<void> {
  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    await oauth2Client.revokeCredentials();
  } catch (error) {
    // Log error but don't throw - token might already be revoked
    console.error('Error revoking Google OAuth token:', error);
  }
}
