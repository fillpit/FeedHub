import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export const cors = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 根据环境设置CORS策略
    const allowedOrigins = config.app.env === "production" 
      ? ["http://localhost:8008", "https://yourdomain.com"] // 生产环境限制域名
      : ["*"]; // 开发环境允许所有域名
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
      res.header("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
    }
    
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "86400"); // 预检请求缓存24小时

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  };
};
