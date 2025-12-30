import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface RequestRecord {
  count: number;
  timestamp: number;
}

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  statusCode?: number;
}

export const rateLimiter = (options: RateLimiterOptions = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // Default: 1 minute
  const max = options.max || 100; // Default: 100 requests per window
  const message = options.message || "请求过于频繁，请稍后再试";
  const statusCode = options.statusCode || 429;

  const requestCounts = new Map<string, RequestRecord>();
  const CLEANUP_INTERVAL = Math.max(windowMs, 60 * 1000); // Clean up at least every minute or windowMs

  // Periodically clean up expired records to prevent memory leaks
  const intervalId = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, record] of requestCounts.entries()) {
      if (now - record.timestamp > windowMs) {
        requestCounts.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`[RateLimiter] cleaned ${cleanedCount} expired records`);
    }
  }, CLEANUP_INTERVAL);

  // Unref to ensure the interval doesn't prevent the process from exiting
  if (intervalId.unref) {
    intervalId.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = requestCounts.get(ip) || { count: 0, timestamp: now };

    // Reset count if window has passed
    if (now - record.timestamp > windowMs) {
      record.count = 0;
      record.timestamp = now;
    }

    record.count++;
    requestCounts.set(ip, record);

    if (record.count > max) {
      logger.warn(`IP ${ip} triggered rate limit. Count: ${record.count}, Max: ${max}`);
      return res.status(statusCode).json({
        success: false,
        message: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    next();
  };
};
