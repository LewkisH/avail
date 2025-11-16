/**
 * Tests for rate limiting utility
 */

import { createRateLimiter } from '../rate-limit';

describe('RateLimiter', () => {
  describe('basic rate limiting', () => {
    it('should allow requests within limit', () => {
      const limiter = createRateLimiter({
        maxRequests: 3,
        windowMs: 1000,
        keyPrefix: 'test',
      });

      const result1 = limiter.check('user1');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = limiter.check('user1');
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = limiter.check('user1');
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests exceeding limit', () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 1000,
        keyPrefix: 'test',
      });

      limiter.check('user1');
      limiter.check('user1');

      const result = limiter.check('user1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different keys independently', () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 1000,
        keyPrefix: 'test',
      });

      const result1 = limiter.check('user1');
      expect(result1.allowed).toBe(true);

      const result2 = limiter.check('user2');
      expect(result2.allowed).toBe(true);

      limiter.check('user1');
      const result3 = limiter.check('user1');
      expect(result3.allowed).toBe(false);

      const result4 = limiter.check('user2');
      expect(result4.allowed).toBe(true);
    });
  });

  describe('reset functionality', () => {
    it('should reset rate limit for specific key', () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 1000,
        keyPrefix: 'test',
      });

      limiter.check('user1');
      const blocked = limiter.check('user1');
      expect(blocked.allowed).toBe(false);

      limiter.reset('user1');

      const afterReset = limiter.check('user1');
      expect(afterReset.allowed).toBe(true);
    });
  });

  describe('window expiration', () => {
    it('should allow requests after window expires', async () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 100, // 100ms window
        keyPrefix: 'test',
      });

      limiter.check('user1');
      const blocked = limiter.check('user1');
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const afterExpiry = limiter.check('user1');
      expect(afterExpiry.allowed).toBe(true);
    });
  });

  describe('stats', () => {
    it('should return accurate stats', () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 1000,
        keyPrefix: 'test',
      });

      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user3');

      const stats = limiter.getStats();
      expect(stats.totalKeys).toBe(3);
      expect(stats.activeKeys).toBe(3);
    });
  });
});
