/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per IP/user
 */

import { TooManyRequestsError } from "./errorHandler.js";

/**
 * Simple in-memory rate limiter
 * In production, consider using Redis for distributed rate limiting
 */
class RateLimiter {
  constructor() {
    this.requests = new Map(); // Map of IP -> {count, resetTime}
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Check if request is within rate limit
   * @param {string} key - Unique identifier (IP address, user ID, etc.)
   * @param {number} limit - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} Rate limit status
   */
  isAllowed(key, limit, windowMs) {
    const now = Date.now();
    const resetTime = now + windowMs;

    if (!this.requests.has(key)) {
      // First request from this key
      this.requests.set(key, { count: 1, resetTime });
      return { allowed: true, count: 1, resetTime, remaining: limit - 1 };
    }

    const record = this.requests.get(key);

    if (now > record.resetTime) {
      // Window has expired, reset counter
      record.count = 1;
      record.resetTime = resetTime;
      return { allowed: true, count: 1, resetTime, remaining: limit - 1 };
    }

    // Within the same window
    record.count++;

    if (record.count > limit) {
      return {
        allowed: false,
        count: record.count,
        resetTime: record.resetTime,
        remaining: 0,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    return {
      allowed: true,
      count: record.count,
      resetTime: record.resetTime,
      remaining: limit - record.count,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Clear all rate limit records (useful for testing)
   */
  clear() {
    this.requests.clear();
  }

  /**
   * Destroy the rate limiter and cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

/**
 * Create rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {string} options.keyGenerator - Function to generate rate limit key (default: IP address)
 * @param {string} options.message - Error message when rate limit exceeded
 * @returns {Function} Express middleware function
 */
export const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress || "unknown",
    message = "Too many requests from this IP, please try again later.",
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const result = rateLimiter.isAllowed(key, max, windowMs);

    // Add rate limit headers
    res.set({
      "X-RateLimit-Limit": max,
      "X-RateLimit-Remaining": result.remaining || 0,
      "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    });

    if (!result.allowed) {
      res.set("Retry-After", result.retryAfter);
      throw new TooManyRequestsError(message, result.retryAfter);
    }

    next();
  };
};

/**
 * Preset rate limiters for common use cases
 */
export const rateLimitPresets = {
  // More reasonable rate limiting for authentication endpoints
  auth: createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 requests per 5 minutes (much more generous)
    message: "Too many authentication attempts, please try again later.",
  }),

  // Moderate rate limiting for API endpoints
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: "Too many API requests, please try again later.",
  }),

  // Lenient rate limiting for prompt fetching
  prompts: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: "Too many prompt requests, please slow down.",
  }),
};

/**
 * Get the rate limiter instance (useful for testing)
 */
export const getRateLimiter = () => rateLimiter;

export default {
  createRateLimit,
  rateLimitPresets,
  getRateLimiter,
};
