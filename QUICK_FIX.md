# Quick Fix for Google OAuth Callback Not Working

## The Problem
Your Vercel logs show the callback endpoint is not being hit when Google redirects after OAuth.

## Most Likely Causes (in order)

### 1. Environment Variables Not Set in Vercel (90% of cases)

**Fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these for **Production**:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://avail.bonk.ee/api/calendar/google/callback
   ```
3. **MUST REDEPLOY** after adding variables:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push
   ```

### 2. Google Cloud Console Missing Redirect URI (9% of cases)

**Fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://avail.bonk.ee/api/calendar/google/callback
   ```
4. Click **Save**
5. **Wait 5-10 minutes** for changes to propagate

### 3. Typo in Redirect URI (1% of cases)

**Check for:**
- Trailing slash: ❌ `https://avail.bonk.ee/api/calendar/google/callback/`
- HTTP instead of HTTPS: ❌ `http://avail.bonk.ee/...`
- Wrong path: ❌ `https://avail.bonk.ee/api/google/calendar/callback`
- Correct: ✅ `https://avail.bonk.ee/api/calendar/google/callback`

## Verify the Fix

### Step 1: Test Debug Endpoint
```bash
curl https://avail.bonk.ee/api/calendar/google/debug
```

Should return JSON with your config. Check that `redirectUri` is correct.

### Step 2: Test Callback Endpoint
```bash
curl -I "https://avail.bonk.ee/api/calendar/google/callback?code=test&state=test"
```

Should return `302 Found` (redirect), not `404 Not Found`.

### Step 3: Test Full OAuth Flow
1. Go to https://avail.bonk.ee/calendar
2. Click "Connect Google Calendar"
3. Complete Google OAuth
4. Watch the URL bar - should redirect to your callback URL
5. Check Vercel logs for "=== GOOGLE OAUTH CALLBACK HIT ==="

## Still Not Working?

See `DEBUGGING_STEPS.md` for comprehensive debugging guide.

## Quick Commands

```bash
# Test all endpoints
curl https://avail.bonk.ee/api/calendar/google/debug
curl https://avail.bonk.ee/api/calendar/google/test
curl -I "https://avail.bonk.ee/api/calendar/google/callback?code=test&state=test"

# Trigger redeploy
git commit --allow-empty -m "Redeploy for env vars"
git push
```
