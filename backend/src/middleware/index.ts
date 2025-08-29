import { Application } from "express";
import express from "express";
import helmet from "helmet";
import { authMiddleware } from "./auth";
import { requestLogger } from "./requestLogger";
import { rateLimiter } from "./rateLimiter";
import { cors } from "./cors";
import { xssProtection } from "./validation";
import { errorHandler } from "./errorHandler";

export const setupMiddlewares = (app: Application) => {
  // 安全头设置
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // 基础中间件
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 静态文件服务
  // app.use('/uploads', express.static('uploads'));

  // CORS配置
  app.use(cors());

  // 请求日志
  app.use(requestLogger());

  // 限流
  app.use(rateLimiter());

  // XSS防护
  // app.use(xssProtection);

  // 认证中间件
  app.use(authMiddleware);
};

// 错误处理中间件需要在路由之后添加
export const setupErrorHandling = (app: Application) => {
  app.use(errorHandler);
};
