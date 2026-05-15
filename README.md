# Feed Hub

## 中文文档

### 简介



### 技术栈


### 项目结构


### 安装部署

> **默认管理员账号：`admin` / `admin123`**
>
> 首次登录后请立即在「设置 → 账号安全」中修改密码。

---

#### 方式一：Windows 本地安装（开发 / 体验）

**环境要求：** Node.js 20+、Git

```bash
# 1. 克隆项目
git clone https://github.com/cropflre/nowen-note.git
cd nowen-note

# 2. 安装所有依赖
npm run install:all

# 3. 启动后端（端口 3001）
npm run dev:backend

# 4. 新开一个终端，启动前端（端口 5173，自动代理 /api → 3001）
npm run dev:frontend
```

浏览器访问 `http://localhost:5173` 即可使用。

数据库文件位于 `backend/data/nowen-note.db`，备份此文件即可迁移数据。

---

#### 方式二：Docker 通用安装（推荐）

适用于任何安装了 Docker 的 Linux / macOS / Windows 设备。

**方法 A：docker-compose（推荐）**

```bash
# 1. 克隆项目
git clone https://github.com/cropflre/nowen-note.git
cd nowen-note

# 2. 一键构建并启动
docker-compose up -d
```

#### 通用注意事项

- **数据持久化**：务必将容器内的 `/app/data` 目录映射到宿主机，否则容器删除后数据丢失
- **数据备份**：支持两种方式 — 直接备份 `nowen-note.db` 文件，或通过 API `/api/backups` 在线创建/下载备份
- **自动备份**：服务启动后自动开启每 24 小时数据库备份，保留最近 10 个自动备份
- **端口冲突**：如 3001 端口被占用，可修改主机端口映射（如 `8080:3001`）
- **安全建议**：首次登录后请立即修改默认密码；如需外网访问，建议搭配反向代理（Nginx / Caddy）并启用 HTTPS
- **Ollama**：如需本地 AI 推理，请自行部署 Ollama 服务并配置 `OLLAMA_URL` 环境变量

### 核心功能

#### 认证系统
- JWT Token 认证（30 天有效期）
- 登录页面（带动画与默认账号提示）
- 修改用户名 / 密码（需验证当前密码）
- SHA256 → bcrypt 密码哈希自动升级
- 客户端模式支持服务器地址配置（Electron / Android / file:// 协议）

#### 动态路由脚本与依赖管理
- **标准 NPM 项目支持**：支持以标准 npm 项目结构开发路由脚本，可拥有自己的 `package.json` 和 `node_modules`。
- **依赖隔离与优化**：
  - **全局依赖**：通过侧边栏“NPM 包管理”安装，适用于简单的内联脚本，全系统共享。
  - **项目局部依赖**：在动态路由列表中点击“安装项目依赖”，根据项目 `package.json` 独立安装，适用于复杂项目。
- **存储优化 (pnpm)**：系统底层采用 **pnpm** 管理依赖。即使多个项目使用相同的依赖包，物理磁盘也**只占用一份空间**（通过内容寻址存储和硬链接实现），安装速度极快且节省磁盘。
- **GitHub 同步**：支持直接从 GitHub 仓库同步脚本代码，支持公开和私有仓库（需提供 Token）。
- **Zip 上传**：支持上传 `.zip` 格式的完整脚本项目。



#### AI 智能助手
- **多 AI 服务商支持**：

| 服务商 | 默认模型 | 说明 |
|--------|---------|------|
| 通义千问 | qwen-plus | 阿里云 DashScope |
| OpenAI | gpt-4o-mini | OpenAI 官方 |
| Google Gemini | gemini-2.0-flash | Google AI Studio |
| DeepSeek | deepseek-chat | DeepSeek 官方 |
| 豆包（火山引擎） | doubao-1.5-pro-32k | 字节跳动 |
| Ollama | qwen2.5:7b | 本地部署，无需 API Key |

- **卡片式 Provider 选择**：渐变色图标、配置状态指示、自动填充 URL 和模型
- **连接测试 & 模型列表拉取**：实时验证配置可用性

**API 分组：**


**安装与运行：**
```bash
# 安装依赖
pnpm install

# 运行
pnpm dev
```
