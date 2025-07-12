import { Sequelize, QueryTypes } from "sequelize";
import bcrypt from "bcrypt";
import GlobalSetting from "../models/GlobalSetting";
import User from "../models/User";
import sequelize from "../config/database";

// 全局设置默认值
const DEFAULT_GLOBAL_SETTINGS = {
  httpProxyHost: "127.0.0.1",
  httpProxyPort: 7890,
  isProxyEnabled: false,
  CommonUserCode: 9527,
  AdminUserCode: 230713,
};

export class DatabaseService {
  private sequelize: Sequelize;

  constructor() {
    this.sequelize = sequelize;
  }

  async initialize(): Promise<void> {
    try {
      await this.sequelize.query("PRAGMA foreign_keys = OFF");
      await this.cleanupBackupTables();
      await this.sequelize.sync({ alter: true });
      await this.sequelize.query("PRAGMA foreign_keys = ON");
      await this.initializeGlobalSettings();
      await this.initializeAdminUser();
    } catch (error) {
      throw new Error(`数据库初始化失败: ${(error as Error).message}`);
    }
  }

  private async initializeGlobalSettings(): Promise<void> {
    try {
      const settings = await GlobalSetting.findOne();
      if (!settings) {
        await GlobalSetting.create(DEFAULT_GLOBAL_SETTINGS);
        console.log("✅ Global settings initialized with default values.");
      }
    } catch (error) {
      console.error("❌ Failed to initialize global settings:", error);
      throw error;
    }
  }

  private async initializeAdminUser(): Promise<void> {
    try {
      // 检查是否存在管理员用户
      const adminUser = await User.findOne({ where: { role: 1 } });
      
      if (!adminUser) {
        // 从环境变量读取用户名和密码，如果未设置则使用默认值
        const username = process.env.BASIC_AUTH_USERNAME || "admin";
        const password = process.env.BASIC_AUTH_PASSWORD || "admin@123";
        
        // 对密码进行哈希处理
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 创建管理员用户
        await User.create({
          username,
          password: hashedPassword,
          role: 1, // 管理员角色
        });
        
        console.log(`✅ Admin user initialized with username: ${username}`);
      }
    } catch (error) {
      console.error("❌ Failed to initialize admin user:", error);
      throw error;
    }
  }

  private async cleanupBackupTables(): Promise<void> {
    const backupTables = await this.sequelize.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%\\_backup%' ESCAPE '\\'",
      { type: QueryTypes.SELECT }
    );

    for (const table of backupTables) {
      if (table?.name) {
        await this.sequelize.query(`DROP TABLE IF EXISTS ${table.name}`);
      }
    }
  }

  // ... 其他数据库相关方法
}
