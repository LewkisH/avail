/**
 * Rate limiting utility for API endpoints
 * Uses in-memory storage for simplicity (suitable for single-instance deployments)
 * For production with multiple instances, consider Redis or a database-backed solution
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the window
   */
  maxRequests: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Optional: Key prefix for namespacing
   */
  keyPrefix?: string;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  /**
   * Check if a request should be rate limited
   * @param key - Unique identifier for the rate limit (e.g., userId, groupId)
   * @returns Object with allowed status and remaining requests
   */
  check(key: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const fullKey = this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
    
    const entry = this.store.get(fullKey);
    
    // No entry or expired entry - allow and create new
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.config.windowMs;
      this.store.set(fullKey, {
        count: 1,
        resetAt,
      });
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt,
      };
    }
    
    // Entry exists and not expired
    if (entry.count < this.config.maxRequests) {
      // Allow request and increment count
      entry.count++;
      this.store.set(fullKey, entry);
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }
    
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000), // seconds
    };
  }
  
  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    const fullKey = this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
    this.store.delete(fullKey);
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
  
  /**
   * Get current stats for debugging
   */
  getStats(): {
    totalKeys: number;
    activeKeys: number;
  } {
    const now = Date.now();
    let activeKeys = 0;
    
    for (const entry of this.store.values()) {
      if (entry.resetAt > now) {
        activeKeys++;
      }
    }
    
    return {
      totalKeys: this.store.size,
      activeKeys,
    };
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Per-user rate limiter: 10 requests per hour
export const userRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'user',
});

// Per-group rate limiter: 20 requests per hour
export const groupRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'group',
});

// Global rate limiter: 100 requests per minute (prevent abuse)
export const globalRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'global',
});
