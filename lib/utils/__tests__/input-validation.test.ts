/**
 * Tests for input validation utilities
 */

import {
  sanitizeString,
  validateISODate,
  validateDateRange,
  validateUUID,
  validateRequestBody,
  validateApiKey,
} from '../input-validation';

describe('Input Validation', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(2000);
      const result = sanitizeString(longString, 100);
      expect(result.length).toBe(100);
    });

    it('should remove control characters', () => {
      const input = 'hello\x00world\x1F';
      const result = sanitizeString(input);
      expect(result).toBe('helloworld');
    });
  });

  describe('validateISODate', () => {
    it('should accept valid ISO date strings', () => {
      const date = validateISODate('2024-11-16T10:00:00.000Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2024-11-16T10:00:00.000Z');
    });

    it('should reject invalid date formats', () => {
      expect(() => validateISODate('2024-11-16')).toThrow('ISO 8601 format');
      expect(() => validateISODate('invalid')).toThrow('ISO 8601 format');
    });

    it('should reject non-string inputs', () => {
      expect(() => validateISODate(123 as any)).toThrow('must be a string');
    });
  });

  describe('validateDateRange', () => {
    it('should accept valid date ranges', () => {
      const start = new Date('2024-11-16T10:00:00Z');
      const end = new Date('2024-11-16T12:00:00Z');
      expect(() => validateDateRange(start, end)).not.toThrow();
    });

    it('should reject start time after end time', () => {
      const start = new Date('2024-11-16T12:00:00Z');
      const end = new Date('2024-11-16T10:00:00Z');
      expect(() => validateDateRange(start, end)).toThrow('before end time');
    });

    it('should reject dates too far in future', () => {
      const start = new Date('2026-11-16T10:00:00Z');
      const end = new Date('2026-11-16T12:00:00Z');
      expect(() => validateDateRange(start, end)).toThrow('1 year in the future');
    });

    it('should reject duration exceeding 7 days', () => {
      const start = new Date('2024-11-16T10:00:00Z');
      const end = new Date('2024-11-25T10:00:00Z'); // 9 days later
      expect(() => validateDateRange(start, end)).toThrow('cannot exceed 7 days');
    });
  });

  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateUUID(uuid)).toBe(uuid);
    });

    it('should reject invalid UUID formats', () => {
      expect(() => validateUUID('not-a-uuid')).toThrow('Invalid UUID format');
      expect(() => validateUUID('123')).toThrow('Invalid UUID format');
    });

    it('should reject non-string inputs', () => {
      expect(() => validateUUID(123 as any)).toThrow('must be a string');
    });
  });

  describe('validateRequestBody', () => {
    it('should accept valid request body with all required fields', () => {
      const body = { field1: 'value1', field2: 'value2' };
      const result = validateRequestBody(body, ['field1', 'field2']);
      expect(result).toEqual(body);
    });

    it('should reject body missing required fields', () => {
      const body = { field1: 'value1' };
      expect(() => validateRequestBody(body, ['field1', 'field2'])).toThrow('Missing required fields: field2');
    });

    it('should reject non-object bodies', () => {
      expect(() => validateRequestBody('string', [])).toThrow('must be an object');
      expect(() => validateRequestBody(null, [])).toThrow('must be an object');
    });
  });

  describe('validateApiKey', () => {
    it('should accept valid API keys', () => {
      const apiKey = 'test_key_1234567890abcdefghijklmnopqrstuvwxyz';
      expect(() => validateApiKey(apiKey)).not.toThrow();
    });

    it('should reject short API keys', () => {
      expect(() => validateApiKey('short')).toThrow('at least 20 characters');
    });

    it('should reject placeholder API keys', () => {
      expect(() => validateApiKey('your_api_key_here_1234567890')).toThrow('placeholder value');
      expect(() => validateApiKey('test_key_1234567890abcdef')).toThrow('placeholder value');
    });

    it('should reject empty or non-string keys', () => {
      expect(() => validateApiKey('')).toThrow('non-empty string');
      expect(() => validateApiKey(null as any)).toThrow('non-empty string');
    });
  });
});
