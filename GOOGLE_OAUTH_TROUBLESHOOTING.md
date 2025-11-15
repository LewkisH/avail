# Google Calendar OAuth Troubleshooting Guide

## Common Issues and Solutions

### 1. "Something went wrong" Error After Selecting Account

This error typically occurs due to one of the following reasons:

#### A. Redirect URI Mismatch
**Problem:** The redirect URI in your `.env.local` doesn't match what's configured in Google Cloud Console.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, ensure you have:
   ```
   https://profanatory-billy-intoed.ngrok-free.dev/api/calendar/google/callback
   ```

   (or whatever your current ngrok URL is)
6. Click **Save**
7. Wait 5-10 minutes for changes to propagate

#### B. OAuth Consent Screen Not Configured for Test Users
**Problem:** Your app is in testing mode but your email isn't added as a test user.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Scroll down to **Test users**
4. Click **Add Users**
5. Add your email address
6. Click **Save**

#### C. Required Scopes Not Enabled
**Problem:** The Google Calendar API isn't enabled for your project.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Search for "Google Calendar API"
4. Click on it and ensure it's **Enabled**

#### D. ngrok URL Changed
**Problem:** Your ngrok URL changes every time you restart ngrok (free tier).

**Solution:**
1. Check your current ngrok URL by running:
   ```bash
   curl http://localhost:4040/api/tunnels
   ```
2. Update `.env.local` with the new URL:
   ```bash
   GOOGLE_REDIRECT_URI=https://your-new-ngrok-url.ngrok-free.dev/api/calendar/google/callback
   ```
3. Update the redirect URI in Google Cloud Console (see step A above)
4. Restart your Next.js dev server

**Better Solution:** Use a static ngrok domain (requires paid plan) or deploy to a production URL.

### 2. Checking Server Logs

To see detailed error logs:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Watch the console output when you attempt to connect

3. Look for logs starting with:
   - `[OAuth Callback]` - Callback route logs
   - `[GoogleCalendarService]` - Service layer logs
   - `[OAuth]` - Token exchange logs

### 3. Testing the OAuth Flow

1. Clear any existing connection:
   ```bash
   # Connect to your database
   psql $DATABASE_URL
   
   # Delete existing tokens
   DELETE FROM "GoogleCalendarToken" WHERE "userId" = 'your-user-id';
   ```

2. Try connecting again from the calendar page

3. Check the server logs for detailed error messages

### 4. Verifying Environment Variables

Ensure all required variables are set in `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/google/callback
```

Restart your dev server after changing environment variables.

### 5. Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `redirect_uri_mismatch` | Redirect URI doesn't match Google Console | Update Google Console or `.env.local` |
| `access_denied` | User denied permission | User needs to grant calendar access |
| `invalid_grant` | Authorization code expired or invalid | Try connecting again |
| `Failed to obtain refresh token` | Consent screen not forcing consent | Check `prompt: 'consent'` in auth URL |

### 6. Quick Checklist

- [ ] Google Calendar API is enabled in Google Cloud Console
- [ ] OAuth consent screen is configured
- [ ] Your email is added as a test user
- [ ] Redirect URI in Google Console matches `.env.local`
- [ ] All environment variables are set correctly
- [ ] Dev server was restarted after env changes
- [ ] ngrok URL hasn't changed (if using ngrok)

### 7. Getting More Help

If you're still experiencing issues:

1. Check the browser console for client-side errors
2. Check the server logs for detailed error messages
3. Verify the OAuth flow by checking the URL parameters during redirect
4. Test with a different Google account to rule out account-specific issues

## Next Steps

After resolving the OAuth issue, you should see:
- A success toast message: "Google Calendar connected successfully!"
- The GoogleCalendarStatus component showing your connection
- The ability to sync your calendar events
