# Security and Rate Limiting

This document describes the security measures and rate limiting implemented for the Activity Suggestion Engine.

## Overview

The activity suggestion generation endpoint (`/api/groups/[id]/time-slots/generate-suggestions`) includes comprehensive security measures to prevent abuse and ensure safe operation.

## Rate Limiting

### Implementation

Rate limiting is implemented using an in-memory store suitable for single-instance deployments. For production environments with multiple instances, consider using Redis or a database-backed solution.

### Limits

1. **Per-User Rate Limit**
   - **Limit**: 10 requests per hour
   - **Purpose**: Prevent individual users from spamming the AI generation endpoint
   - **Reset**: Automatically resets after 1 hour

2. **Per-Group Rate Limit**
   - **Limit**: 20 requests per hour
   - **Purpose**: Prevent abuse at the group level
   - **Reset**: Automatically resets after 1 hour

3. **Global Rate Limit** (available but not currently applied)
   - **Limit**: 100 requests per minute
   - **Purpose**: Prevent system-wide abuse
   - **Reset**: Automatically resets after 1 minute

### Rate Limit Headers

All responses include rate limit information in headers:

**Success Response Headers:**
```
X-RateLimit-Limit-User: 10
X-RateLimit-Remaining-User: 7
X-RateLimit-Reset-User: 2024-11-16T11:00:00.000Z
X-RateLimit-Limit-Group: 20
X-RateLimit-Remaining-Group: 15
X-RateLimit-Reset-Group: 2024-11-16T11:00:00.000Z
```

**Rate Limit Exceeded Response (429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit for generating suggestions. Please try again later.",
    "retryAfter": 3456
  }
}
```

Headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-11-16T11:00:00.000Z
Retry-After: 3456
```

## Input Validation

### Date Validation

All date inputs are validated to ensure:
- ISO 8601 format (e.g., `2024-11-16T10:00:00.000Z`)
- Valid date values
- Start time is before end time
- Dates are not more than 1 year in the future
- Duration does not exceed 7 days

### UUID Validation

Group IDs are validated to ensure proper UUID format:
- Must match UUID v4 format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Prevents injection attacks through malformed IDs

### Request Body Validation

All request bodies are validated to ensure:
- Valid JSON structure
- Required fields are present
- Field types are correct

### String Sanitization

String inputs are sanitized to prevent injection attacks:
- Whitespace trimming
- Length limiting (default 1000 characters)
- Control character removal
- Null byte removal

## API Key Security

### Environment Variable Validation

The Gemini API key is validated on initialization:
- Must be set in environment variables
- Must be at least 30 characters long
- Cannot be a placeholder value (e.g., `your_api_key`, `test_key`)
- Validated format and security

### Configuration Check

Before processing any request, the endpoint verifies:
- Gemini API key is properly configured
- Returns 503 Service Unavailable if not configured

### Best Practices

1. **Never commit API keys to version control**
   - Use `.env.local` for local development
   - Use environment variables in production
   - Keep `.env.local` in `.gitignore`

2. **Rotate API keys periodically**
   - Change keys every 90 days
   - Immediately rotate if compromised

3. **Monitor API usage**
   - Track API calls and costs
   - Set up alerts for unusual activity
   - Review logs regularly

## Error Handling

### Security-Conscious Error Messages

Error messages are designed to be informative without exposing sensitive information:

- **Development**: Detailed error messages with stack traces
- **Production**: Generic error messages without internal details

### Error Codes

- `INVALID_REQUEST`: Validation failed
- `FORBIDDEN`: User not authorized
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `SERVICE_UNAVAILABLE`: Service not configured
- `GENERATION_ERROR`: AI generation failed
- `INTERNAL_ERROR`: Unexpected error

## Monitoring and Logging

### What is Logged

- Rate limit violations (user ID, group ID, timestamp)
- API key validation failures
- Input validation failures
- Gemini API errors (without sensitive data)
- Unexpected errors

### What is NOT Logged

- API keys or tokens
- User passwords
- Sensitive personal information
- Full request/response bodies in production

## Testing

Security measures are covered by unit tests:

- `lib/utils/__tests__/rate-limit.test.ts`: Rate limiting logic
- `lib/utils/__tests__/input-validation.test.ts`: Input validation and sanitization

Run tests:
```bash
npm test -- lib/utils/__tests__/rate-limit.test.ts
npm test -- lib/utils/__tests__/input-validation.test.ts
```

## Future Enhancements

1. **Redis-based Rate Limiting**
   - For multi-instance deployments
   - Shared rate limit state across instances

2. **IP-based Rate Limiting**
   - Additional layer of protection
   - Prevent distributed attacks

3. **CAPTCHA Integration**
   - For suspicious activity patterns
   - Additional verification layer

4. **API Key Rotation**
   - Automated key rotation
   - Zero-downtime key updates

5. **Advanced Monitoring**
   - Real-time dashboards
   - Anomaly detection
   - Automated alerting

## Configuration

### Environment Variables

Required:
```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Adjusting Rate Limits

To modify rate limits, edit `lib/utils/rate-limit.ts`:

```typescript
// Per-user rate limiter
export const userRateLimiter = createRateLimiter({
  maxRequests: 10,        // Change this value
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'user',
});

// Per-group rate limiter
export const groupRateLimiter = createRateLimiter({
  maxRequests: 20,        // Change this value
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'group',
});
```

## Support

For security concerns or questions:
- Review this documentation
- Check application logs
- Contact the development team
