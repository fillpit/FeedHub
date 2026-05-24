import { Hono } from "hono";
import { npmManager } from "../services/npm-manager";

const router = new Hono();

router.get("/", async (c) => {
  const packages = await npmManager.getInstalledPackages();
  return c.json(packages);
});

router.post("/", async (c) => {
  const { name, version } = await c.req.json<{ name: string; version?: string }>();
  if (!name) return c.json({ error: "包名不能为空" }, 400);

  try {
    await npmManager.addPackage(name, version || "latest");
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "添加包失败" }, 500);
  }
});

router.delete("/:name", async (c) => {
  const name = c.req.param("name");
  try {
    await npmManager.removePackage(name);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "删除包失败" }, 500);
  }
});

router.post("/:name/retry", async (c) => {
  const name = c.req.param("name");
  try {
    await npmManager.retryPackage(name);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "重试安装包失败" }, 500);
  }
});

router.post("/refresh", async (c) => {
  try {
    npmManager.installPackages(); // Fire and forget
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "刷新失败" }, 500);
  }
});

router.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json([]);
  
  try {
    const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=10`);
    if (!res.ok) throw new Error("NPM 注册表查询失败");
    const data = await res.json() as { objects: Array<{ package: { name: string; version: string; description: string } }> };
    const results = data.objects.map(obj => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description,
    }));
    return c.json(results);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "查询失败" }, 500);
  }
});

router.get("/versions/:name", async (c) => {
  const name = c.req.param("name");
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}`);
    if (!res.ok) throw new Error("获取包信息失败");
    const data = await res.json() as { versions: Record<string, unknown> };
    const versions = Object.keys(data.versions).reverse(); // 通常新版本在后，reverse 让新的在前
    return c.json(versions);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "获取版本列表失败" }, 500);
  }
});

export default router;
