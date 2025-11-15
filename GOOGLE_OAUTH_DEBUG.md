# Google OAuth Debugging Guide for Production

## Issue: Callback endpoint not being hit on Vercel

### Step 1: Verify the Auth URL Being Generated

Add temporary logging to see what URL is being generated:

1. **Check the connect endpoint response:**
   ```bash
   # From your browser console when clicking "Connect Google Calendar"
   # Or use curl:
   curl -H "Authorization: Bearer YOUR_TOKEN" https://avail.bonk.ee/api/calendar/google/connect
   ```

2. **Inspect the authUrl in the response** - it should look like:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     access_type=offline&
     scope=https://www.googleapis.com/auth/calendar.events%20https://www.googleapis.com/auth/calendar.readonly&
     response_type=code&
     client_id=your-client-id.apps.googleusercontent.com&
     redirect_uri=https://avail.bonk.ee/api/calendar/google/callback&
     state=USER_ID&
     prompt=consent
   ```

### Step 2: Check Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Verify **Authorized redirect URIs** includes:
   ```
   https://avail.bonk.ee/api/calendar/google/callback
   ```
   - **IMPORTANT:** No trailing slash
   - **IMPORTANT:** Exact match (case-sensitive)
   - **IMPORTANT:** Must be HTTPS in production

### Step 3: Check Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Verify these are set for **Production**:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://avail.bonk.ee/api/calendar/google/callback
   ```

4. **After updating environment variables, you MUST redeploy:**
   ```bash
   # Trigger a new deployment
   git commit --allow-empty -m "Trigger redeploy for env vars"
   git push
   ```

### Step 4: Test the Callback Endpoint Directly

Test if the endpoint is accessible:

```bash
# Test GET request (should redirect to /calendar with error)
curl -I "https://avail.bonk.ee/api/calendar/google/callback"

# Test with query params (should redirect to /calendar with error)
curl -I "https://avail.bonk.ee/api/calendar/google/callback?code=test&state=test"
```

Expected response: `302 Found` with `Location` header pointing to `/calendar`

### Step 5: Check Vercel Logs

1. Go to your Vercel project dashboard
2. Click on the latest deployment
3. Click **Functions** tab
4. Look for `/api/calendar/google/callback` function
5. Check if there are any invocations

**If you see NO invocations:**
- The request is not reaching Vercel at all
- This means Google is not redirecting to your URL
- Check Google Cloud Console redirect URI configuration

**If you see invocations with errors:**
- The endpoint is being hit
- Check the error logs for details

### Step 6: Common Issues and Solutions

#### Issue: "redirect_uri_mismatch" error from Google

**Cause:** The redirect URI in your request doesn't match Google Cloud Console

**Solution:**
1. Copy the exact redirect URI from the error message
2. Add it to Google Cloud Console (APIs & Services > Credentials)
3. Wait 5-10 minutes for propagation
4. Try again

#### Issue: Endpoint returns 404

**Cause:** Route file not deployed or incorrect path

**Solution:**
1. Verify file exists: `app/api/calendar/google/callback/route.ts`
2. Check Vercel build logs for any errors
3. Redeploy the application

#### Issue: Environment variables not working

**Cause:** Environment variables not set in Vercel or not redeployed

**Solution:**
1. Set environment variables in Vercel dashboard
2. **MUST redeploy** after changing environment variables
3. Verify variables are set for the correct environment (Production/Preview/Development)

### Step 7: Add Temporary Debug Logging

Add this to the top of your callback route to see if it's being hit:

```typescript
export async function GET(request: NextRequest) {
  console.log('=== CALLBACK ENDPOINT HIT ===');
  console.log('URL:', request.url);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  
  const { searchParams } = new URL(request.url);
  console.log('Query params:', Object.fromEntries(searchParams.entries()));
  
  // ... rest of your code
}
```

Then check Vercel logs after attempting to connect.

### Step 8: Test OAuth Flow Step by Step

1. **Get the auth URL:**
   ```javascript
   // In browser console on your app
   fetch('/api/calendar/google/connect')
     .then(r => r.json())
     .then(data => console.log('Auth URL:', data.authUrl));
   ```

2. **Copy the auth URL and inspect it:**
   - Check the `redirect_uri` parameter
   - Verify it matches your Google Cloud Console configuration

3. **Visit the auth URL manually:**
   - Paste it in your browser
   - Complete the Google OAuth flow
   - Watch where Google redirects you

4. **Check the redirect URL:**
   - After granting permissions, check your browser's address bar
   - It should be: `https://avail.bonk.ee/api/calendar/google/callback?code=...&state=...`
   - If it's different, that's your problem

### Step 9: Verify DNS and SSL

```bash
# Check DNS resolution
nslookup avail.bonk.ee

# Check SSL certificate
curl -vI https://avail.bonk.ee 2>&1 | grep -i "ssl\|certificate"

# Test the full URL
curl -I "https://avail.bonk.ee/api/calendar/google/callback"
```

### Step 10: Check for Middleware Interference

Check if you have any middleware that might be blocking the request:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  console.log('Middleware hit:', request.nextUrl.pathname);
  // Make sure /api/calendar/google/callback is not being blocked
}
```

## Quick Checklist

- [ ] Google Cloud Console has correct redirect URI
- [ ] Vercel environment variables are set for Production
- [ ] Redeployed after setting environment variables
- [ ] Callback endpoint file exists at correct path
- [ ] No middleware blocking the route
- [ ] DNS resolves correctly
- [ ] SSL certificate is valid
- [ ] Auth URL contains correct redirect_uri parameter
- [ ] Waited 5-10 minutes after updating Google Cloud Console

## Still Not Working?

If the endpoint is still not being hit:

1. **Create a simple test endpoint:**
   ```typescript
   // app/api/test-callback/route.ts
   export async function GET() {
     return new Response('Test callback works!');
   }
   ```

2. **Test it:**
   ```bash
   curl https://avail.bonk.ee/api/test-callback
   ```

3. **If test endpoint works but Google callback doesn't:**
   - The issue is with Google's redirect
   - Double-check Google Cloud Console configuration
   - Try removing and re-adding the redirect URI

4. **If test endpoint doesn't work:**
   - The issue is with your Vercel deployment
   - Check build logs
   - Verify the route file is being deployed
