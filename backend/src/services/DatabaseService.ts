import { Sequelize, QueryTypes } from "sequelize";
import bcrypt from "bcrypt";
import GlobalSetting from "../models/GlobalSetting";
import User from "../models/User";
import UserSetting from "../models/UserSetting";
import NotificationSetting from "../models/NotificationSetting";
// 书籍订阅相关模型
import Book from "../models/BookRssConfig";
import BookRssConfig from "../models/BookRssConfigModel";
import Chapter from "../models/Chapter";
import Subscription from "../models/Subscription";
import OpdsConfig from "../models/OpdsConfig";
import sequelize from "../config/database";

// 全局设置默认值
const DEFAULT_GLOBAL_SETTINGS = {
  httpProxyHost: "127.0.0.1",
  httpProxyPort: 7890,
  isProxyEnabled: false,
  // OPDS 设置默认值
  opdsEnabled: false,
  opdsServerUrl: "",
  opdsUsername: "",
  opdsPassword: ""
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
      // 使用alter选项同步表结构
      await this.sequelize.sync({ alter: true });
      // 同步后再次清理可能产生的备份表
      await this.cleanupBackupTables();
      await this.sequelize.query("PRAGMA foreign_keys = ON");
      
      // 等待一下确保表创建完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
    try {
      // 检查数据库连接是否正常
      await this.sequelize.authenticate();

      const backupTables = await this.sequelize.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup%'",
        { type: QueryTypes.SELECT }
      );

      for (const table of backupTables) {
        if (table?.name) {
          try {
            await this.sequelize.query(`DROP TABLE IF EXISTS \`${table.name}\``);
            console.log(`✅ 已清理备份表: ${table.name}`);
          } catch (dropError) {
            console.warn(`清理备份表 ${table.name} 时出现警告:`, (dropError as Error).message);
          }
        }
      }
    } catch (error) {
      // 忽略清理备份表时的错误，不影响主要初始化流程
      console.warn("清理备份表时出现警告:", (error as Error).message);
    }
  }

  // 获取sequelize实例的公共方法
  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  // ... 其他数据库相关方法
}
