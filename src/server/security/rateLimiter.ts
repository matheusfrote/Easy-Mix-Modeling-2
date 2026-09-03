/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * In-memory sliding-window Rate Limiter for DDoS & Brute-force protection
 */

import { auditLogger } from './auditLogger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  name: string;
}

export class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly name: string;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.name = options.name;

    // Periodic sweep of expired rate limits every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  /**
   * Evaluates if the request from key (e.g. IP) is within the allowed limits
   */
  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    if (record.count >= this.maxRequests) {
      auditLogger.log('RATE_LIMIT_EXCEEDED', {
        ip: key,
        details: { limiter: this.name, count: record.count, max: this.maxRequests }
      });
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Resets the counter for a specific key (e.g., upon successful authentication)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// 1. Auth Rate Limiter: 15 attempts per 15 minutes to prevent brute-forcing
export const authRateLimiter = new RateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000,
  maxRequests: 20
});

// 2. Global API Limiter: 150 requests per minute per IP
export const globalApiRateLimiter = new RateLimiter({
  name: 'global-api',
  windowMs: 60 * 1000,
  maxRequests: 150
});

// 3. Compute-Intensive Limiter (MCMC model fitting, AI generation): 15 per minute per IP
export const computeRateLimiter = new RateLimiter({
  name: 'compute',
  windowMs: 60 * 1000,
  maxRequests: 15
});

// 4. File Upload Limiter: 20 uploads per 10 minutes per IP
export const uploadRateLimiter = new RateLimiter({
  name: 'upload',
  windowMs: 10 * 60 * 1000,
  maxRequests: 20
});
