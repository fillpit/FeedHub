import { DynamicRoute, RouteParam } from "@/types/feed";
import { dynamicRouteApi } from "@/lib/feed-api";

export function downloadExportBlob(exportData: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function fetchRouteFiles(r: DynamicRoute) {
  if (!r.script?.folder) return [];
  try {
    const list = await dynamicRouteApi.listFiles(r.id);
    const files = await Promise.all(
      list.filter(f => f.type === "file").map(async (f) => {
        const { content } = await dynamicRouteApi.getFileContent(r.id, f.path);
        return { path: f.path, content };
      })
    );
    return files;
  } catch (_err) {
    return [];
  }
}

export async function importSingleRoute(item: Record<string, unknown>) {
  const created = await dynamicRouteApi.create({
    name: String(item.name || "未命名"),
    path: String(item.path || "/sub"),
    method: (item.method as "GET" | "POST") || "GET",
    params: (item.params as Array<RouteParam>) || [],
    script: { sourceType: "inline", folder: "", timeout: 5000 },
    description: item.description ? String(item.description) : undefined,
    refreshInterval: Number(item.refreshInterval || 60),
    authCredentialId: item.authCredentialId ? Number(item.authCredentialId) : undefined,
  });

  const files = item.files as Array<{ path: string; content: string }> | undefined;
  if (files && Array.isArray(files) && files.length > 0) {
    await dynamicRouteApi.initScript(created.id);
    for (const f of files) {
      await dynamicRouteApi.saveFileContent(created.id, f.path, f.content);
    }
  }
}
