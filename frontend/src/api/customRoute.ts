import request from "@/utils/request";

// 自定义路由配置接口
export interface CustomRouteConfig {
  id?: number;
  name: string;
  path: string;
  method: string;
  description?: string;
  params?: RouteParam[];
  script: {
    sourceType: 'inline' | 'url' | 'file';
    content: string;
    timeout?: number;
  };
}

// 路由参数接口
export interface RouteParam {
  name: string;
  type: `string` | `number` | `boolean`;
  required: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
}

/**
 * 获取所有自定义路由配置
 */
export function getAllCustomRoutes() {
  return request.get("/api/custom-route");
}

/**
 * 获取单个自定义路由配置
 * @param id 路由配置ID
 */
export function getCustomRoute(id: number) {
  return request.get(`/api/custom-route/${id}`);
}

/**
 * 添加自定义路由配置
 * @param data 路由配置数据
 */
export function addCustomRoute(data: CustomRouteConfig) {
  return request.post("/api/custom-route", data);
}

/**
 * 更新自定义路由配置
 * @param id 路由配置ID
 * @param data 路由配置数据
 */
export function updateCustomRoute(id: number, data: CustomRouteConfig) {
  return request.put(`/api/custom-route/${id}`, data);
}

/**
 * 删除自定义路由配置
 * @param id 路由配置ID
 */
export function deleteCustomRoute(id: number) {
  return request.delete(`/api/custom-route/${id}`);
}

/**
 * 调试自定义路由脚本
 * @param routeConfig 路由配置
 * @param params 测试参数
 */
export function debugCustomRouteScript(
  routeConfig: CustomRouteConfig,
  params: Record<string, unknown>
) {
  return request.post("/api/custom-route/debug", {
      routeConfig,
      params,
    });
}
