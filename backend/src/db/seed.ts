import { getDb } from "./schema";
import { v4 as uuid } from "uuid";
import crypto from "crypto";

export function seedDatabase() {
  const db = getDb();

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const userId = uuid();
    const passwordHash = crypto.createHash("sha256").update("admin123").digest("hex");

    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash) VALUES (?, ?, ?, ?)
    `).run(userId, "admin", "admin@nowen-note.local", passwordHash);
    console.log("✅ Admin user seeded successfully");
  }

  // 初始化默认系统设置
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM system_settings").get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      { key: "site_title", value: "nowen-note" },
      { key: "registration_policy", value: "closed" },
      { key: "ai_provider", value: "openai" },
      { key: "ai_api_url", value: "https://api.openai.com/v1" },
      { key: "ai_model", value: "gpt-4o-mini" },
    ];

    const insertSetting = db.prepare("INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)");
    const insertMany = db.transaction((settings) => {
      for (const s of settings) insertSetting.run(s.key, s.value);
    });
    insertMany(defaultSettings);
    console.log("✅ Default settings seeded successfully");
  }

  console.log("✅ Database seeded successfully");
}
