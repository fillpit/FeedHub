import { Sequelize, QueryTypes } from "sequelize";
import bcrypt from "bcrypt";
import GlobalSetting from "../models/GlobalSetting";
import User from "../models/User";
import UserSetting from "../models/UserSetting";
import NotificationSetting from "../models/NotificationSetting";
// 书籍订阅相关模型
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
  opdsPassword: "",
  // 翻译配置默认值
  translationTargetLanguage: "en-US",
  translationPrompt:
    "请将输入内容翻译为目标语言，并保留原文，输出格式为：原文\n\n译文",
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

      // 图书RSS相关数据库表维护逻辑已移除

      // 检查并添加WebsiteRssConfig表的缺失字段
      await this.fixWebsiteRssConfigTableIfNeeded();
      // 检查并添加DynamicRouteConfig表的缺失字段
      await this.fixDynamicRouteConfigTableIfNeeded();
      // 检查并添加GlobalSetting表的缺失字段
      await this.fixGlobalSettingsTableIfNeeded();

      // 使用force: false确保不会重新创建已存在的表
      await this.sequelize.sync({ force: false });

      // 同步后再次清理可能产生的备份表
      await this.cleanupBackupTables();
      await this.sequelize.query("PRAGMA foreign_keys = ON");

      // 等待一下确保表创建完成
      await new Promise((resolve) => setTimeout(resolve, 100));

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

  /**
   * 修复chapters表的错误约束
   */

  private async fixWebsiteRssConfigTableIfNeeded(): Promise<void> {
    try {
      // 检查website_rss_configs表是否存在renderMode字段
      const tableInfo = await this.sequelize.query<{ name: string }>(
        "PRAGMA table_info(website_rss_configs)",
        { type: QueryTypes.SELECT }
      );

      const columns = tableInfo.map((col) => col.name);
      const missingColumns: string[] = [];

      if (!columns.includes("renderMode")) {
        missingColumns.push("renderMode");
      }
      if (!columns.includes("enableBilingualTranslate")) {
        missingColumns.push("enableBilingualTranslate");
      }
      if (!columns.includes("lastFetchStatus")) {
        missingColumns.push("lastFetchStatus");
      }
      if (!columns.includes("lastFetchError")) {
        missingColumns.push("lastFetchError");
      }

      // 添加缺失的字段
      for (const column of missingColumns) {
        try {
          if (column === "renderMode") {
            await this.sequelize.query(
              "ALTER TABLE website_rss_configs ADD COLUMN renderMode VARCHAR(255) DEFAULT 'static'"
            );
            console.log("✅ 已添加renderMode字段到website_rss_configs表");
          } else if (column === "lastFetchStatus") {
            await this.sequelize.query(
              "ALTER TABLE website_rss_configs ADD COLUMN lastFetchStatus VARCHAR(32)"
            );
            console.log("✅ 已添加lastFetchStatus字段到website_rss_configs表");
          } else if (column === "lastFetchError") {
            await this.sequelize.query(
              "ALTER TABLE website_rss_configs ADD COLUMN lastFetchError TEXT"
            );
            console.log("✅ 已添加lastFetchError字段到website_rss_configs表");
          } else if (column === "enableBilingualTranslate") {
            await this.sequelize.query(
              "ALTER TABLE website_rss_configs ADD COLUMN enableBilingualTranslate BOOLEAN DEFAULT 0"
            );
            console.log("✅ 已添加enableBilingualTranslate字段到website_rss_configs表");
          }
        } catch (addColumnError) {
          console.warn(`添加字段 ${column} 时出现警告:`, (addColumnError as Error).message);
        }
      }

      if (missingColumns.length === 0) {
        console.log("✅ website_rss_configs表字段检查完成，无需添加新字段");
      }
    } catch (error) {
      console.warn("检查website_rss_configs表字段时出现警告:", (error as Error).message);
    }
  }

  private async fixDynamicRouteConfigTableIfNeeded(): Promise<void> {
    try {
      const tableInfo = await this.sequelize.query<{ name: string }>(
        "PRAGMA table_info(custom_route_configs)",
        { type: QueryTypes.SELECT }
      );

      const columns = tableInfo.map((col) => col.name);
      const missingColumns: string[] = [];

      if (!columns.includes("lastRunAt")) {
        missingColumns.push("lastRunAt");
      }
      if (!columns.includes("lastRunStatus")) {
        missingColumns.push("lastRunStatus");
      }
      if (!columns.includes("lastRunError")) {
        missingColumns.push("lastRunError");
      }
      if (!columns.includes("enableBilingualTranslate")) {
        missingColumns.push("enableBilingualTranslate");
      }

      for (const column of missingColumns) {
        try {
          if (column === "lastRunAt") {
            await this.sequelize.query(
              "ALTER TABLE custom_route_configs ADD COLUMN lastRunAt DATETIME"
            );
            console.log("✅ 已添加lastRunAt字段到custom_route_configs表");
          } else if (column === "lastRunStatus") {
            await this.sequelize.query(
              "ALTER TABLE custom_route_configs ADD COLUMN lastRunStatus VARCHAR(32)"
            );
            console.log("✅ 已添加lastRunStatus字段到custom_route_configs表");
          } else if (column === "lastRunError") {
            await this.sequelize.query(
              "ALTER TABLE custom_route_configs ADD COLUMN lastRunError TEXT"
            );
            console.log("✅ 已添加lastRunError字段到custom_route_configs表");
          } else if (column === "enableBilingualTranslate") {
            await this.sequelize.query(
              "ALTER TABLE custom_route_configs ADD COLUMN enableBilingualTranslate BOOLEAN DEFAULT 0"
            );
            console.log("✅ 已添加enableBilingualTranslate字段到custom_route_configs表");
          }
        } catch (addColumnError) {
          console.warn(`添加字段 ${column} 时出现警告:`, (addColumnError as Error).message);
        }
      }

      if (missingColumns.length === 0) {
        console.log("✅ custom_route_configs表字段检查完成，无需添加新字段");
      }
    } catch (error) {
      console.warn("检查custom_route_configs表字段时出现警告:", (error as Error).message);
    }
  }
  private async fixGlobalSettingsTableIfNeeded(): Promise<void> {
    try {
      const tableInfo = await this.sequelize.query<{ name: string }>(
        "PRAGMA table_info(global_settings)",
        { type: QueryTypes.SELECT }
      );

      const columns = tableInfo.map((col) => col.name);
      const missingColumns: string[] = [];

      if (!columns.includes("translationTargetLanguage")) {
        missingColumns.push("translationTargetLanguage");
      }
      if (!columns.includes("translationPrompt")) {
        missingColumns.push("translationPrompt");
      }
      if (!columns.includes("translationApiBase")) {
        missingColumns.push("translationApiBase");
      }
      if (!columns.includes("translationApiKey")) {
        missingColumns.push("translationApiKey");
      }
      if (!columns.includes("translationModel")) {
        missingColumns.push("translationModel");
      }

      for (const column of missingColumns) {
        try {
          if (column === "translationTargetLanguage") {
            await this.sequelize.query(
              "ALTER TABLE global_settings ADD COLUMN translationTargetLanguage VARCHAR(32) DEFAULT 'en-US'"
            );
            console.log("✅ 已添加translationTargetLanguage字段到global_settings表");
          } else if (column === "translationPrompt") {
            await this.sequelize.query(
              "ALTER TABLE global_settings ADD COLUMN translationPrompt TEXT"
            );
            console.log("✅ 已添加translationPrompt字段到global_settings表");
          } else if (column === "translationApiBase") {
            await this.sequelize.query(
              "ALTER TABLE global_settings ADD COLUMN translationApiBase VARCHAR(255)"
            );
            console.log("✅ 已添加translationApiBase字段到global_settings表");
          } else if (column === "translationApiKey") {
            await this.sequelize.query(
              "ALTER TABLE global_settings ADD COLUMN translationApiKey VARCHAR(255)"
            );
            console.log("✅ 已添加translationApiKey字段到global_settings表");
          } else if (column === "translationModel") {
            await this.sequelize.query(
              "ALTER TABLE global_settings ADD COLUMN translationModel VARCHAR(64)"
            );
            console.log("✅ 已添加translationModel字段到global_settings表");
          }
        } catch (addColumnError) {
          console.warn(`添加字段 ${column} 时出现警告:`, (addColumnError as Error).message);
        }
      }

      if (missingColumns.length === 0) {
        console.log("✅ global_settings表字段检查完成，无需添加新字段");
      }
    } catch (error) {
      console.warn("检查global_settings表字段时出现警告:", (error as Error).message);
    }
  }

  // 获取sequelize实例的公共方法
  public getSequelize(): Sequelize {
    return this.sequelize;
  }
}
