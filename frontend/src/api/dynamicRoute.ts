import request from "@/utils/request";
import type { DynamicRouteConfig } from "@feedhub/shared";

// 重新导出共享类型以保持向后兼容
export type {
  DynamicRouteConfig,
  RouteParam,
  CustomRouteScript,
  ScriptSourceType,
  GitConfig,
} from "@feedhub/shared";

/**
 * 获取所有动态路由配置
 */
export function getAllDynamicRoutes() {
  return request.get("/api/dynamic");
}

/**
 * 获取单个动态路由配置
 * @param id 路由配置ID
 */
export function getDynamicRoute(id: number) {
  return request.get(`/api/dynamic/${id}`);
}

/**
 * 添加动态路由配置
 * @param data 路由配置数据
 */
export function addDynamicRoute(data: DynamicRouteConfig) {
  return request.post("/api/dynamic", data);
}

/**
 * 更新动态路由配置
 * @param id 路由配置ID
 * @param data 路由配置数据
 */
export function updateDynamicRoute(id: number, data: DynamicRouteConfig) {
  return request.put(`/api/dynamic/${id}`, data);
}

/**
 * 删除动态路由配置
 * @param id 路由配置ID
 */
export function deleteDynamicRoute(id: number) {
  return request.delete(`/api/dynamic/${id}`);
}

/**
 * 调试动态路由脚本
 * @param routeConfig 路由配置
 * @param params 测试参数
 */
export function debugDynamicRouteScript(
  routeConfig: DynamicRouteConfig,
  params: Record<string, unknown>
) {
  return request.post("/api/dynamic/debug", {
    routeConfig,
    params,
  });
}

/**
 * 获取路由的README内容
 * @param id 路由配置ID
 */
export function getRouteReadme(id: number) {
  return request.get(`/api/dynamic/${id}/readme`);
}

/**
 * 更新路由的README内容
 * @param id 路由配置ID
 * @param content README内容
 */
export function updateRouteReadme(id: number, content: string) {
  return request.put(`/api/dynamic/${id}/readme`, { content });
}

/**
 * 获取内联脚本的文件列表
 * @param routeId 路由ID
 */
export function getInlineScriptFiles(routeId: number) {
  return request.get(`/api/dynamic/${routeId}/inline-script/files`);
}

/**
 * 获取内联脚本的文件内容
 * @param routeId 路由ID
 * @param fileName 文件名
 */
export function getInlineScriptFileContent(routeId: number, fileName: string) {
  return request.get(`/api/dynamic/${routeId}/inline-script/files/${encodeURIComponent(fileName)}`);
}

/**
 * 更新内联脚本的文件内容
 * @param routeId 路由ID
 * @param fileName 文件名
 * @param content 文件内容
 */
export function updateInlineScriptFileContent(routeId: number, fileName: string, content: string) {
  return request.put(`/api/dynamic/${routeId}/inline-script/files`, {
    fileName,
    content,
  });
}

/**
 * 创建内联脚本文件
 * @param routeId 路由ID
 * @param fileName 文件名
 * @param template 模板类型
 */
export function createInlineScriptFile(
  routeId: number,
  fileName: string,
  template: string = "blank"
) {
  return request.post(`/api/dynamic/${routeId}/inline-script/files`, {
    fileName,
    template,
  });
}

/**
 * 删除内联脚本文件
 * @param routeId 路由ID
 * @param fileName 文件名
 */
export function deleteInlineScriptFile(routeId: number, fileName: string) {
  return request.delete(
    `/api/dynamic/${routeId}/inline-script/files/${encodeURIComponent(fileName)}`
  );
}

/**
 * 导出路由配置和脚本文件
 * @param routeIds 路由ID列表
 */
export function exportRoutesWithScripts(routeIds: number[]) {
  return request.post(
    "/api/dynamic/export-with-scripts",
    { routeIds },
    {
      responseType: "blob",
    }
  );
}

/**
 * 导入路由配置和脚本文件
 * @param zipFile ZIP文件
 */
export function importRoutesWithScripts(zipFile: File) {
  const formData = new FormData();
  formData.append("zipFile", zipFile);
  return request.post("/api/dynamic/import-with-scripts", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/**
 * 初始化路由脚本
 * @param routeId 路由ID
 * @param initType 初始化类型
 * @param options 初始化选项
 */
export function initializeRouteScript(
  routeId: number,
  initType: "template" | "upload" | "git",
  options: {
    templateName?: string;
    zipFile?: File;
    gitUrl?: string;
    gitBranch?: string;
    gitSubPath?: string;
  }
) {
  // 对于文件上传，使用FormData
  if (initType === "upload" && options.zipFile) {
    const formData = new FormData();
    formData.append("initType", initType);
    formData.append("zipFile", options.zipFile);

    // 不要手动设置 Content-Type，让浏览器自动设置以包含正确的 boundary
    return request.post(`/api/dynamic/${routeId}/initialize-script`, formData);
  }

  // 对于模板和Git，使用JSON
  const data: any = { initType };

  if (options.templateName) {
    data.templateName = options.templateName;
  }

  if (options.gitUrl) {
    data.gitUrl = options.gitUrl;
  }

  if (options.gitBranch) {
    data.gitBranch = options.gitBranch;
  }

  if (options.gitSubPath) {
    data.gitSubPath = options.gitSubPath;
  }

  return request.post(`/api/dynamic/${routeId}/initialize-script`, data);
}

/**
 * 同步Git仓库
 * @param routeId 路由ID
 */
export function syncGitRepository(routeId: number) {
  return request.post(`/api/dynamic/${routeId}/sync-git`, {});
}

/**
 * 上传脚本到Git仓库
 * @param routeId 路由ID
 * @param options 上传选项
 */
export function uploadToGit(routeId: number, options: any) {
  return request.post(`/api/dynamic/${routeId}/upload-to-git`, options);
}
