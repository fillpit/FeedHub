import { Sequelize, QueryTypes } from "sequelize";
import bcrypt from "bcrypt";
import GlobalSetting from "../models/GlobalSetting";
import User from "../models/User";
import UserSetting from "../models/UserSetting";
import NotificationSetting from "../models/NotificationSetting";
// 书籍订阅相关模型
import Book from "../models/Book";
import BookRssConfig from "../models/BookRssConfig";
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
  opdsPassword: "",
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

      // 检查chapters表是否存在错误的约束
      await this.fixChaptersTableIfNeeded();

      // 检查并添加BookRssConfig表的缺失字段
      await this.fixBookRssConfigTableIfNeeded();

      // 检查并添加WebsiteRssConfig表的缺失字段
      await this.fixWebsiteRssConfigTableIfNeeded();

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
  private async fixChaptersTableIfNeeded(): Promise<void> {
    try {
      // 检查chapters表是否存在
      const tables = await this.sequelize.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='chapters'",
        { type: QueryTypes.SELECT }
      );

      if (tables.length === 0) {
        console.log("chapters表不存在，将由sync创建");
        return;
      }

      // 检查表结构是否有错误的UNIQUE约束
      const createSql = await this.sequelize.query<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='chapters'",
        { type: QueryTypes.SELECT }
      );

      if (createSql.length > 0 && createSql[0].sql) {
        const sql = createSql[0].sql;
        // 检查是否有错误的UNIQUE约束
        if (
          sql.includes("bookId` INTEGER NOT NULL UNIQUE") ||
          sql.includes("chapterNumber` INTEGER NOT NULL UNIQUE")
        ) {
          console.log("检测到chapters表有错误的UNIQUE约束，开始修复...");

          // 备份现有数据
          await this.sequelize.query(
            "CREATE TABLE IF NOT EXISTS chapters_backup AS SELECT * FROM chapters"
          );

          // 删除原表
          await this.sequelize.query("DROP TABLE chapters");

          // 重新创建正确的表结构
          await this.sequelize.query(`
            CREATE TABLE chapters (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              bookId INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
              chapterNumber INTEGER NOT NULL,
              title VARCHAR(255) NOT NULL,
              content TEXT,
              wordCount INTEGER,
              publishTime DATETIME,
              isNew TINYINT(1) NOT NULL DEFAULT 1,
              createdAt DATETIME NOT NULL,
              updatedAt DATETIME NOT NULL
            )
          `);

          // 创建正确的组合唯一索引
          await this.sequelize.query(
            "CREATE UNIQUE INDEX chapters_book_id_chapter_number ON chapters(bookId, chapterNumber)"
          );

          // 恢复数据
          await this.sequelize.query("INSERT INTO chapters SELECT * FROM chapters_backup");

          // 删除备份表
          await this.sequelize.query("DROP TABLE chapters_backup");

          console.log("✅ chapters表修复完成");
        }
      }
    } catch (error) {
      console.warn("修复chapters表时出现警告:", (error as Error).message);
    }
  }

  /**
   * 检查并添加BookRssConfig表的缺失字段
   */
  private async fixBookRssConfigTableIfNeeded(): Promise<void> {
    try {
      // 检查book_rss_configs表是否存在
      const tables = await this.sequelize.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='book_rss_configs'",
        { type: QueryTypes.SELECT }
      );

      if (tables.length === 0) {
        console.log("book_rss_configs表不存在，将由sync创建");
        return;
      }

      // 检查表中是否存在新字段
      const columns = await this.sequelize.query<{ name: string }>(
        "PRAGMA table_info(book_rss_configs)",
        { type: QueryTypes.SELECT }
      );

      const columnNames = columns.map((col) => col.name);
      const missingColumns = [];

      if (!columnNames.includes("parseStatus")) {
        missingColumns.push("parseStatus");
      }
      if (!columnNames.includes("parseError")) {
        missingColumns.push("parseError");
      }
      if (!columnNames.includes("lastParseTime")) {
        missingColumns.push("lastParseTime");
      }
      if (!columnNames.includes("lastFeedTime")) {
        missingColumns.push("lastFeedTime");
      }
      if (!columnNames.includes("minReturnChapters")) {
        missingColumns.push("minReturnChapters");
      }

      // 添加缺失的字段
      for (const column of missingColumns) {
        try {
          if (column === "parseStatus") {
            await this.sequelize.query(
              "ALTER TABLE book_rss_configs ADD COLUMN parseStatus VARCHAR(255) DEFAULT 'pending'"
            );
            console.log("✅ 已添加parseStatus字段到book_rss_configs表");
          } else if (column === "parseError") {
            await this.sequelize.query("ALTER TABLE book_rss_configs ADD COLUMN parseError TEXT");
            console.log("✅ 已添加parseError字段到book_rss_configs表");
          } else if (column === "lastParseTime") {
            await this.sequelize.query(
              "ALTER TABLE book_rss_configs ADD COLUMN lastParseTime DATETIME"
            );
            console.log("✅ 已添加lastParseTime字段到book_rss_configs表");
          } else if (column === "lastFeedTime") {
            await this.sequelize.query(
              "ALTER TABLE book_rss_configs ADD COLUMN lastFeedTime DATETIME"
            );
            console.log("✅ 已添加lastFeedTime字段到book_rss_configs表");
          } else if (column === "minReturnChapters") {
            await this.sequelize.query(
              "ALTER TABLE book_rss_configs ADD COLUMN minReturnChapters INTEGER DEFAULT 3"
            );
            console.log("✅ 已添加minReturnChapters字段到book_rss_configs表");
          }
        } catch (addColumnError) {
          console.warn(`添加字段 ${column} 时出现警告:`, (addColumnError as Error).message);
        }
      }

      if (missingColumns.length === 0) {
        console.log("✅ book_rss_configs表字段检查完成，无需添加新字段");
      }

      // 检查并迁移updateInterval单位（从分钟改为天）
      await this.migrateUpdateIntervalUnit();
    } catch (error) {
      console.warn("检查book_rss_configs表字段时出现警告:", (error as Error).message);
    }
  }

  private async migrateUpdateIntervalUnit(): Promise<void> {
    try {
      // 检查是否已经迁移过（通过检查是否有大于1440的值，因为1440分钟=1天）
      const largeIntervals = await this.sequelize.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM book_rss_configs WHERE updateInterval > 1440",
        { type: QueryTypes.SELECT }
      );

      // 如果已经有大于1440的值，说明可能已经迁移过了
      if (largeIntervals[0]?.count > 0) {
        console.log("✅ updateInterval单位迁移检查完成，数据已是天单位");
        return;
      }

      // 获取所有需要迁移的记录（分钟值转换为天值）
      const configs = await this.sequelize.query<{ id: number; updateInterval: number }>(
        "SELECT id, updateInterval FROM book_rss_configs WHERE updateInterval IS NOT NULL",
        { type: QueryTypes.SELECT }
      );

      if (configs.length === 0) {
        console.log("✅ 无需迁移updateInterval单位，表中无数据");
        return;
      }

      // 批量更新：将分钟转换为天（向上取整，最小为1天）
      for (const config of configs) {
        const daysValue = Math.max(1, Math.ceil(config.updateInterval / 1440));
        await this.sequelize.query("UPDATE book_rss_configs SET updateInterval = ? WHERE id = ?", {
          replacements: [daysValue, config.id],
          type: QueryTypes.UPDATE,
        });
      }

      console.log(`✅ 已迁移 ${configs.length} 条记录的updateInterval单位从分钟改为天`);
    } catch (error) {
      console.warn("迁移updateInterval单位时出现警告:", (error as Error).message);
    }
  }

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

      // 添加缺失的字段
      for (const column of missingColumns) {
        try {
          if (column === "renderMode") {
            await this.sequelize.query(
              "ALTER TABLE website_rss_configs ADD COLUMN renderMode VARCHAR(255) DEFAULT 'static'"
            );
            console.log("✅ 已添加renderMode字段到website_rss_configs表");
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

  // 获取sequelize实例的公共方法
  public getSequelize(): Sequelize {
    return this.sequelize;
  }
}
