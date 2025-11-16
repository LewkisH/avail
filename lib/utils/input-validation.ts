/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize string input to prevent injection attacks
 * Removes potentially dangerous characters and limits length
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Validate and parse ISO date string
 */
export function validateISODate(dateString: unknown): Date {
  if (typeof dateString !== 'string') {
    throw new Error('Date must be a string');
  }
  
  // Check if it matches ISO 8601 format
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(dateString)) {
    throw new Error('Date must be in ISO 8601 format');
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  
  return date;
}

/**
 * Validate date range
 */
export function validateDateRange(startTime: Date, endTime: Date): void {
  if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
    throw new Error('Start and end times must be Date objects');
  }
  
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error('Invalid date values');
  }
  
  if (startTime >= endTime) {
    throw new Error('Start time must be before end time');
  }
  
  // Validate reasonable time range (not more than 1 year in the future)
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  
  if (startTime > oneYearFromNow) {
    throw new Error('Start time cannot be more than 1 year in the future');
  }
  
  // Validate reasonable duration (not more than 7 days)
  const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  if (endTime.getTime() - startTime.getTime() > maxDuration) {
    throw new Error('Time slot duration cannot exceed 7 days');
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: unknown): string {
  if (typeof uuid !== 'string') {
    throw new Error('UUID must be a string');
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid UUID format');
  }
  
  return uuid;
}

/**
 * Validate request body structure
 */
export function validateRequestBody<T>(
  body: unknown,
  requiredFields: string[]
): T {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }
  
  const missingFields = requiredFields.filter(
    field => !(field in body)
  );
  
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
  
  return body as T;
}

/**
 * Validate environment variable is set
 */
export function validateEnvVar(name: string): string {
  const value = process.env[name];
  
  if (!value || value.trim() === '') {
    throw new Error(
      `Environment variable ${name} is not set or is empty`
    );
  }
  
  return value;
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(apiKey: string, minLength: number = 20): void {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }
  
  if (apiKey.length < minLength) {
    throw new Error(`API key must be at least ${minLength} characters long`);
  }
  
  // Check for placeholder values
  const placeholders = ['your_', 'test_', 'example_', 'placeholder'];
  if (placeholders.some(p => apiKey.toLowerCase().startsWith(p))) {
    throw new Error('API key appears to be a placeholder value');
  }
}
