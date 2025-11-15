import {
  getUserTimezone,
  formatDateTimeLocal,
  formatTimeDisplay,
  formatDateDisplay,
  isToday,
} from '../timezone';

describe('Timezone Utilities', () => {
  describe('getUserTimezone', () => {
    it('should return a valid IANA timezone string', () => {
      const timezone = getUserTimezone();
      expect(timezone).toBeTruthy();
      expect(typeof timezone).toBe('string');
      // Should not be empty
      expect(timezone.length).toBeGreaterThan(0);
    });

    it('should return UTC as fallback if detection fails', () => {
      // Mock Intl to throw an error
      const originalIntl = global.Intl;
      (global as any).Intl = {
        DateTimeFormat: () => {
          throw new Error('Mock error');
        },
      };

      const timezone = getUserTimezone();
      expect(timezone).toBe('UTC');

      // Restore original Intl
      global.Intl = originalIntl;
    });
  });

  describe('formatDateTimeLocal', () => {
    it('should format a date for datetime-local input', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatDateTimeLocal(date, 'UTC');
      
      // Should be in YYYY-MM-DDTHH:mm format
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('should handle string input', () => {
      const dateString = '2024-01-15T14:30:00Z';
      const formatted = formatDateTimeLocal(dateString, 'UTC');
      
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('formatTimeDisplay', () => {
    it('should format time in 12-hour format', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatTimeDisplay(date, 'UTC');
      
      // Should contain AM or PM
      expect(formatted).toMatch(/AM|PM/);
    });

    it('should handle string input', () => {
      const dateString = '2024-01-15T14:30:00Z';
      const formatted = formatTimeDisplay(dateString, 'UTC');
      
      expect(formatted).toMatch(/AM|PM/);
    });
  });

  describe('formatDateDisplay', () => {
    it('should format date in readable format', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatDateDisplay(date, 'UTC');
      
      // Should contain month abbreviation and year
      expect(formatted).toContain('2024');
      expect(formatted).toContain('15');
    });

    it('should handle string input', () => {
      const dateString = '2024-01-15T14:30:00Z';
      const formatted = formatDateDisplay(dateString, 'UTC');
      
      expect(formatted).toContain('2024');
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date();
      const result = isToday(today);
      
      expect(result).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = isToday(yesterday);
      
      expect(result).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = isToday(tomorrow);
      
      expect(result).toBe(false);
    });
  });
});
