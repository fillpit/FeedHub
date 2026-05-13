# UI 样式开发规范

> 适用范围：`frontend/` 目录下所有 React 组件  
> 技术栈：React + TypeScript + Tailwind CSS v3 + shadcn/ui + Framer Motion

---

## 1. 设计系统概览

本项目采用 **CSS 变量 + Tailwind 语义 Token** 的双层设计体系：

- **第一层**：`index.css` 中定义 CSS 变量，区分 Light / Dark 主题的具体色值
- **第二层**：`tailwind.config.cjs` 中将 CSS 变量映射为 Tailwind Token，供组件直接使用
- **组件库**：基于 shadcn/ui（Radix UI），使用 `class-variance-authority (cva)` 管理变体

---

## 2. 颜色 Token 规范

### 2.1 语义化颜色（必须优先使用）

所有颜色均通过 CSS 变量实现亮/暗主题自动切换，**禁止直接硬编码色值**（特殊情况见 2.3）。

#### 应用背景色（`app-*`）

| Tailwind Token | CSS 变量 | Light 值 | Dark 值 | 用途 |
|---|---|---|---|---|
| `bg-app-bg` | `--color-bg` | `#ffffff` | `#0d1117` | 页面根背景 |
| `bg-app-surface` | `--color-surface` | `#f9fafb` | `#161b22` | 卡片、面板背景 |
| `bg-app-sidebar` | `--color-sidebar` | `#f3f4f6` | `#1c2128` | 侧边栏背景 |
| `bg-app-elevated` | `--color-elevated` | `#ffffff` | `#1c2333` | 浮层、模态框背景 |
| `bg-app-border` | `--color-border` | `#e5e7eb` | `#30363d` | 分割线、边框 |
| `bg-app-hover` | `--color-hover` | `#f3f4f6` | `#1f2937` | Hover 交互背景 |
| `bg-app-active` | `--color-active` | `#e0e7ff` | `#253040` | 激活/选中态背景 |

#### 文字色（`tx-*`）

| Tailwind Token | CSS 变量 | Light 值 | Dark 值 | 用途 |
|---|---|---|---|---|
| `text-tx-primary` | `--color-text-primary` | `#111827` | `#e6edf3` | 主要正文、标题 |
| `text-tx-secondary` | `--color-text-secondary` | `#6b7280` | `#8b949e` | 次要文字、描述 |
| `text-tx-tertiary` | `--color-text-tertiary` | `#9ca3af` | `#6e7681` | 占位符、辅助说明 |
| `text-tx-inverse` | `--color-text-inverse` | `#ffffff` | `#0d1117` | 强调色背景上的文字 |

#### 强调色（`accent-*`）

| Tailwind Token | CSS 变量 | Light 值 | Dark 值 | 用途 |
|---|---|---|---|---|
| `accent-primary` | `--color-accent-primary` | `#3b82f6` | `#58a6ff` | 主操作按钮、链接、焦点环 |
| `accent-secondary` | `--color-accent-secondary` | `#22c55e` | `#7ee787` | 成功态、正向指标 |
| `accent-warning` | `--color-accent-warning` | `#f59e0b` | `#f0883e` | 警告提示 |
| `accent-danger` | `--color-accent-danger` | `#ef4444` | `#f85149` | 错误、删除操作 |
| `accent-muted` | `--color-accent-muted` | `#9ca3af` | `#8b949e` | 禁用态、淡化强调 |

### 2.2 使用示例

```tsx
// ✅ 正确：使用语义 Token
<div className="bg-app-surface border border-app-border text-tx-primary">
  <button className="bg-accent-primary text-tx-inverse hover:bg-accent-primary/90">
    保存
  </button>
</div>

// ❌ 错误：直接硬编码色值
<div className="bg-[#f9fafb] border border-[#e5e7eb] text-[#111827]">
```

### 2.3 允许硬编码色值的场景

以下场景可使用 Tailwind 内置调色板（不依赖主题切换）：

- **登录页**（`LoginPage.tsx`）：使用 `zinc-*` + `indigo-*` 系列构建独立视觉
- **徽章/角色标签**：`blue-500/10`、`orange-500/10` 等半透明色块
- **代码高亮**（`.hljs-*`）：亮/暗主题各自独立定义

```tsx
// 角色徽章示例（可接受）
<span className={cn(
  "px-2 py-0.5 rounded-md text-[10px] font-bold",
  role === '管理员' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
)} />
```

---

## 3. 字体规范

### 3.1 UI 字体

```css
/* index.css - 系统字体栈，无需 CDN */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
  'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
  'Helvetica Neue', Helvetica, Arial, sans-serif;
```

- 优先使用系统字体，覆盖中英文双语场景
- `tailwind.config.cjs` 中的 `font-sans`（Inter）和 `font-mono`（JetBrains Mono）为备用扩展

### 3.2 编辑器字体

```css
--editor-font-family: /* 同系统字体栈 */
```

- 通过 CSS 变量 `--editor-font-family` 控制
- 用户可在设置页上传自定义字体（`.otf/.ttf/.woff/.woff2`）动态切换

### 3.3 等宽字体（代码块）

```css
font-family: 'Cascadia Code', 'Fira Code', 'Source Code Pro', 'Menlo', 'Consolas', monospace;
```

### 3.4 字体大小层级

| 场景 | 类名 | 大小 |
|---|---|---|
| 页面主标题 | `text-3xl font-bold` | 30px |
| 区块标题 | `text-xl / text-lg font-bold` | 20-24px |
| 卡片标题 | `text-lg font-semibold` | 18px |
| 正文 | `text-sm` | 14px |
| 辅助说明 | `text-xs` | 12px |
| 徽章/标签 | `text-[10px]` | 10px |

---

## 4. 间距规范

### 4.1 核心间距单位

项目统一使用 Tailwind 默认间距系统（`1 = 4px`），以下为高频使用值：

| Token | 像素 | 典型用途 |
|---|---|---|
| `0.5` | 2px | 极小间距（列表项间隔） |
| `1` | 4px | 图标内边距 |
| `1.5` | 6px | 标签内边距 |
| `2` | 8px | 按钮 icon 尺寸、小内边距 |
| `2.5` | 10px | 导航项水平内边距 |
| `3` | 12px | 卡片内边距（小） |
| `4` | 16px | 标准内边距、卡片间距 |
| `5` | 20px | 卡片内边距（中） |
| `6` | 24px | 区块内边距、Section 间距 |
| `8` | 32px | 内容区内边距 |
| `12` | 48px | 大屏内容区内边距（`lg:p-12`） |

### 4.2 组件内间距模式

```tsx
// 导航列表项
className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md"

// 卡片组件
className="p-5 flex flex-col gap-3 rounded-2xl"

// 表单行间距
className="space-y-4"   // 表单整体
className="space-y-1.5" // Label + Input 组合

// 侧边栏导航项间距
className="space-y-0.5"
```

### 4.3 最大宽度约束

| 场景 | 类名 |
|---|---|
| 登录卡片 | `max-w-[420px]` |
| 内容区 | `max-w-4xl mx-auto` |
| 模态框 | `max-w-4xl` |
| 移动端侧边栏 | `w-[85%] max-w-[340px]` |

---

## 5. 圆角规范

| 用途 | 类名 | 像素 |
|---|---|---|
| 小元素（徽章、Chip） | `rounded-md` | 6px |
| 输入框、按钮 | `rounded-lg` / `rounded-xl` | 8-12px |
| 卡片、面板 | `rounded-2xl` | 16px |
| 模态框 | `rounded-2xl` | 16px |
| 头像 | `rounded-full` | 50% |
| 图标容器（小） | `rounded-lg` | 8px |
| 图标容器（大） | `rounded-xl` / `rounded-2xl` | 12-16px |

> **规律**：越大的容器使用越大的圆角，保持视觉层次一致。

---

## 6. 阴影规范

| 场景 | 类名 |
|---|---|
| 卡片 | `shadow-sm` |
| 浮层按钮 | `shadow-sm hover:shadow-md` |
| 下拉菜单 | `shadow-xl` |
| 模态框 | `shadow-2xl` |
| 激活的导航项 | `shadow-md shadow-accent-primary/20` |

---

## 7. 动画规范

### 7.1 Tailwind 自定义动画

```js
// tailwind.config.cjs
animation: {
  "fade-in": "fadeIn 0.2s ease-out",
  "slide-in": "slideIn 0.3s ease-out",
}
```

- `animate-fade-in`：页面级内容入场
- `animate-slide-in`：侧边栏元素从左滑入

### 7.2 Framer Motion 规范

项目大量使用 Framer Motion 实现复杂动效，以下为标准配置：

#### 页面/面板入场

```tsx
initial={{ opacity: 0, y: 24 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
```

#### 卡片/弹窗缩放

```tsx
initial={{ opacity: 0, scale: 0.95, y: 10 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.95, y: 10 }}
transition={{ type: "spring", duration: 0.5, bounce: 0 }}
```

#### 下拉菜单

```tsx
initial={{ opacity: 0, y: -4 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -4 }}
transition={{ duration: 0.15 }}
```

#### 移动端侧边栏

```tsx
initial={{ x: "-100%" }}
animate={{ x: 0 }}
exit={{ x: "-100%" }}
transition={{ type: "spring", bounce: 0, duration: 0.35 }}
```

#### Tab 切换内容

```tsx
// 水平切换
initial={{ opacity: 0, x: 12 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: -12 }}
transition={{ duration: 0.15 }}

// 垂直切换
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
transition={{ duration: 0.2 }}
```

### 7.3 CSS Transition 规范

```tsx
// 颜色过渡（标准）
className="transition-colors"              // 150ms
className="transition-all"                // 150ms，多属性

// 主题切换（body 级别）
transition: background-color 0.2s ease, color 0.2s ease;
```

---

## 8. 组件规范

### 8.1 Button 组件

使用 `@/components/ui/button`，通过 `variant` 和 `size` prop 控制样式。

#### 变体（variant）

| variant | 外观 | 用途 |
|---|---|---|
| `default` | 蓝色实心 | 主操作 |
| `destructive` | 红色实心 | 删除、危险操作 |
| `outline` | 描边透明 | 次要操作 |
| `secondary` | elevated 背景 | 辅助操作 |
| `ghost` | 无背景 | 工具栏图标按钮 |
| `link` | 下划线文字链接 | 行内链接 |

#### 尺寸（size）

| size | 高度 | 内边距 | 用途 |
|---|---|---|---|
| `default` | h-9 (36px) | px-4 py-2 | 常规按钮 |
| `sm` | h-8 (32px) | px-3 | 紧凑按钮 |
| `lg` | h-10 (40px) | px-8 | 表单提交 |
| `icon` | h-8 w-8 | — | 图标按钮 |

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">主操作</Button>
<Button variant="outline">取消</Button>
<Button variant="ghost" size="icon"><Settings size={16} /></Button>
```

### 8.2 Input 组件

```tsx
import { Input } from "@/components/ui/input";

// 标准输入框 - h-9, rounded-md, border-app-border
<Input placeholder="请输入..." />
```

**自定义输入框**（在表单场景中直接写 `<input>`）：

```tsx
<input
  className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-xl
             text-sm outline-none
             focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary
             transition-all"
/>
```

### 8.3 导航项

```tsx
// 激活态
className="bg-app-active text-tx-primary"

// 默认态
className="text-tx-secondary hover:bg-app-hover hover:text-tx-primary"

// 完整导航项
<button className={cn(
  "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
  active ? "bg-app-active text-tx-primary"
         : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
)}>
  <Icon size={16} />
  {label}
</button>
```

### 8.4 卡片组件

```tsx
// 标准信息卡片
<div className="p-5 flex flex-col gap-3 rounded-2xl bg-app-surface/50
                border border-app-border hover:border-accent-primary/50
                transition-colors shadow-sm">
  {/* 图标容器 */}
  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
    <Icon size={20} />
  </div>
  {/* 内容 */}
  <div>
    <p className="text-sm font-medium text-tx-secondary mb-1">标签</p>
    <h3 className="text-2xl font-semibold text-tx-primary">数值</h3>
  </div>
</div>
```

### 8.5 模态框

```tsx
// 遮罩层
<motion.div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm" />

// 弹窗主体
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 10 }}
  transition={{ type: "spring", duration: 0.5, bounce: 0 }}
  className="relative w-full max-w-4xl h-[80vh] min-h-[500px]
             bg-white dark:bg-zinc-950
             rounded-2xl shadow-2xl
             border border-zinc-200 dark:border-zinc-800"
/>
```

### 8.6 下拉菜单

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 10 }}
  transition={{ duration: 0.15, ease: "easeOut" }}
  className="absolute bg-app-elevated border border-app-border
             rounded-xl shadow-xl overflow-hidden z-50 p-1.5"
>
  {/* 菜单项 */}
  <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                     text-xs text-tx-secondary
                     hover:text-tx-primary hover:bg-app-hover
                     transition-colors">
    <Icon size={14} />
    <span>菜单项</span>
  </button>
</motion.div>
```

### 8.7 选项卡（Tab）导航

```tsx
// 侧边栏中的激活 Tab（带强调色背景）
className={cn(
  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
  isActive
    ? "bg-accent-primary text-white shadow-md shadow-accent-primary/20"
    : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
)}

// 设置页中的激活 Tab（浅色高亮）
className={cn(
  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
  isActive
    ? "bg-zinc-200/70 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400"
    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50"
)}
```

### 8.8 表单 Label + Input 组合

```tsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-tx-tertiary">字段名称</label>
  <input className="w-full px-3 py-2 bg-app-bg border border-app-border
                    rounded-xl text-sm outline-none
                    focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary
                    transition-all" />
</div>
```

### 8.9 错误提示

```tsx
<motion.div
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center gap-2 px-3 py-2 rounded-lg
             bg-red-50 dark:bg-red-500/10
             border border-red-200 dark:border-red-500/20"
>
  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
</motion.div>
```

---

## 9. 布局规范

### 9.1 整体应用布局

```
┌─────────────────────────────────────────────┐
│  Sidebar (可拖拽宽度 220-480px)  │  主内容区  │
│  bg-app-sidebar                 │  bg-app-bg │
│  border-r border-app-border     │  flex-1    │
└─────────────────────────────────────────────┘
```

```tsx
// 根容器
<div className="flex h-[100dvh] w-screen bg-app-bg overflow-hidden transition-colors duration-200">
  <Sidebar />  {/* shrink-0, 宽度由 state.sidebarWidth 控制 */}
  <main className="flex-1 flex flex-col" />
</div>
```

### 9.2 双列设置布局（设置页/管理面板）

```
┌───────────────┬───────────────────────────┐
│  左侧导航      │  右侧内容区               │
│  w-56 / w-64  │  flex-1 overflow-y-auto   │
│  bg-surface   │  p-8 lg:p-12             │
└───────────────┴───────────────────────────┘
```

### 9.3 响应式适配

```tsx
// 移动端隐藏，桌面端显示
className="hidden md:flex"

// 移动端显示，桌面端隐藏
className="md:hidden"

// 网格布局响应
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
```

**移动端最小触控区域：**

```css
/* index.css */
@media (max-width: 767px) {
  button, [role="button"], a {
    min-height: 36px;
    min-width: 36px;
  }
}
```

---

## 10. 图标规范

- 统一使用 **Lucide React**（`lucide-react`）
- 导航图标：`size={16}`
- 功能图标（卡片内）：`size={20}`
- 页面级图标（空态/关于页）：`size={40}`
- 图标容器：

```tsx
// 小型图标容器（导航）
<div className="w-7 h-7 rounded-lg bg-app-hover flex items-center justify-center">
  <Icon size={14} />
</div>

// 中型图标容器（卡片）
<div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
  <Icon size={20} />
</div>

// 大型图标容器（关于页）
<div className="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
  <Icon size={40} />
</div>
```

---

## 11. 主题系统

### 11.1 主题切换机制

- 使用 `next-themes` 管理主题状态
- 通过 `.dark` class 切换（`darkMode: "class"`）
- 支持：亮色 / 暗色 / 跟随系统

```tsx
import { useTheme } from "next-themes";
const { theme, setTheme } = useTheme();
setTheme("dark" | "light" | "system");
```

### 11.2 新增 CSS 变量

需要新增主题变量时，在 `index.css` 的两个 scope 中同时定义：

```css
:root {
  --color-xxx: #light-value;
}
.dark {
  --color-xxx: #dark-value;
}
```

然后在 `tailwind.config.cjs` 中注册：

```js
colors: {
  app: {
    xxx: "var(--color-xxx)",
  }
}
```

---

## 12. 编辑器（ProseMirror/Tiptap）样式规范

编辑器使用专属 CSS 变量（`--pm-*`），不与应用色系混用：

| 变量 | 用途 |
|---|---|
| `--pm-text` | 正文颜色 |
| `--pm-heading` | 标题颜色 |
| `--pm-code-bg` | 行内代码背景 |
| `--pm-code-text` | 行内代码前景 |
| `--pm-pre-bg` | 代码块背景 |
| `--pm-blockquote-border` | 引用块左边框 |
| `--pm-placeholder` | 占位符文字 |
| `--pm-selection` | 选中高亮（带透明度） |
| `--pm-scrollbar` | 滚动条颜色 |

编辑器标题字号：

| 标签 | 字号 | 字重 | 行高 |
|---|---|---|---|
| h1 | 1.75rem | 700 | 1.3 |
| h2 | 1.375rem | 600 | 1.3 |
| h3 | 1.125rem | 600 | 1.4 |
| p | — | — | 1.7 |

---

## 13. 实用工具类

### 13.1 滚动条

```tsx
// 自定义细滚动条（6px，圆角）- 全局已定义
// 隐藏滚动条保留功能
className="no-scrollbar"       // 完全隐藏
className="hide-scrollbar"     // 隐藏 + 移动端触控优化
```

### 13.2 动画入场

```tsx
// Tailwind animate-in（tailwindcss-animate 插件）
className="animate-in fade-in zoom-in-95 duration-500"
className="animate-in fade-in duration-300"
```

### 13.3 cn 工具函数

```tsx
import { cn } from "@/lib/utils";

// 合并 Tailwind 类，解决冲突
className={cn("base-class", condition && "conditional-class", className)}
```

---

## 14. 开发规范 Checklist

新增组件时需确认以下事项：

- [ ] **颜色**：使用语义 Token（`app-*` / `tx-*` / `accent-*`），而非硬编码值
- [ ] **暗色模式**：无需额外处理，Token 自动适配；若使用硬编码色需同时提供 `dark:` 变体
- [ ] **过渡动画**：交互元素添加 `transition-colors`，复杂动效使用 Framer Motion
- [ ] **响应式**：考虑移动端（`md:hidden` / `hidden md:flex`），最小触控区域 36px
- [ ] **圆角一致性**：大容器用 `rounded-2xl`，按钮/输入框用 `rounded-xl` / `rounded-lg`
- [ ] **图标**：统一使用 Lucide，尺寸符合规范（16 / 20 / 40）
- [ ] **间距**：遵循 Tailwind 间距系统，不使用任意值（避免 `p-[13px]`）
