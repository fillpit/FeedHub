import request from "@/utils/request";
import type { DynamicRouteConfig } from "../../../shared/src/types/dynamicRoute";

// 重新导出共享类型以保持向后兼容
export type {
  DynamicRouteConfig,
  RouteParam,
  CustomRouteScript,
  ScriptSourceType,
} from "../../../shared/src/types/dynamicRoute";

/**
 * 获取所有动态路由配置
 */
export function getAllDynamicRoutes() {
  return request.get("/api/dynamic-route");
}

/**
 * 获取单个动态路由配置
 * @param id 路由配置ID
 */
export function getDynamicRoute(id: number) {
  return request.get(`/api/dynamic-route/${id}`);
}

/**
 * 添加动态路由配置
 * @param data 路由配置数据
 */
export function addDynamicRoute(data: DynamicRouteConfig) {
  return request.post("/api/dynamic-route", data);
}

/**
 * 更新动态路由配置
 * @param id 路由配置ID
 * @param data 路由配置数据
 */
export function updateDynamicRoute(id: number, data: DynamicRouteConfig) {
  return request.put(`/api/dynamic-route/${id}`, data);
}

/**
 * 删除动态路由配置
 * @param id 路由配置ID
 */
export function deleteDynamicRoute(id: number) {
  return request.delete(`/api/dynamic-route/${id}`);
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
  return request.post("/api/dynamic-route/debug", {
    routeConfig,
    params,
  });
}
