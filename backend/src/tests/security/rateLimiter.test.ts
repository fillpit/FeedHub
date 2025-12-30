import { rateLimiter } from "../../middleware/rateLimiter";
import { Request, Response, NextFunction } from "express";
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

describe("Rate Limiter Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn() as any;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should allow requests within limit", () => {
    const limiter = rateLimiter({ windowMs: 1000, max: 2 });

    limiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    limiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("should block requests exceeding limit", () => {
    const limiter = rateLimiter({ windowMs: 1000, max: 2 });

    limiter(req as Request, res as Response, next);
    limiter(req as Request, res as Response, next);

    // Third request should be blocked
    limiter(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "请求过于频繁，请稍后再试"
    }));
  });

  it("should reset count after window expires", () => {
    const limiter = rateLimiter({ windowMs: 1000, max: 1 });

    limiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Advance time beyond window
    jest.setSystemTime(Date.now() + 1100);

    limiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("should use independent counters for different instances", () => {
    const globalLimiter = rateLimiter({ windowMs: 1000, max: 5 });
    const loginLimiter = rateLimiter({ windowMs: 1000, max: 1 });

    // Login limiter hit
    loginLimiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Login limiter blocked
    loginLimiter(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Global limiter should still allow because it's a different instance
    (res.status as any).mockClear();
    globalLimiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2); // +1 from previous
    expect(res.status).not.toHaveBeenCalled();
  });
});
