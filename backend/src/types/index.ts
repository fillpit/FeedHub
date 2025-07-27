// 导入共享类型
export * from "@feedhub/shared";

// 后端特有的配置类型
export interface Config {
  app: {
    port: number;
    env: string;
  };
  database: {
    type: string;
    path: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  // ... 其他配置类型
}
