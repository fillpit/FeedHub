import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.env.ELECTRON_USER_DATA || path.join(process.cwd(), "data"), "nowen-note.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      passwordHash TEXT NOT NULL,
      avatarUrl TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 自定义字体表
    CREATE TABLE IF NOT EXISTS custom_fonts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fileName TEXT NOT NULL UNIQUE,
      format TEXT NOT NULL,
      fileSize INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 系统设置表
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 动态路由配置表
    CREATE TABLE IF NOT EXISTS dynamic_routes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      path       TEXT NOT NULL UNIQUE,
      method     TEXT NOT NULL DEFAULT 'GET',
      params     TEXT NOT NULL DEFAULT '[]',
      script     TEXT NOT NULL DEFAULT '{}',
      description TEXT,
      refreshInterval INTEGER NOT NULL DEFAULT 60,
      authCredentialId INTEGER,
      lastRunAt  TEXT,
      lastRunStatus TEXT,
      lastRunError  TEXT,
      createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 网页监控配置表
    CREATE TABLE IF NOT EXISTS website_rss_configs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      key        TEXT NOT NULL UNIQUE,
      title      TEXT NOT NULL,
      url        TEXT NOT NULL,
      selector   TEXT NOT NULL DEFAULT '{}',
      renderMode TEXT NOT NULL DEFAULT 'static',
      authCredentialId INTEGER,
      lastContent    TEXT,
      lastFetchTime  TEXT,
      lastFetchStatus TEXT,
      lastFetchError  TEXT,
      fetchInterval  INTEGER NOT NULL DEFAULT 60,
      rssDescription TEXT,
      favicon        TEXT,
      createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 授权凭证表
    CREATE TABLE IF NOT EXISTS auth_credentials (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      authType   TEXT NOT NULL,
      credential TEXT NOT NULL DEFAULT '{}',
      createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- NPM 包管理表
    CREATE TABLE IF NOT EXISTS npm_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, installing, installed, error
      error TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 数据库迁移：其他需要保留的表如果有新增字段可以在这里通过 try catch 处理
}
