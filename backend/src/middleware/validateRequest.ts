import { Request, Response, NextFunction } from "express";

export const validateRequest = (
  requiredParams: string[]
): ((req: Request, res: Response, next: NextFunction) => Response | void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingParams = requiredParams.filter((param) => !req.query[param] && !req.body[param]);
    if (missingParams.length > 0) {
      return res.status(400).json({
        success: false,
        error: `缺少必要的参数: ${missingParams.join(", ")}`,
      });
    }
    next();
  };
};
