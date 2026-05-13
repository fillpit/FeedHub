import { Hono } from "hono";
import { getDb } from "../db/schema";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

const users = new Hono();

// 获取用户列表
users.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT id, username, email, avatarUrl, createdAt FROM users ORDER BY createdAt DESC").all();
  return c.json(rows);
});

// 创建用户
users.post("/", async (c) => {
  const body = await c.req.json();
  const { username, password, email } = body as { username: string; password: string; email?: string };

  if (!username || !password) {
    return c.json({ error: "用户名和密码不能为空" }, 400);
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return c.json({ error: "用户名已存在" }, 409);
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare("INSERT INTO users (id, username, email, passwordHash) VALUES (?, ?, ?, ?)").run(id, username, email || null, passwordHash);

  return c.json({ id, username, email, createdAt: new Date().toISOString() }, 201);
});

// 删除用户
users.delete("/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const user = db.prepare("SELECT username FROM users WHERE id = ?").get(id) as { username: string } | undefined;
  if (!user) return c.json({ error: "用户不存在" }, 404);
  if (user.username === "admin") return c.json({ error: "管理员账号不可删除" }, 403);

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return c.json({ success: true });
});

export default users;
