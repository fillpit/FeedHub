import { Hono } from "hono";
import { getDb } from "../db/schema";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nowen-note-secret-key-change-in-production";
const JWT_EXPIRES_IN = "30d"; // 30天免登录

const auth = new Hono();

// 登录
auth.post("/login", async (c) => {
  const body = await c.req.json();
  const { username, password } = body as { username: string; password: string };

  if (!username || !password) {
    return c.json({ error: "用户名和密码不能为空" }, 400);
  }

  const db = getDb();
  const user = db.prepare(
    "SELECT id, username, email, avatarUrl, passwordHash, createdAt FROM users WHERE username = ?"
  ).get(username) as { id: string; username: string; email: string | null; avatarUrl: string | null; passwordHash: string; createdAt: string } | undefined;

  if (!user) {
    return c.json({ error: "用户名或密码错误" }, 401);
  }

  // 校验密码（兼容旧的 SHA256 和新的 bcrypt）
  let isValid = false;
  if (user.passwordHash.startsWith("$2")) {
    // bcrypt hash
    isValid = await bcrypt.compare(password, user.passwordHash);
  } else {
    // 旧的 SHA256 hash（兼容 seed 数据）
    const crypto = require("crypto");
    const sha256 = crypto.createHash("sha256").update(password).digest("hex");
    isValid = sha256 === user.passwordHash;

    // 如果 SHA256 匹配，自动升级为 bcrypt
    if (isValid) {
      const newHash = await bcrypt.hash(password, 10);
      db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(newHash, user.id);
    }
  }

  if (!isValid) {
    return c.json({ error: "用户名或密码错误" }, 401);
  }

  // 生成 JWT
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
});

// 注册
auth.post("/register", async (c) => {
  const body = await c.req.json();
  const { username, password, email } = body as { username: string; password: string; email?: string };

  if (!username || !password) {
    return c.json({ error: "用户名和密码不能为空" }, 400);
  }

  const db = getDb();

  // 校验注册策略
  const policy = db.prepare("SELECT value FROM system_settings WHERE key = 'registration_policy'").get() as { value: string } | undefined;
  if (policy?.value !== "open") {
    return c.json({ error: "系统当前已关闭注册" }, 403);
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return c.json({ error: "该用户名已被使用" }, 409);
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare("INSERT INTO users (id, username, email, passwordHash) VALUES (?, ?, ?, ?)").run(id, username, email || null, passwordHash);

  // 注册成功后自动登录，返回 token
  const token = jwt.sign(
    { userId: id, username: username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return c.json({
    token,
    user: {
      id,
      username,
      email,
      createdAt: new Date().toISOString(),
    },
  }, 201);
});

// 修改账号安全信息（用户名 + 密码）
auth.post("/change-password", async (c) => {
  // auth 路由不经过 JWT 中间件，需要自行解析 token 获取 userId
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "未授权" }, 401);
  }

  let userId: string;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    userId = decoded.userId;
  } catch {
    return c.json({ error: "Token 无效或已过期" }, 401);
  }

  const body = await c.req.json();
  const { currentPassword, newUsername, newPassword } = body as {
    currentPassword: string;
    newUsername?: string;
    newPassword?: string;
  };

  if (!currentPassword) {
    return c.json({ error: "必须提供当前密码" }, 400);
  }

  if (!newUsername && !newPassword) {
    return c.json({ error: "请填写要修改的用户名或新密码" }, 400);
  }

  if (newPassword && newPassword.length < 6) {
    return c.json({ error: "新密码长度至少为6位" }, 400);
  }

  const db = getDb();
  const user = db.prepare("SELECT id, username, passwordHash FROM users WHERE id = ?").get(userId) as { id: string; username: string; passwordHash: string } | undefined;
  if (!user) return c.json({ error: "用户不存在" }, 404);

  // 校验当前密码
  let isValid = false;
  if (user.passwordHash.startsWith("$2")) {
    isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  } else {
    const crypto = require("crypto");
    const sha256 = crypto.createHash("sha256").update(currentPassword).digest("hex");
    isValid = sha256 === user.passwordHash;
  }

  if (!isValid) {
    return c.json({ error: "当前密码错误" }, 403);
  }

  // 检查新用户名是否冲突
  if (newUsername && newUsername !== user.username) {
    const existing = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(newUsername, userId) as { id: string } | undefined;
    if (existing) {
      return c.json({ error: "该用户名已被使用" }, 409);
    }
  }

  // 执行更新
  const updates: string[] = [];
  const params: unknown[] = [];

  if (newUsername && newUsername !== user.username) {
    updates.push("username = ?");
    params.push(newUsername);
  }

  if (newPassword) {
    const newHash = await bcrypt.hash(newPassword, 10);
    updates.push("passwordHash = ?");
    params.push(newHash);
  }

  updates.push("updatedAt = datetime('now')");
  params.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  return c.json({ success: true, message: "账户信息更新成功" });
});


// 验证 token（前端刷新时调用）
auth.get("/verify", (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "未授权" }, 401);
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };

    const db = getDb();
    const user = db.prepare(
      "SELECT id, username, email, avatarUrl, createdAt FROM users WHERE id = ?"
    ).get(decoded.userId) as { id: string; username: string; email: string | null; avatarUrl: string | null; createdAt: string } | undefined;

    if (!user) return c.json({ error: "用户不存在" }, 401);

    return c.json({ user });
  } catch {
    return c.json({ error: "Token 无效或已过期" }, 401);
  }
});

export { JWT_SECRET };
export default auth;
