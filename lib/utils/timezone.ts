/**
 * Timezone utility functions for handling date/time conversions
 */

/**
 * Get the user's current timezone using browser's Intl API
 * @returns IANA timezone string (e.g., "America/New_York")
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone:', error);
    return 'UTC';
  }
}

/**
 * Convert a UTC date to the user's local timezone
 * @param utcDate - Date in UTC
 * @param timezone - Target timezone (defaults to user's timezone)
 * @returns Date object in the target timezone
 */
export function convertToLocalTimezone(
  utcDate: Date | string,
  timezone?: string
): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const tz = timezone || getUserTimezone();
  
  // Create a date string in the target timezone
  const dateString = date.toLocaleString('en-US', { timeZone: tz });
  return new Date(dateString);
}

/**
 * Convert a local date to UTC
 * @param localDate - Date in local timezone
 * @param timezone - Source timezone (defaults to user's timezone)
 * @returns Date object in UTC
 */
export function convertToUTC(
  localDate: Date | string,
  timezone?: string
): Date {
  const date = typeof localDate === 'string' ? new Date(localDate) : localDate;
  const tz = timezone || getUserTimezone();
  
  // Get the offset for the timezone
  const dateString = date.toLocaleString('en-US', { timeZone: tz });
  const localAsDate = new Date(dateString);
  const offset = date.getTime() - localAsDate.getTime();
  
  return new Date(date.getTime() - offset);
}

/**
 * Format a date for datetime-local input (YYYY-MM-DDTHH:mm)
 * Converts from UTC to local timezone
 * @param utcDate - Date in UTC
 * @param timezone - Target timezone (defaults to user's timezone)
 * @returns Formatted string for datetime-local input
 */
export function formatDateTimeLocal(
  utcDate: Date | string,
  timezone?: string
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const tz = timezone || getUserTimezone();
  
  // Format in the target timezone
  const year = date.toLocaleString('en-US', { 
    timeZone: tz, 
    year: 'numeric' 
  });
  const month = date.toLocaleString('en-US', { 
    timeZone: tz, 
    month: '2-digit' 
  });
  const day = date.toLocaleString('en-US', { 
    timeZone: tz, 
    day: '2-digit' 
  });
  const hour = date.toLocaleString('en-US', { 
    timeZone: tz, 
    hour: '2-digit', 
    hour12: false 
  }).padStart(2, '0');
  const minute = date.toLocaleString('en-US', { 
    timeZone: tz, 
    minute: '2-digit' 
  });
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Format a time for display (e.g., "2:30 PM")
 * Converts from UTC to local timezone
 * @param utcDate - Date in UTC
 * @param timezone - Target timezone (defaults to user's timezone)
 * @returns Formatted time string
 */
export function formatTimeDisplay(
  utcDate: Date | string,
  timezone?: string
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const tz = timezone || getUserTimezone();
  
  return date.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 * Converts from UTC to local timezone
 * @param utcDate - Date in UTC
 * @param timezone - Target timezone (defaults to user's timezone)
 * @returns Formatted date string
 */
export function formatDateDisplay(
  utcDate: Date | string,
  timezone?: string
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const tz = timezone || getUserTimezone();
  
  return date.toLocaleDateString('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if a date is today in the user's timezone
 * @param utcDate - Date in UTC
 * @param timezone - Target timezone (defaults to user's timezone)
 * @returns True if the date is today
 */
export function isToday(
  utcDate: Date | string,
  timezone?: string
): boolean {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const tz = timezone || getUserTimezone();
  
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { timeZone: tz });
  const dateStr = date.toLocaleDateString('en-US', { timeZone: tz });
  
  return todayStr === dateStr;
}
