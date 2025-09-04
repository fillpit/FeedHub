// filepath: /D:/code/CloudDiskDown/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";
import { config } from "../config";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: number;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  // 添加调试日志
  console.log(`[Auth] 请求路径: ${req.path}, 原始URL: ${req.originalUrl}`);

  // 检查是否是公开访问的路径
  if (
    req.path === "/user/login" ||
    req.path === "/user/register" ||
    req.path.startsWith("/website/sub/") ||
    req.path.startsWith("/dynamic/sub") ||
    req.path.startsWith("/dynamic/help") ||
    req.originalUrl.includes("/book-rss/feed/")
  ) {
    console.log(`[Auth] 公开路径，跳过认证: ${req.path}`);
    return next();
  }

  console.log(`[Auth] 需要认证的路径: ${req.path}`);

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "未提供 token" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    const user = await User.findOne({ where: { userId: decoded.userId } });
    if (!user) {
      return res.status(401).json({ message: "无效的 token" });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "无效的 token" });
  }
};
