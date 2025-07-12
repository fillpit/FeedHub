export interface AuthCredential {
  id?: number;
  name: string;
  authType: "cookie" | "bearer" | "basic" | "custom";
  cookie?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  customHeaders?: Record<string, string>;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
} 