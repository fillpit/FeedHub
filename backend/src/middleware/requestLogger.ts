import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

const excludePaths = [""];

export const requestLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      if (excludePaths.includes(req.path)) {
        return;
      }
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  };
};
