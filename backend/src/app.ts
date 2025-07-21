
import "./types/express";
import express from "express";
import { container } from "./inversify.config";
import { TYPES } from "./core/types";
import { DatabaseService } from "./services/DatabaseService";
import routes from "./routes/index";
import { setupMiddlewares, setupErrorHandling } from "./middleware";
import { setupGlobalErrorHandlers } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

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

      // 启动服务器
      const port = process.env.PORT || 8009;
      this.app.listen(port, () => {
        logger.info(`
🚀 服务器启动成功
🌍 监听端口: ${port}
🔧 运行环境: ${process.env.NODE_ENV || "development"}
        `);
      });
    } catch (error) {
      logger.error("服务器启动失败:", error);
      process.exit(1);
    }
  }
}

// 创建并启动应用
const application = new App();
application.start().catch((error) => {
  logger.error("应用程序启动失败:", error);
  process.exit(1);
});

export default application;
