import { Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface CustomError {
  name?: string;
  message: string;
  success?: boolean;
}

export default function handleError(
  res: Response,
  error: CustomError | unknown,
  message: string,
  next: NextFunction
) {
  logger.error(message, error);
  next(error || { success: false, message });
}
