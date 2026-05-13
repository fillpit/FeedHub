# 编码规范指南 (Coding Style Guide)

> 本文档基于项目现有代码提炼总结，适用于 `backend`、`frontend`、`electron` 三个子包。  
> 遵守规范有助于保持代码一致性、可维护性和可读性。

---

## 目录

1. [TypeScript 规范](#1-typescript-规范)
2. [命名规范](#2-命名规范)
3. [格式规范](#3-格式规范)
4. [ESLint 规范](#4-eslint-规范)
5. [模块结构规范](#5-模块结构规范)

---

## 1. TypeScript 规范

### 1.1 严格模式

所有子包均开启 TypeScript `strict` 模式，**任何地方都不得关闭**。

```jsonc
// backend/tsconfig.json & frontend/tsconfig.app.json
{
  "compilerOptions": {
    "strict": true
  }
}
```

| 项目 | target | module | 特殊配置 |
|------|--------|--------|---------|
| backend | `ES2022` | `CommonJS` | `declaration: true`, `esModuleInterop: true` |
| frontend | `ES2020` | `ESNext` | `jsx: react-jsx`, `moduleResolution: Bundler` |

### 1.2 类型声明

**✅ 推荐 — 使用 `interface` 声明对象结构**

```typescript
// frontend/src/types/index.ts
export interface User {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  category: AuditCategory;
  action: string;
  level: AuditLevel;
}
```

**✅ 推荐 — 使用 `type` 声明联合类型 / 字面量类型**

```typescript
// 联合类型
export type AuditCategory = "auth" | "note" | "notebook" | "tag" | "task" | "share" | "ai" | "plugin" | "system";
export type AuditLevel = "info" | "warn" | "error";
export type ViewMode = "notebook" | "favorites" | "trash" | "all" | "search" | "tasks" | "ai-chat";

// 带 payload 的 Action 联合类型
type Action =
  | { type: "SET_NOTEBOOKS"; payload: Notebook[] }
  | { type: "SET_NOTES"; payload: NoteListItem[] }
  | { type: "TOGGLE_SIDEBAR" };
```

**✅ 推荐 — 接口中为可选/可空字段明确标注**

```typescript
export interface Note {
  trashedAt: string | null;   // 可为 null
  tags?: Tag[];               // 可选字段
  version: number;            // 必填
}
```

### 1.3 类型断言

**✅ 允许 — 已知结构时使用 `as` 类型断言**

```typescript
const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
const rows = db.prepare("SELECT ...").all() as { key: string; value: string }[];
```

**❌ 禁止 — 滥用 `any`，后端须将 `@typescript-eslint/no-explicit-any` 视为 `warn`**

```typescript
// ❌ 不推荐，仅在无法避免时使用
const user = db.prepare("...").get(id) as any;

// ✅ 推荐，尽量定义具体类型
const user = db.prepare("...").get(id) as UserRow;
```

### 1.4 泛型使用

```typescript
// Context 类型约束
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// 泛型函数
function getSavedWidth(): number { ... }

// 带约束的 Partial
type UpdatePayload = Partial<NoteListItem> & { id: string };
```

### 1.5 枚举与常量

**✅ 使用 `const` 对象代替 `enum`（更好的 tree-shaking）**

```typescript
// ✅ 推荐
const AI_DEFAULTS: AISettings = {
  ai_provider: "openai",
  ai_api_url: "https://api.openai.com/v1",
  ai_api_key: "",
  ai_model: "gpt-4o-mini",
};

// ✅ 推荐
const NO_KEY_PROVIDERS = ["ollama"];
```

### 1.6 类与单例

服务层可使用 `class` 配合私有静态实例实现单例：

```typescript
class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!this.instance) {
      this.instance = new AuditLogger();
    }
    return this.instance;
  }
  
  // 使用 JSDoc 注释公共方法
  /** 记录审计日志 */
  log(params: { ... }): void { ... }
}

export const auditLogger = AuditLogger.getInstance();
```

---

## 2. 命名规范

### 2.1 变量与函数

| 类型 | 规范 | 示例 |
|------|------|------|
| 普通变量 | `camelCase` | `sidebarWidth`, `isLoading`, `authHeader` |
| 布尔变量 | `is` / `has` / `can` 前缀 | `isAuthenticated`, `hasPassword`, `isValid` |
| 常量（模块级） | `SCREAMING_SNAKE_CASE` | `JWT_SECRET`, `AI_DEFAULTS`, `DEFAULT_SIDEBAR_WIDTH` |
| 函数 | `camelCase`，动词开头 | `getDb()`, `initSchema()`, `logAudit()` |
| 异步函数 | `camelCase`，通常配合 `async` | `checkAuth()`, `updateSiteConfig()` |
| React Hook | `use` 前缀 + `PascalCase` | `useApp()`, `useSiteSettings()`, `useSwipeGesture()` |

```typescript
// ✅ 正确示例
const JWT_EXPIRES_IN = "30d";
const isValid = await bcrypt.compare(password, user.passwordHash);
const userMenuRef = useRef<HTMLDivElement>(null);

function getAISettings(): AISettings { ... }
async function checkAuth() { ... }
export function useSiteSettings() { ... }
```

### 2.2 React 组件

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件函数 | `PascalCase` | `Sidebar`, `AppLayout`, `AuthGate` |
| 组件文件 | `PascalCase.tsx` | `Sidebar.tsx`, `LoginPage.tsx` |
| Provider 组件 | `XxxProvider` 后缀 | `AppProvider`, `SiteSettingsProvider`, `ThemeProvider` |
| Context | `XxxContext` 后缀 | `AppContext`, `SiteSettingsContext` |

```typescript
// ✅ 正确示例
export function AppProvider({ children }: { children: React.ReactNode }) { ... }
export function useApp() { ... }
function SidebarResizeHandle() { ... }   // 内部组件，非导出
```

### 2.3 类型与接口

| 类型 | 规范 | 示例 |
|------|------|------|
| `interface` | `PascalCase` | `User`, `Note`, `AISettings`, `AuditEntry` |
| `type` 别名 | `PascalCase` | `ViewMode`, `AuditLevel`, `SyncStatus`, `AIAction` |
| 泛型参数 | 单个大写字母或描述性名称 | `T`, `Action`, `Payload` |

### 2.4 文件与目录

| 类型 | 规范 | 示例 |
|------|------|------|
| React 组件文件 | `PascalCase.tsx` | `Sidebar.tsx`, `AIChatPanel.tsx` |
| Hook 文件 | `camelCase.ts(x)` | `useSiteSettings.tsx`, `useCapacitor.ts` |
| 工具/服务文件 | `camelCase.ts` | `audit.ts`, `backup.ts`, `openapi.ts` |
| 路由文件 | `camelCase.ts`（以资源命名） | `auth.ts`, `ai.ts`, `settings.ts` |
| 类型声明文件 | `index.ts` 或 `xxx.d.ts` | `types/index.ts`, `word-extractor.d.ts` |
| 目录 | `camelCase`（单数或复数均可） | `routes/`, `services/`, `components/`, `hooks/` |

### 2.5 API 路由与数据库字段

```typescript
// API 路由：kebab-case，REST 风格
// GET  /api/ai/settings
// PUT  /api/ai/settings
// POST /api/ai/test
// POST /api/auth/change-password

// 数据库字段：camelCase（JS对象映射）
export interface AuditEntry {
  userId: string;
  targetType: string;
  createdAt: string;
}

// 系统设置 key：snake_case（直接存储）
const AI_DEFAULTS = {
  ai_provider: "openai",
  ai_api_url: "...",
  ai_api_key: "",
};
```

---

## 3. 格式规范

### 3.1 引号

- **字符串使用双引号 `"`**（整个项目统一，包括 import 路径）

```typescript
// ✅ 正确
import { Hono } from "hono";
import path from "path";
const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

// ❌ 错误
import { Hono } from 'hono';
```

- **JSX 属性使用双引号**

```tsx
<div className="flex items-center gap-2">
<Button variant="ghost" size="icon">
```

### 3.2 缩进与空白

- 使用 **2 空格** 缩进（不使用 Tab）
- 函数/对象 `{` 与关键字同行

```typescript
// ✅ 正确
function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
  }
  return db;
}

// ❌ 错误
function getDb(): Database.Database
{
    if (!db)
    {
        db = new Database(DB_PATH);
    }
}
```

### 3.3 分号

- **使用分号** 结束语句（与 TypeScript 编译器默认一致）

```typescript
const app = new Hono();
export const auditLogger = AuditLogger.getInstance();
```

### 3.4 箭头函数

- 单参数可省略括号，但项目中多用括号以保持一致
- 函数体单表达式可省略 `return` 和 `{}`

```typescript
// ✅ 推荐 —— 简洁箭头函数
app.get("/api/health", (c) => c.json({ status: "ok" }));
const models = data.models.map((m: any) => ({ id: m.id, name: m.name }));

// ✅ 多行时用块体
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  isDragging.current = true;
  // ...
}, []);
```

### 3.5 对象与数组格式

```typescript
// ✅ 短对象写一行
const result = { status: "ok", version: "1.0.0" };

// ✅ 长对象多行，末尾加逗号
const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
};

// ✅ 解构赋值
const { username, password } = body as { username: string; password: string };
const { state } = useApp();
const actions = useAppActions();
```

### 3.6 import 顺序

按以下顺序组织 import，各组之间留空行：

```typescript
// 1. 第三方库（框架/工具）
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import jwt from "jsonwebtoken";

// 2. 内部模块（相对路径或别名）
import { getDb } from "../db/schema";
import { logAudit } from "../services/audit";

// 前端示例：
// 1. React 及第三方库
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// 2. 内部组件（@ 别名路径）
import Sidebar from "@/components/Sidebar";
import { useApp, useAppActions } from "@/store/AppContext";

// 3. 类型导入
import { User } from "@/types";
```

### 3.7 注释规范

**区块注释** — 使用 `// ===== 标题 =====` 分隔模块内大段落：

```typescript
// ===== AI 设置管理 =====
// ===== AI 连接测试 =====
// ===== 类型 =====
// ===== 导出 =====
```

**行内注释** — 解释非显而易见的逻辑：

```typescript
db.pragma("journal_mode = WAL");  // 启用 WAL 模式提升并发性能
db.pragma("foreign_keys = ON");   // 强制外键约束
const JWT_EXPIRES_IN = "30d";     // 30天免登录
```

**JSDoc 注释** — 为导出函数/方法加 JSDoc：

```typescript
/** 记录审计日志 */
log(params: { userId: string; ... }): void { ... }

/** 查询审计日志 */
query(params: { ... }): { logs: AuditEntry[]; total: number } { ... }

/** 清理过期日志（保留指定天数） */
cleanup(retentionDays: number = 90): number { ... }
```

**TODO 注释** — 使用标准格式：

```typescript
// TODO: 启用自动备份
// try {
//   getBackupManager().startAutoBackup(24);
// } catch { /* 备份启动失败不阻塞服务 */ }
```

### 3.8 错误处理

```typescript
// ✅ 后端：统一返回 JSON 错误响应
return c.json({ error: "Token 无效或已过期" }, 401);
return c.json({ error: "未配置 API 地址" }, 400);

// ✅ try-catch 中捕获错误，记录日志，返回统一格式
try {
  resetTransaction();
  return c.json({ success: true, message: "操作成功" });
} catch (error) {
  console.error("操作失败:", error);
  return c.json({ error: "操作失败" }, 500);
}

// ✅ 空 catch 块须写注释说明原因
try {
  localStorage.setItem("key", value);
} catch { /* 忽略私有模式下的存储失败 */ }

// ✅ 前端：Promise 链式错误处理
fetch(url)
  .then((res) => res.json())
  .catch(() => {
    localStorage.removeItem("nowen-token");
    setIsAuthenticated(false);
  });
```

---

## 4. ESLint 规范

### 4.1 配置文件

项目使用 **ESLint v9 Flat Config**，配置文件位于根目录 `eslint.config.js`，采用分层配置：

```
eslint.config.js          ← 根配置（全局生效）
├── 全局 ignores
├── 基础配置（全部 TS 文件）
├── 前端专用配置（frontend/src/**）
├── 后端专用配置（backend/src/**）
└── Electron 专用配置（electron/**）
```

> **注意**：`frontend/` 子目录内无独立 `eslint.config.js`，Lint 作用域由根配置的 `files` 字段控制。

### 4.2 各层规则说明

**全局忽略（不 Lint）**

```javascript
ignores: ['**/dist/**', '**/node_modules/**', '**/build/**', '**/temp/**', 'scripts/**']
```

**基础配置（全部 `.ts` / `.tsx`）**

- 继承 `js.configs.recommended`
- 继承 `tseslint.configs.recommended`
- `ecmaVersion: 2020`

**前端专用（`frontend/src/**/*.{ts,tsx}`）**

- 全局变量：`globals.browser`
- 插件：`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`
- 规则：React Hooks 推荐规则全量开启
- `react-refresh/only-export-components` 设为 `warn`

**后端专用（`backend/src/**/*.ts`）**

- 全局变量：`globals.node`
- `@typescript-eslint/no-explicit-any`: `"warn"`（允许使用 `any`，但会警告）

**Electron 专用（`electron/**/*.js`）**

- 全局变量：`globals.node` + `globals.browser`

### 4.3 日常 Lint 操作

```bash
# 在根目录执行，检查整个 monorepo
pnpm lint

# 或直接调用 eslint
npx eslint .
```

### 4.4 推荐规则原则

| 规则 | 说明 |
|------|------|
| `no-explicit-any` | 后端 `warn`，尽量避免；前端继承 TS 推荐配置 |
| `react-hooks/rules-of-hooks` | **error**，严格遵守 Hook 调用规则 |
| `react-hooks/exhaustive-deps` | **warn**，依赖数组须完整 |
| `@typescript-eslint/no-unused-vars` | 继承推荐配置（默认 `warn`） |

### 4.5 抑制 Lint 警告

仅在**确实无法解决**时使用行内注释抑制，并**必须附上原因**：

```typescript
// @ts-ignore — 模板模式需要动态 viewMode，类型扩展待完善
actions.setViewMode(item.mode);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const result = db.prepare("...").get(id) as any;
```

**❌ 禁止** 在文件顶部使用 `// @ts-nocheck` 或大范围 `eslint-disable`。

---

## 5. 模块结构规范

### 5.1 整体 Monorepo 结构

```
nodejs-template/
├── backend/                 # Hono + SQLite 后端服务
│   └── src/
│       ├── index.ts         # 应用入口，注册中间件与路由
│       ├── routes/          # 路由处理（按资源划分）
│       ├── services/        # 业务逻辑 / 工具服务
│       ├── db/              # 数据库连接、Schema、Seed
│       └── types/           # 后端特有类型声明
├── frontend/                # React + Vite 前端
│   └── src/
│       ├── main.tsx         # 前端入口
│       ├── App.tsx          # 根组件（路由/布局）
│       ├── components/      # UI 组件
│       │   └── ui/          # shadcn/ui 基础组件
│       ├── hooks/           # 自定义 Hook
│       ├── store/           # 全局状态（Context + Reducer）
│       ├── lib/             # 工具函数（api.ts, utils.ts 等）
│       ├── types/           # 全局类型定义（index.ts）
│       ├── i18n/            # 国际化配置
│       └── assets/          # 静态资源
├── electron/                # Electron 主进程（JS）
├── docs/                    # 项目文档
├── scripts/                 # 构建/初始化脚本
├── eslint.config.js         # 根 ESLint 配置（v9 Flat）
├── package.json             # 根 package（pnpm workspace）
└── pnpm-workspace.yaml      # workspace 包声明
```

### 5.2 后端模块结构

#### 路由文件（`routes/xxx.ts`）

每个路由文件对应一个资源域，遵循以下模式：

```typescript
import { Hono } from "hono";
import { getDb } from "../db/schema";

const resource = new Hono();  // 实例以资源名命名

// GET /api/resource
resource.get("/", (c) => { ... });

// POST /api/resource
resource.post("/", async (c) => {
  const body = await c.req.json();
  // 参数校验 → 业务逻辑 → 返回响应
  return c.json({ ... });
});

export default resource;
```

#### 服务文件（`services/xxx.ts`）

- 封装**可复用的业务逻辑**，不直接处理 HTTP Request/Response
- 复杂服务使用 `class` + 单例模式
- 简单工具函数直接 `export function`

```typescript
// 推荐模式：便捷函数包裹复杂服务
export const auditLogger = AuditLogger.getInstance();

/** 便捷方法：记录审计日志 */
export function logAudit(userId: string, category: AuditCategory, action: string, ...): void {
  auditLogger.log({ userId, category, action, ... });
}
```

#### 入口文件（`src/index.ts`）

遵循 **注册顺序**：
1. 全局中间件（`logger`, `cors`）
2. 初始化数据库
3. 公开路由（无需鉴权）
4. JWT 鉴权中间件
5. 受保护路由
6. 生产环境静态文件服务
7. 启动服务

```typescript
// ① 中间件
app.use("*", logger());
app.use("*", cors({ ... }));

// ② 数据库初始化
getDb();
seedDatabase();

// ③ 公开路由（先注册）
app.route("/api/auth", authRouter);
app.get("/api/health", (c) => c.json({ status: "ok" }));

// ④ JWT 中间件（保护后续路由）
app.use("/api/*", async (c, next) => { ... });

// ⑤ 受保护路由
app.route("/api/ai", aiRouter);
```

### 5.3 前端模块结构

#### 组件文件（`components/XxxComponent.tsx`）

```typescript
// ① Imports（分组）
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApp, useAppActions } from "@/store/AppContext";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

// ② 内部组件（不导出，首字母大写）
function InternalHelper() { ... }

// ③ 主组件（默认导出）
export default function MainComponent() {
  // State
  const [localState, setLocalState] = useState("");
  // Context
  const { state } = useApp();
  const actions = useAppActions();

  // Effects
  useEffect(() => { ... }, []);

  // Event handlers
  const handleClick = useCallback(() => { ... }, []);

  // Render
  return ( <div>...</div> );
}
```

#### Hook 文件（`hooks/useXxx.ts(x)`）

- 每个 Hook 一个文件
- 文件名与 Hook 名一致

```typescript
// hooks/useSiteSettings.tsx
export interface SiteConfig { ... }

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) { ... }

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
```

#### 状态管理（`store/AppContext.tsx`）

使用 **React Context + useReducer** 模式：

```typescript
// 1. 定义 State 类型
interface AppState { ... }

// 2. 定义 Action 联合类型（SCREAMING_SNAKE_CASE 类型名）
type Action =
  | { type: "SET_NOTEBOOKS"; payload: Notebook[] }
  | { type: "TOGGLE_SIDEBAR" };

// 3. Reducer 函数（纯函数）
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_NOTEBOOKS": return { ...state, notebooks: action.payload };
    default: return state;
  }
}

// 4. Provider + 两个 Hook（读/写分离）
export function AppProvider({ children }: { children: React.ReactNode }) { ... }
export function useApp() { ... }       // 读取 state
export function useAppActions() { ... } // 获取 dispatch 封装
```

#### 类型文件（`types/index.ts`）

- 所有全局共享类型统一放在 `types/index.ts`
- 按功能分组，组间空行分隔
- 使用注释标注分组

```typescript
// ---- 用户 ----
export interface User { ... }

// ---- 笔记本 ----
export interface Notebook { ... }
export interface Note { ... }
export interface NoteListItem { ... }

// ---- 任务 ----
export type TaskPriority = 1 | 2 | 3;
export interface Task { ... }

// ---- 分享 ----
export type SharePermission = "view" | "comment" | "edit";
export interface Share { ... }
```

### 5.4 路径别名

前端统一使用 `@/` 别名指向 `src/`，**禁止使用**跨层级相对路径：

```typescript
// ✅ 推荐
import { useApp } from "@/store/AppContext";
import { api } from "@/lib/api";
import type { User } from "@/types";

// ❌ 禁止（多层相对路径难以维护）
import { useApp } from "../../../store/AppContext";
```

### 5.5 模块导出规范

| 场景 | 规范 | 示例 |
|------|------|------|
| 路由实例 | `export default` | `export default ai;` |
| React 组件 | `export default` | `export default Sidebar;` |
| Hook / Provider | 具名导出 | `export function useApp()` |
| 类型 / 接口 | 具名导出 | `export interface User` |
| 常量 / 工具函数 | 具名导出 | `export const auditLogger` |
| 需要同时导出命名与实例 | 分别声明 | `export { JWT_SECRET }; export default auth;` |

---

## 附录：快速检查清单

在提交代码前，请确认：

- [ ] 所有变量/函数/类型命名符合规范（大小写、前缀）
- [ ] 使用双引号，2 空格缩进，语句末尾有分号
- [ ] Import 已按分组排列，使用 `@/` 别名
- [ ] 新增类型使用 `interface`（对象结构）或 `type`（联合类型）
- [ ] 没有未使用的 `@ts-nocheck` 或大范围 `eslint-disable`
- [ ] `any` 类型尽量替换为具体类型（或最少留有注释说明）
- [ ] 公开函数/方法有 JSDoc 注释
- [ ] 错误处理使用 `c.json({ error: "..." }, statusCode)` 格式（后端）
- [ ] 空 `catch` 块有说明注释
- [ ] 执行 `pnpm lint` 无报错
