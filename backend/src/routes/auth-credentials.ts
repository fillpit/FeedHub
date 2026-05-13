import { Hono } from "hono";
import { getDb } from "../db/schema";
import type { AuthCredential, AuthCredentialCreate, AuthCredentialUpdate } from "../types/feed";

const router = new Hono();

router.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM auth_credentials ORDER BY createdAt DESC").all() as AuthCredential[];
  return c.json(rows.map(deserialize));
});

router.get("/:id", (c) => {
  const row = findOrNull(c.req.param("id"));
  if (!row) return c.json({ error: "授权凭证不存在" }, 404);
  return c.json(row);
});

router.post("/", async (c) => {
  const body = await c.req.json<AuthCredentialCreate>();
  if (!body.name) return c.json({ error: "名称不能为空" }, 400);
  if (!body.authType) return c.json({ error: "类型不能为空" }, 400);

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO auth_credentials (name, authType, credential) VALUES (?, ?, ?)"
  ).run(body.name, body.authType, JSON.stringify(body.credential ?? {}));

  const created = db.prepare("SELECT * FROM auth_credentials WHERE id = ?").get(result.lastInsertRowid) as AuthCredential;
  return c.json(deserialize(created), 201);
});

router.put("/:id", async (c) => {
  const id = c.req.param("id");
  if (!findOrNull(id)) return c.json({ error: "授权凭证不存在" }, 404);

  const body = await c.req.json<AuthCredentialUpdate>();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); params.push(body.name); }
  if (body.authType !== undefined) { updates.push("authType = ?"); params.push(body.authType); }
  if (body.credential !== undefined) { updates.push("credential = ?"); params.push(JSON.stringify(body.credential)); }
  if (updates.length === 0) return c.json({ error: "没有要更新的内容" }, 400);

  updates.push("updatedAt = datetime('now')");
  params.push(id);

  const db = getDb();
  db.prepare(`UPDATE auth_credentials SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM auth_credentials WHERE id = ?").get(id) as AuthCredential;
  return c.json(deserialize(updated));
});

router.delete("/:id", (c) => {
  const id = c.req.param("id");
  if (!findOrNull(id)) return c.json({ error: "授权凭证不存在" }, 404);
  getDb().prepare("DELETE FROM auth_credentials WHERE id = ?").run(id);
  return c.json({ success: true });
});

function findOrNull(id: string): AuthCredential | null {
  const row = getDb().prepare("SELECT * FROM auth_credentials WHERE id = ?").get(id) as AuthCredential | undefined;
  return row ? deserialize(row) : null;
}

function deserialize(row: AuthCredential): AuthCredential {
  return {
    ...row,
    credential: typeof row.credential === "string" ? JSON.parse(row.credential) : row.credential,
  };
}

export default router;
