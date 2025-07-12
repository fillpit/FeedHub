# FeedHub

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)
[![GitHub Stars](https://img.shields.io/github/stars/fillpit/FeedHub.svg?style=flat&logo=github)](https://github.com/fillpit/FeedHub)
![Docker](https://img.shields.io/docker/pulls/fillpit/feedhub.svg)

## 项目介绍

FeedHub 是一个功能强大的 RSS 订阅管理系统，专注于解决网站内容抓取和 RSS 生成的问题。它支持多种抓取方式，包括选择器模式和脚本模式，能够处理各种复杂的网站结构和 API 接口，将内容转换为标准的 RSS 格式，方便用户在任何 RSS 阅读器中订阅和阅读。

## 功能特性

### 核心功能

- 📰 **网站RSS订阅**
  - 支持选择器抓取（CSS/XPath）
  - 支持JavaScript脚本抓取（自定义抓取逻辑）
  - 支持多种授权方式（Cookie、Basic Auth、Bearer Token、自定义请求头）
  - 自动生成RSS Feed
  - 支持封面图片显示

### 技术特点

- 🔐 **多种授权方式**: 支持Cookie、Basic Auth、Bearer Token、自定义请求头等多种授权方式
- 🎯 **双模式抓取**: 支持选择器模式和脚本模式两种抓取方式
- 📝 **脚本抓取**: 支持自定义JavaScript脚本处理复杂抓取逻辑
- 🌐 **API接口支持**: 支持从REST API、GraphQL等接口获取数据
- 🔄 **自动刷新**: 支持定时自动刷新RSS源
- 📱 **响应式设计**: 支持PC和移动端访问
- 🐳 **Docker部署**: 提供完整的Docker部署方案
- 🔧 **配置管理**: 支持全局设置和用户个性化设置

### 模板系统

- 📋 **模板管理**: 创建、编辑、删除和查看RSS抓取模板
- 🔍 **参数化配置**: 支持动态参数、参数验证、默认值和参数描述
- 🚀 **一键生成**: 通过模板和参数快速生成RSS配置

## 技术栈

### 前端

- **核心框架**
  - Vue 3
  - TypeScript
  - Vite
- **状态管理**
  - Pinia
- **路由管理**
  - Vue Router
- **UI 组件库**
  - Element Plus (PC)
  - Vant (Mobile)
- **工具库**
  - Axios
  - Socket.io-client
  - GSAP
  - TypeIt

### 后端

- **运行环境**
  - Node.js
  - Express
- **数据存储**
  - SQLite3
  - Sequelize ORM
- **工具库**
  - Axios
  - Cheerio
  - RSS
  - RSS-Parser
  - JsonWebToken
  - Winston
  - XPath
  - XMLDom

## 环境要求

- Node.js >= 18.x
- pnpm >= 8.x (推荐)

## 快速开始

### 开发环境

1. 克隆项目

```bash
git clone https://github.com/fillpit/FeedHub.git
cd FeedHub
```

2. 安装依赖

```bash
pnpm install
```

3. 配置环境变量

```bash
cp ./backend/.env.example ./backend/.env
```

根据 `.env.example` 文件说明配置必要的环境变量。

4. 启动开发服务器

```bash
pnpm dev
```

### 生产环境部署

#### 方法一：直接部署

1. 构建前端

```bash
pnpm build:frontend
```

2. 构建后端

```bash
cd backend
pnpm build
```

3. 启动服务

```bash
pnpm start
```

#### 方法二：Docker 部署（推荐）

1. 使用构建脚本

```bash
# 构建镜像
./build-docker.sh

# 运行容器
docker run -d -p 8008:8008 --name feed-hub cloud-saver:latest
```

2. 使用 Docker Compose

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 使用指南

### 网站RSS订阅

#### 选择器模式

1. 在系统中添加新的RSS配置
2. 输入网站URL和标题
3. 选择抓取模式为"选择器模式"
4. 配置CSS或XPath选择器
5. 保存配置

#### 脚本模式

对于复杂的网站或需要特殊处理的场景，系统支持自定义JavaScript脚本抓取：

- **网页抓取**: 使用cheerio解析HTML，支持复杂的选择器和数据处理
- **API接口抓取**: 支持REST API、GraphQL等接口数据获取
- **多源数据合并**: 可以从多个API源获取数据并合并处理
- **数据清洗转换**: 提供丰富的数据处理工具函数
- **错误处理**: 内置重试机制和容错处理

脚本环境提供以下工具：
- `$`: cheerio对象（网页抓取时可用）
- `axios`: HTTP请求客户端
- `utils.fetchApi()`: 安全的API请求函数
- `utils.parseJson()`: JSON解析工具
- `utils.parseDate()`: 日期解析工具
- `utils.formatDate()`: 日期格式化工具
- `utils.safeGet()`: 安全访问嵌套属性
- `utils.safeArray()`: 确保得到数组
- `utils.safeObject()`: 确保得到对象
- `utils.validateItem()`: 验证数据项
- `console`: 日志输出

详细示例请参考 [SCRIPT_EXAMPLES.md](./SCRIPT_EXAMPLES.md)

### 模板系统

系统支持模板配置，让你可以快速创建多个相似平台的RSS订阅，而无需重复编写相同的抓取逻辑。

#### 支持的平台

- B站UP主视频更新
- 抖音博主视频更新
- YouTube频道视频更新
- 更多平台持续添加中...

详细使用方法请参考 [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md) 和 [TEMPLATE_SYSTEM_GUIDE.md](./TEMPLATE_SYSTEM_GUIDE.md)

## 特别声明

1. 本项目仅供学习交流使用，请勿用于非法用途
2. 仅支持个人使用，不支持任何形式的商业使用
3. 禁止在项目页面进行任何形式的广告宣传
4. 所有搜索到的资源均来自第三方，本项目不对其真实性、合法性做出任何保证

## 开源协议

本项目基于 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解更多细节
