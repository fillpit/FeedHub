
import "./types/express";
import express from "express";

import { container } from "./inversify.config";
import { TYPES } from "./core/types";
import { DatabaseService } from "./services/DatabaseService";
import routes from "./routes/index";
import { setupMiddlewares, setupErrorHandling } from "./middleware";
import { setupGlobalErrorHandlers } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { CacheFactory } from "./services/cache";

class App {
  private app = express();
  private databaseService = container.get<DatabaseService>(TYPES.DatabaseService);

  constructor() {
    this.setupExpress();
    // 设置全局错误处理
    setupGlobalErrorHandlers();
  }

  private setupExpress(): void {
    // 设置中间件
    setupMiddlewares(this.app);

    // 设置路由
    this.app.use("/", routes);
    
    // 404处理
    this.app.use('*', (req, res) => {
      logger.warn(`404 - 未找到路由: ${req.method} ${req.originalUrl}`);
      res.status(404).json({
        success: false,
        message: '请求的资源不存在'
      });
    });
    
    // 错误处理中间件必须在最后注册
    setupErrorHandling(this.app);
  }

  public async start(): Promise<void> {
    try {
      // 初始化数据库
      await this.databaseService.initialize();
      logger.info("数据库初始化成功");

      // 初始化缓存服务
      await CacheFactory.createCacheService();
      logger.info("缓存服务初始化成功");

      // 启动服务器
      const port = process.env.PORT || 8009;
      const server = this.app.listen(port, () => {
        logger.info(`
🚀 服务器启动成功
🌍 监听端口: ${port}
🔧 运行环境: ${process.env.NODE_ENV || "development"}
⚡ 服务已重新启动
        `);
      });

      // 优雅关闭处理
      this.setupGracefulShutdown(server);
    } catch (error) {
      logger.error("服务器启动失败:", error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(server: any): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
      
      // 关闭HTTP服务器
      server.close(async () => {
        logger.info('HTTP服务器已关闭');
        
        try {
          // 关闭缓存服务
          await CacheFactory.closeCacheService();
          logger.info('缓存服务已关闭');
          
          // 关闭数据库连接
          // 这里可以添加数据库关闭逻辑
          
          logger.info('应用程序已优雅关闭');
          process.exit(0);
        } catch (error) {
          logger.error('关闭过程中发生错误:', error);
          process.exit(1);
        }
      });
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// 创建并启动应用
const application = new App();
application.start().catch((error) => {
  logger.error("应用程序启动失败:", error);
  process.exit(1);
});

export default application;
