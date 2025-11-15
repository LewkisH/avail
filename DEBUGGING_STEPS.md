# Debugging Steps for Google OAuth Not Hitting Callback

## Immediate Actions

### 1. Test Your Endpoints Are Deployed

```bash
# Test the debug endpoint
curl https://avail.bonk.ee/api/calendar/google/debug

# Test the simple test endpoint
curl https://avail.bonk.ee/api/calendar/google/test

# Test the callback endpoint directly
curl "https://avail.bonk.ee/api/calendar/google/callback?code=test&state=test"
```

**Expected Results:**
- Debug endpoint: Should return JSON with config info
- Test endpoint: Should return JSON with "test endpoint works"
- Callback endpoint: Should redirect (302) to `/calendar?error=invalid_callback`

**If any endpoint returns 404:**
- Your deployment is missing these files
- Redeploy your application

### 2. Check Vercel Environment Variables

Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables

Verify these are set for **Production**:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://avail.bonk.ee/api/calendar/google/callback
```

**CRITICAL:** After adding/changing environment variables, you MUST:
```bash
git commit --allow-empty -m "Redeploy for env vars"
git push
```

### 3. Verify Google Cloud Console Configuration

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, verify you have:
   ```
   https://avail.bonk.ee/api/calendar/google/callback
   ```

**Important:**
- Must be HTTPS (not HTTP)
- No trailing slash
- Exact match (case-sensitive)
- Must match `GOOGLE_REDIRECT_URI` environment variable exactly

4. Click **Save**
5. **Wait 5-10 minutes** for Google's changes to propagate

### 4. Get the Actual Auth URL Being Generated

Open your browser console on https://avail.bonk.ee and run:

```javascript
fetch('/api/calendar/google/connect', {
  headers: {
    'Authorization': 'Bearer ' + document.cookie // or however you pass auth
  }
})
  .then(r => r.json())
  .then(data => {
    console.log('Auth URL:', data.authUrl);
    // Copy this URL and inspect it
  });
```

Or click "Connect Google Calendar" and check the network tab for the response.

**Inspect the auth URL:**
- Look for the `redirect_uri` parameter
- It should be: `https://avail.bonk.ee/api/calendar/google/callback`
- If it's different, your environment variable is wrong

### 5. Test the OAuth Flow Manually

1. Copy the auth URL from step 4
2. Paste it in a new browser tab
3. Complete the Google OAuth flow
4. **Watch the URL bar** after clicking "Allow"
5. You should be redirected to: `https://avail.bonk.ee/api/calendar/google/callback?code=...&state=...`

**If you see an error page from Google:**
- Read the error message carefully
- It will tell you what's wrong (usually redirect_uri_mismatch)

**If you're redirected to a different URL:**
- That's the problem - Google is using a different redirect URI
- Check your Google Cloud Console configuration

### 6. Check Vercel Function Logs

1. Go to: https://vercel.com/[your-team]/[your-project]
2. Click on your latest deployment
3. Click **Functions** tab
4. Look for `/api/calendar/google/callback`
5. Check if there are any invocations

**If NO invocations:**
- The request never reached Vercel
- Google is not redirecting to your URL
- Go back to step 3 and verify Google Cloud Console

**If there ARE invocations:**
- Click on them to see the logs
- Look for the enhanced logging we added
- Check for any errors

### 7. Check for Middleware Issues

Look for a `middleware.ts` file in your project root:

```bash
# Check if middleware exists
ls -la middleware.ts
```

If it exists, make sure it's not blocking the callback:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Make sure this doesn't block /api/calendar/google/callback
  if (path.startsWith('/api/calendar/google/')) {
    console.log('Middleware: Allowing Google Calendar API route:', path);
    return NextResponse.next();
  }
  
  // ... rest of your middleware
}
```

## Debugging Checklist

Work through this checklist in order:

- [ ] **Step 1:** Test endpoints are accessible (debug, test, callback)
- [ ] **Step 2:** Verify Vercel environment variables are set for Production
- [ ] **Step 3:** Redeploy after setting environment variables
- [ ] **Step 4:** Verify Google Cloud Console redirect URI matches exactly
- [ ] **Step 5:** Wait 5-10 minutes after updating Google Cloud Console
- [ ] **Step 6:** Get the actual auth URL and verify redirect_uri parameter
- [ ] **Step 7:** Test OAuth flow manually and watch the redirect
- [ ] **Step 8:** Check Vercel function logs for invocations
- [ ] **Step 9:** Check for middleware blocking the route
- [ ] **Step 10:** Verify DNS and SSL are working correctly

## Common Issues and Solutions

### Issue: "redirect_uri_mismatch" from Google

**Root Cause:** The redirect URI in the OAuth request doesn't match Google Cloud Console

**Solution:**
1. Get the exact redirect_uri from the error message
2. Add it to Google Cloud Console
3. Make sure it matches your `GOOGLE_REDIRECT_URI` environment variable
4. Wait 5-10 minutes
5. Try again

### Issue: Callback endpoint returns 404

**Root Cause:** Route file not deployed or incorrect path

**Solution:**
1. Verify file exists: `app/api/calendar/google/callback/route.ts`
2. Check it exports a `GET` function
3. Redeploy your application
4. Test with curl: `curl -I https://avail.bonk.ee/api/calendar/google/callback`

### Issue: Environment variables not working

**Root Cause:** Not redeployed after setting variables

**Solution:**
1. Set variables in Vercel dashboard
2. **MUST trigger a new deployment**
3. Verify with debug endpoint: `curl https://avail.bonk.ee/api/calendar/google/debug`

### Issue: Works locally but not in production

**Root Cause:** Different environment variables or configuration

**Solution:**
1. Check `.env.local` vs Vercel environment variables
2. Make sure `GOOGLE_REDIRECT_URI` is set to production URL in Vercel
3. Make sure production URL is in Google Cloud Console
4. Redeploy

## Quick Test Commands

```bash
# Test all endpoints
curl https://avail.bonk.ee/api/calendar/google/debug
curl https://avail.bonk.ee/api/calendar/google/test
curl -I "https://avail.bonk.ee/api/calendar/google/callback?code=test&state=test"

# Check DNS
nslookup avail.bonk.ee

# Check SSL
curl -vI https://avail.bonk.ee 2>&1 | grep -i ssl

# Test with full OAuth URL (replace with your actual auth URL)
# Copy from browser console after running the fetch command in step 4
```

## Next Steps After Fixing

Once the callback is being hit:

1. Check Vercel logs for any errors in the callback handler
2. Verify database connection is working
3. Test the full OAuth flow end-to-end
4. Remove debug logging if desired (or keep for monitoring)

## Need More Help?

If you've gone through all these steps and it's still not working:

1. Share the output of the debug endpoint
2. Share the auth URL being generated
3. Share any error messages from Google
4. Share Vercel function logs if the callback is being hit
5. Share the exact redirect URI configured in Google Cloud Console
