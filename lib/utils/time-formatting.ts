import { format, isToday, isTomorrow } from 'date-fns';

/**
 * Formats event time range with relative date labels
 * @param startTime - Event start time
 * @param endTime - Event end time
 * @returns Formatted time string (e.g., "Today 14:00-16:00", "Tomorrow 10:00-12:00", "15 Nov 18:00-20:00")
 */
export function formatEventTime(startTime: Date, endTime: Date): string {
  const formatTime = (date: Date) => format(date, 'HH:mm');

  if (isToday(startTime)) {
    return `Today ${formatTime(startTime)}-${formatTime(endTime)}`;
  } else if (isTomorrow(startTime)) {
    return `Tomorrow ${formatTime(startTime)}-${formatTime(endTime)}`;
  } else {
    return `${format(startTime, 'd MMM')} ${formatTime(startTime)}-${formatTime(endTime)}`;
  }
}

/**
 * Generates initials from a full name
 * @param name - Full name (e.g., "John Doe")
 * @returns Uppercase initials (e.g., "JD"), maximum 2 characters
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
