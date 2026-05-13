# 项目目录结构规范

> 本文档基于项目现有代码提炼，描述前后端目录结构、模块划分原则及文件放置规则，作为日常开发的权威参考。

---

## 一、Monorepo 工作区总览

项目使用 **pnpm workspace** 管理多个子包，根目录作为工作区协调层，不承载业务逻辑。

```
nodejs-template/                  ← 工作区根目录（协调层）
├── backend/                      ← 后端子包（Node.js + Hono + SQLite）
├── frontend/                     ← 前端子包（React + Vite + TypeScript）
├── electron/                     ← Electron 桌面壳（JS，可选）
├── scripts/                      ← 工程初始化脚本（init.mjs）
├── docs/                         ← 项目文档
│   └── guidelines/               ← 开发规范指南
├── pnpm-workspace.yaml           ← 工作区包声明（backend + frontend）
├── package.json                  ← 根级 scripts（dev、build、lint、electron）
├── eslint.config.js              ← 统一 ESLint 配置（覆盖全工作区）
├── docker-compose.yml            ← Docker 编排
└── Dockerfile                    ← 容器镜像定义
```

### 根级职责规则

| 文件/目录 | 用途 | 可放内容 |
|---|---|---|
| `package.json` | 全局工具脚本入口 | 跨包 `scripts`、Electron/Capacitor 依赖 |
| `eslint.config.js` | 全工作区统一 Lint | ESLint flat config，分区覆盖前后端 |
| `scripts/` | 工程脚本 | 仅放 `.mjs` 初始化/构建脚本 |
| `docs/` | 文档 | 开发规范、API 文档等 Markdown |
| `electron/` | 桌面壳 | Electron 主进程 `.js` 文件 |

> **禁止**在根目录存放任何业务代码（TypeScript 组件/路由/服务）。

---

## 二、后端目录结构（`backend/`）

后端基于 **Hono + better-sqlite3**，采用「路由 → 服务 → 数据库」三层架构。

```
backend/
├── src/
│   ├── index.ts                  ← 应用入口（注册中间件、路由、启动服务器）
│   ├── routes/                   ← HTTP 路由层（各业务域独立文件）
│   │   ├── auth.ts               ← 认证相关（登录/验证/改密）
│   │   ├── ai.ts                 ← AI 功能（聊天/问答/文档解析）
│   │   ├── settings.ts           ← 系统设置（受 JWT 保护的写操作）
│   │   ├── fonts.ts              ← 字体管理（上传/删除）
│   │   ├── audit.ts              ← 审计日志查询
│   │   ├── backups.ts            ← 数据备份与恢复
│   │   └── plugins.ts            ← 插件管理（列表/执行/重载）
│   ├── services/                 ← 业务服务层（复杂逻辑/外部集成）
│   │   ├── openapi.ts            ← OpenAPI 3.0 规范生成
│   │   ├── backup.ts             ← 备份管理器（BackupManager 类）
│   │   ├── audit.ts              ← 审计日志写入逻辑
│   │   └── webhook.ts            ← Webhook 事件推送
│   ├── db/                       ← 数据库层
│   │   ├── schema.ts             ← Schema 定义 + 数据库连接单例（getDb）
│   │   └── seed.ts               ← 初始数据填充（seedDatabase）
│   ├── plugins/                  ← 插件系统内核
│   │   └── plugin-loader.ts      ← PluginLoader 类 + getPluginLoader 单例
│   └── types/                    ← 后端专用类型声明
│       └── word-extractor.d.ts   ← 第三方库类型补充声明（.d.ts）
├── templates/                    ← 静态文件模板
│   ├── empty.docx
│   ├── empty.pptx
│   └── empty.xlsx
├── package.json                  ← 后端依赖（hono、better-sqlite3、zod…）
├── tsconfig.json                 ← TypeScript 编译配置（输出到 dist/）
└── pnpm-workspace.yaml           ← 后端内部 workspace（如有子包）
```

### 后端各层职责

#### `src/index.ts` — 应用入口

- 创建 Hono 实例，注册全局中间件（`cors`、`logger`）
- 初始化数据库（`getDb()`、`seedDatabase()`）
- **公开路由**（无需 JWT）在 JWT 中间件之前注册：`/api/auth`、`/api/health`、`/api/settings`（GET）、`/api/fonts`（GET）
- **受保护路由**（需 JWT）在中间件之后注册：`/api/ai`、`/api/settings`（PUT）等
- 生产模式下承担前端静态文件服务（SPA fallback）

> **规则**：不在 `index.ts` 内写业务逻辑；新路由通过 `app.route()` 挂载独立 Router 文件。

#### `src/routes/` — 路由层

- **一个业务域对应一个文件**，文件名用小写驼峰（`camelCase`）
- 每个路由文件导出一个 `Hono` 实例（`export default router`）
- 路由只做参数解析、鉴权检查、调用服务层/数据库、返回响应
- 复杂的业务逻辑（超过 20 行）应抽取到 `services/`

```ts
// ✅ 正确：路由文件结构示例
import { Hono } from "hono";
import { getDb } from "../db/schema";

const router = new Hono();

router.get("/", (c) => {
  const db = getDb();
  // ...直接数据库操作（简单 CRUD 可接受）
  return c.json(result);
});

export default router;
```

#### `src/services/` — 服务层

- 放置**复杂业务逻辑**：外部 API 调用（AI/Webhook）、文件处理、数据聚合
- 服务可以是函数导出或 Class（有状态时用 Class + 单例，如 `BackupManager`）
- 服务层不直接接触 HTTP 上下文（不依赖 Hono 的 `Context`）

```ts
// ✅ 正确：服务层函数
export function generateOpenAPISpec(): Record<string, any> { ... }

// ✅ 正确：有状态的服务用 Class + 单例
export class BackupManager { ... }
let _manager: BackupManager | null = null;
export function getBackupManager(): BackupManager { ... }
```

#### `src/db/` — 数据库层

- `schema.ts`：SQLite 连接单例（`getDb()`）+ 全部建表 DDL（`initSchema`）
- `seed.ts`：开发/初始化数据（`seedDatabase()`），仅在首次启动时运行
- **数据库迁移**：在 `initSchema` 末尾使用 `try/catch` 方式追加 `ALTER TABLE`，不引入额外迁移框架

#### `src/plugins/` — 插件内核

- 存放插件系统的核心基础设施（加载器、接口定义）
- 实际插件文件（用户安装的）位于运行时目录 `data/plugins/`，**不在源码中**

#### `src/types/` — 类型声明

- 仅放**后端专用**的 TypeScript 类型文件（`.d.ts` 补充声明）
- 前后端共享的业务类型不放这里（前端的在 `frontend/src/types/`）

---

## 三、前端目录结构（`frontend/`）

前端基于 **React 18 + Vite + TypeScript + Tailwind CSS**，采用「页面/视图 → 组件 → 状态/Hooks → 服务」分层。

```
frontend/
├── src/
│   ├── main.tsx                  ← React 挂载入口（ReactDOM.createRoot）
│   ├── App.tsx                   ← 根组件（路由分发、认证门卫 AuthGate、布局）
│   ├── index.css                 ← 全局样式（CSS 变量、Tailwind 基础层）
│   ├── App.css                   ← App 级别补充样式
│   ├── vite-env.d.ts             ← Vite 环境变量类型声明
│   │
│   ├── components/               ← UI 组件（按功能域划分）
│   │   ├── Sidebar.tsx           ← 侧边栏导航（顶级页面组件）
│   │   ├── Dashboard.tsx         ← 主内容区
│   │   ├── AdminPanel.tsx        ← 管理面板
│   │   ├── AIChatPanel.tsx       ← AI 聊天视图
│   │   ├── LoginPage.tsx         ← 登录页面
│   │   ├── SettingsModal.tsx     ← 设置弹窗
│   │   ├── ShareModal.tsx        ← 分享弹窗
│   │   ├── SecuritySettings.tsx  ← 安全设置面板
│   │   ├── AISettingsPanel.tsx   ← AI 配置面板
│   │   ├── AIWritingAssistant.tsx ← AI 写作助手
│   │   ├── ServerConnect.tsx     ← 服务器连接配置
│   │   ├── ThemeProvider.tsx     ← 主题 Provider（next-themes）
│   │   ├── ThemeToggle.tsx       ← 亮/暗切换按钮
│   │   ├── ContextMenu.tsx       ← 右键上下文菜单
│   │   └── ui/                   ← 基础 UI 原子组件（shadcn/ui 风格）
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── scroll-area.tsx
│   │       └── tooltip.tsx
│   │
│   ├── store/                    ← 全局状态管理
│   │   └── AppContext.tsx        ← React Context + useReducer（AppProvider）
│   │
│   ├── hooks/                    ← 自定义 React Hooks
│   │   ├── useCapacitor.ts       ← Capacitor 移动端适配 hooks
│   │   ├── useContextMenu.ts     ← 右键菜单逻辑
│   │   └── useSiteSettings.tsx   ← 站点配置（SiteSettingsProvider + useSiteSettings）
│   │
│   ├── lib/                      ← 工具函数与 API 客户端
│   │   ├── api.ts                ← 全部后端 API 调用（单一 api 对象导出）
│   │   ├── miNoteService.ts      ← 小米云笔记第三方服务适配
│   │   └── utils.ts              ← 通用工具函数（cn 等）
│   │
│   ├── types/                    ← TypeScript 类型定义
│   │   └── index.ts              ← 全部前端业务类型（统一从此导入）
│   │
│   ├── i18n/                     ← 国际化
│   │   ├── index.ts              ← i18next 初始化配置
│   │   └── locales/              ← 翻译资源文件
│   │       ├── zh-CN.json        ← 中文简体
│   │       └── en.json           ← 英文
│   │
│   └── assets/                   ← 静态资源（图片、SVG 等）
│
├── public/                       ← 不经过 Vite 处理的静态文件
├── android/                      ← Capacitor Android 工程（自动生成）
├── index.html                    ← HTML 入口模板
├── vite.config.ts                ← Vite 构建配置（路径别名、代理、分包）
├── tailwind.config.cjs           ← Tailwind CSS 配置
├── postcss.config.cjs            ← PostCSS 配置
├── tsconfig.json                 ← TypeScript 项目引用配置
├── tsconfig.app.json             ← 应用源码 TS 配置
├── tsconfig.node.json            ← Node 工具（vite.config）TS 配置
├── components.json               ← shadcn/ui CLI 配置
└── package.json                  ← 前端依赖
```

### 前端各层职责

#### `src/main.tsx` — 挂载入口

- 仅做 `ReactDOM.createRoot` 挂载，不含业务逻辑
- 导入全局样式（`index.css`）和 i18n 初始化

#### `src/App.tsx` — 根组件

- 嵌套全局 Provider 的**唯一位置**：`ThemeProvider → SiteSettingsProvider → AppProvider`
- 包含 `AuthGate`（认证门卫：未登录显示 `LoginPage`，已登录显示 `AppLayout`）
- 包含顶层布局组件（侧边栏拖拽、移动端手势、响应式布局）
- **不包含**具体的业务功能代码，只做组件装配

#### `src/components/` — 组件层

```
components/
├── [功能域].tsx        ← 页面级/视图级组件（PascalCase）
└── ui/               ← 基础原子组件（受 shadcn/ui 规范管理）
```

**文件命名规则**：
- 组件文件使用 **PascalCase**（`Dashboard.tsx`、`SettingsModal.tsx`）
- `ui/` 内的原子组件使用 **kebab-case**（`scroll-area.tsx`、`tooltip.tsx`）

**组件分类规则**：

| 组件类型 | 放置位置 | 示例 |
|---|---|---|
| 页面/视图级组件 | `components/` 根层 | `Dashboard.tsx`、`LoginPage.tsx` |
| 功能性弹窗/面板 | `components/` 根层 | `SettingsModal.tsx`、`ShareModal.tsx` |
| 基础 UI 原子组件 | `components/ui/` | `button.tsx`、`input.tsx` |
| 全局 Provider | `components/` 根层或 `hooks/` | `ThemeProvider.tsx`、`useSiteSettings.tsx` |

> **规则**：单个组件文件应只导出一个主组件；如有紧密相关的子组件可在同文件内定义但不单独导出。

#### `src/store/` — 全局状态

- 当前使用 **React Context + useReducer** 模式（`AppContext.tsx`）
- `AppContext.tsx` 包含：State 类型定义 → Action 类型定义 → Reducer → Provider → `useApp()` hook → `useAppActions()` hook
- **一个 Context 对应一个文件**；若需新增独立状态域，创建新的 `XxxContext.tsx`
- 局部状态（仅组件内使用）用 `useState`，不要抬升到全局 store

#### `src/hooks/` — 自定义 Hooks

- 文件名以 `use` 开头，`camelCase`（`useCapacitor.ts`、`useSiteSettings.tsx`）
- 当 hook 内含有 JSX（Provider 组件）时使用 `.tsx` 扩展名，否则使用 `.ts`
- 每个 hook 文件专注于单一关注点（平台适配、UI 交互、数据获取）

#### `src/lib/` — 工具与服务

```
lib/
├── api.ts            ← 所有后端接口的封装（唯一 HTTP 出口）
├── utils.ts          ← 通用纯函数（如 cn 合并 className）
└── [service].ts      ← 第三方/外部服务适配（如 miNoteService.ts）
```

**API 客户端规则**（`lib/api.ts`）：
- 所有后端请求通过统一的 `request<T>()` 私有函数发起
- 对外仅暴露一个 `api` 对象（命名空间）和独立工具函数（`getServerUrl`、`testServerConnection`）
- 按业务域分组，用注释标注（`// User`、`// Notebooks`、`// AI`…）
- SSE 流式请求直接用 `fetch` 实现，不走 `request()` 封装

#### `src/types/` — 类型定义

- **所有前端业务类型统一定义在 `types/index.ts`**，从此文件统一导入
- 每个接口（`interface`）对应后端数据库实体或 API 响应结构
- 列表与详情类型分离（`NoteListItem` vs `Note`）
- 枚举类型使用 `type` 联合类型（`export type ViewMode = "all" | "favorites" | ...`）

#### `src/i18n/` — 国际化

```
i18n/
├── index.ts              ← i18next 初始化（语言检测、资源注册）
└── locales/
    ├── zh-CN.json        ← 中文键值对
    └── en.json           ← 英文键值对
```

**规则**：
- 新增语言时在 `locales/` 下添加对应的 JSON 文件
- 翻译 key 使用点分命名（`"auth.verifying"`、`"fonts.serif"`）
- 组件内使用 `useTranslation()` hook，调用 `t('key')`

---

## 四、文件命名规范汇总

| 场景 | 命名规范 | 示例 |
|---|---|---|
| 前端 React 组件 | `PascalCase.tsx` | `SettingsModal.tsx` |
| 前端 shadcn/ui 原子组件 | `kebab-case.tsx` | `scroll-area.tsx` |
| 前端自定义 Hook | `useCamelCase.ts(x)` | `useCapacitor.ts` |
| 前端工具/服务 | `camelCase.ts` | `api.ts`、`utils.ts` |
| 前端类型文件 | `index.ts` 或 `camelCase.ts` | `types/index.ts` |
| 前端 i18n 资源 | `[lang-REGION].json` | `zh-CN.json`、`en.json` |
| 后端路由文件 | `camelCase.ts` | `auth.ts`、`backups.ts` |
| 后端服务文件 | `camelCase.ts` | `openapi.ts`、`backup.ts` |
| 后端类型声明 | `camelCase.d.ts` | `word-extractor.d.ts` |

---

## 五、路径别名规则

前端通过 Vite 配置了路径别名，**禁止使用相对路径 `../../` 跨层级引用**：

```ts
// vite.config.ts 中配置
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

**使用规范**：

```ts
// ✅ 正确：使用 @ 别名
import { api } from "@/lib/api";
import { useApp } from "@/store/AppContext";
import type { User } from "@/types";

// ❌ 错误：跨层相对路径
import { api } from "../../lib/api";
```

---

## 六、ESLint 分区配置规则

根目录 `eslint.config.js` 采用 **ESLint Flat Config** 格式，按文件路径分区应用规则：

| 分区 | 覆盖路径 | 特殊规则 |
|---|---|---|
| 全局忽略 | `dist/`、`node_modules/`、`build/`、`scripts/` | — |
| TypeScript 基础 | `**/*.{ts,tsx}` | `@eslint/js` + `typescript-eslint` |
| 前端专用 | `frontend/src/**/*.{ts,tsx}` | React Hooks 规则、react-refresh |
| 后端专用 | `backend/src/**/*.ts` | `no-explicit-any: warn`、Node.js globals |
| Electron 专用 | `electron/**/*.js` | browser + node globals |

> **规则**：新增文件放到正确目录，即可自动继承对应的 Lint 规则，无需手动配置。

---

## 七、数据流向与模块依赖规则

```
前端数据流
──────────────────────────────────────────────────────
UI 组件 (components/)
  ↕ props / callbacks
自定义 Hooks (hooks/)           ← 封装 UI 逻辑，可访问 store
  ↕
全局状态 (store/AppContext)     ← 全局共享状态
  ↕
API 客户端 (lib/api.ts)         ← 唯一 HTTP 出口
  ↕ HTTP/SSE
后端 API (/api/...)
──────────────────────────────────────────────────────

后端数据流
──────────────────────────────────────────────────────
HTTP 请求
  ↓
路由层 (routes/*.ts)            ← 参数解析、权限检查、响应构造
  ↓
服务层 (services/*.ts)          ← 复杂业务逻辑（可选）
  ↓
数据库层 (db/schema.ts)         ← SQLite 操作（better-sqlite3）
──────────────────────────────────────────────────────
```

**禁止的依赖方向**：
- `types/` 不得依赖任何业务模块
- `lib/utils.ts` 不得导入 `lib/api.ts`（单向依赖）
- 路由层不得直接 `import` 另一个路由文件
- 前端组件不得直接 `fetch`，必须通过 `lib/api.ts`

---

## 八、新增功能标准流程

### 新增后端 API 模块

1. 在 `backend/src/routes/` 创建路由文件 `{domain}.ts`
2. 如有复杂逻辑，在 `backend/src/services/` 创建对应服务文件
3. 在 `backend/src/db/schema.ts` 的 `initSchema()` 中追加建表 DDL
4. 在 `backend/src/index.ts` 使用 `app.route("/api/{domain}", router)` 注册
5. 在 `backend/src/services/openapi.ts` 的 `paths` 中补充该路由的 OpenAPI 文档

### 新增前端页面/功能

1. 在 `frontend/src/components/` 创建 `{Feature}.tsx` 组件
2. 在 `frontend/src/types/index.ts` 追加相关 TypeScript 类型
3. 在 `frontend/src/lib/api.ts` 的 `api` 对象中追加接口调用方法
4. 如有复杂 UI 状态，在 `frontend/src/hooks/` 创建 `use{Feature}.ts(x)`
5. 如需全局共享状态，在 `AppContext.tsx` 中添加 State 字段 + Action + Reducer case
6. 在 `frontend/src/i18n/locales/zh-CN.json` 和 `en.json` 中补充翻译 key

### 新增基础 UI 组件

1. 在 `frontend/src/components/ui/` 创建 `{component-name}.tsx`
2. 组件基于 Radix UI 原语实现，遵循 shadcn/ui 的 `cn()` + `cva()` 风格
3. 在 `components.json` 中登记（如使用 shadcn CLI 管理）

---

## 九、运行时数据目录（非源码）

后端运行时产生的数据**不在源码目录中**，存放在以下路径（由环境变量控制）：

```
data/                            ← 默认运行时数据根目录（process.cwd()/data）
├── nowen-note.db                ← SQLite 数据库（DB_PATH 环境变量）
├── fonts/                       ← 用户上传的字体文件
├── plugins/                     ← 用户安装的插件（manifest.json + 入口 JS）
└── backups/                     ← 自动/手动备份文件
```

| 环境变量 | 作用 | 默认值 |
|---|---|---|
| `DB_PATH` | SQLite 数据库路径 | `{cwd}/data/nowen-note.db` |
| `ELECTRON_USER_DATA` | Electron 模式下的数据根目录 | 无 |
| `FRONTEND_DIST` | 生产模式前端静态文件目录 | `{cwd}/frontend/dist` |
| `PORT` | 服务监听端口 | `3001` |
| `JWT_SECRET` | JWT 签名密钥 | 内置默认值（**生产必须覆盖**）|

---

## 十、目录结构检查清单

开发新功能前，根据以下清单确认文件放置位置：

- [ ] 是业务路由代码？→ `backend/src/routes/{domain}.ts`
- [ ] 是业务逻辑/外部集成？→ `backend/src/services/{service}.ts`
- [ ] 是数据库表结构？→ `backend/src/db/schema.ts`（`initSchema` 内）
- [ ] 是 React 页面/功能组件？→ `frontend/src/components/{Feature}.tsx`
- [ ] 是基础 UI 原子组件？→ `frontend/src/components/ui/{component-name}.tsx`
- [ ] 是 UI 逻辑复用？→ `frontend/src/hooks/use{Feature}.ts(x)`
- [ ] 是全局共享状态？→ `frontend/src/store/AppContext.tsx`
- [ ] 是 API 调用封装？→ `frontend/src/lib/api.ts`（`api` 对象内）
- [ ] 是业务数据类型？→ `frontend/src/types/index.ts`
- [ ] 是界面文案？→ `frontend/src/i18n/locales/*.json`
- [ ] 是工程脚本？→ `scripts/*.mjs`
- [ ] 是项目文档？→ `docs/guidelines/*.md`
