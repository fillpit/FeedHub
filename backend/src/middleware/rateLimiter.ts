import { Request, Response, NextFunction } from "express";

const requestCounts = new Map<string, { count: number; timestamp: number }>();
const WINDOW_MS = 60 * 1000; // 1分钟窗口
const MAX_REQUESTS = 600; // 每个IP每分钟最多60个请求

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
      return res.status(429).json({ message: "请求过于频繁，请稍后再试" });
    }

    next();
  };
};
