import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface RequestRecord {
  count: number;
  timestamp: number;
}

const requestCounts = new Map<string, RequestRecord>();
const WINDOW_MS = 60 * 1000; // 1分钟窗口
const MAX_REQUESTS = 100; // 每分钟最大请求数
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟清理一次

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, record] of requestCounts.entries()) {
    if (now - record.timestamp > WINDOW_MS) {
      requestCounts.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug(`清理了 ${cleanedCount} 个过期的限流记录`);
  }
}, CLEANUP_INTERVAL);

export const rateLimiter = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = requestCounts.get(ip) || { count: 0, timestamp: now };

    if (now - record.timestamp > WINDOW_MS) {
      record.count = 0;
      record.timestamp = now;
    }

    record.count++;
    requestCounts.set(ip, record);

    if (record.count > MAX_REQUESTS) {
      logger.warn(`IP ${ip} 触发限流，当前请求数: ${record.count}`);
      return res.status(429).json({
        success: false,
        message: "请求过于频繁，请稍后再试",
        retryAfter: Math.ceil(WINDOW_MS / 1000),
      });
    }

    next();
  };
};
