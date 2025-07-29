// 脚本来源类型
export type ScriptSourceType = "inline" | "url" | "file" | "package";

// 脚本配置接口
export interface CustomRouteScript {
  sourceType: ScriptSourceType; // 脚本来源类型：inline(内联代码), url(远程URL), file(上传文件), package(脚本包)
  content: string; // 脚本内容、URL或文件路径
  timeout?: number; // 脚本执行超时时间（毫秒）
}

// 路由参数配置
export interface RouteParam {
  name: string; // 参数名称
  type: "string" | "number" | "boolean"; // 参数类型
  required: boolean; // 是否必须
  default?: string | number | boolean; // 默认值
  defaultValue?: string | number | boolean; // 前端使用的默认值字段名
  description?: string; // 参数描述
}

// 动态路由配置接口（前后端共用）
export interface DynamicRouteConfig {
  id?: number;
  name: string; // 路由名称
  path: string; // 路由路径，例如 /custom/my-route
  method: "GET" | "POST" | string; // HTTP方法
  params?: RouteParam[]; // 路由参数配置
  script: CustomRouteScript; // 脚本配置
  description?: string; // 路由描述
  refreshInterval: number; // 刷新间隔（分钟）
  authCredentialId?: number; // 关联的授权信息ID
  createdAt?: Date;
  updatedAt?: Date;
}

// 后端数据库模型属性接口
export interface DynamicRouteConfigAttributes
  extends Required<Omit<DynamicRouteConfig, "id" | "params" | "authCredentialId">> {
  id: number;
  params: RouteParam[];
  description: string;
  authCredentialId?: number;
  createdAt: Date;
  updatedAt: Date;
}
