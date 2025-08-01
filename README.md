# FeedHub

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)
[![GitHub Stars](https://img.shields.io/github/stars/fillpit/FeedHub.svg?style=flat&logo=github)](https://github.com/fillpit/FeedHub)
![Docker](https://img.shields.io/docker/pulls/fillpit/feedhub.svg)

## 项目介绍

FeedHub 是一个现代化的 RSS 订阅管理平台，支持多种内容抓取方式和智能通知推送。它不仅提供传统的RSS订阅功能，还集成了动态路由系统、授权凭证管理、多平台通知、npm包管理等强大功能，为用户提供一站式的内容聚合和分发解决方案。

## 界面截图

![FeedHub 界面](https://raw.githubusercontent.com/fillpit/FeedHub/main/docs/img/img_1.png)

## 功能特性

### 🔗 RSS 订阅管理
- **智能抓取模式**: 支持选择器模式和脚本模式两种内容抓取方式
- **多格式输出**: 支持 RSS、JSON 格式的订阅源输出
- **实时调试**: 提供选择器和脚本的在线调试功能
- **批量管理**: 支持配置的批量导入导出和分享
- **状态监控**: 实时监控订阅源的抓取状态和错误信息

### 🛣️ 动态路由系统
- **自定义API**: 通过内联脚本创建个性化的数据接口
- **参数处理**: 支持 URL 参数和查询参数的灵活处理
- **脚本环境**: 内置 cheerio、axios 等常用库，提供丰富的工具函数
- **授权集成**: 支持与授权凭证系统的无缝集成
- **调试支持**: 提供完整的脚本调试和日志输出功能
- **内联编辑**: 支持在线编辑内联脚本，提供语法高亮和代码提示
- **脚本编辑入口**: 在调试页面直接提供脚本编辑入口，便于快速修改和测试
- **多格式链接**: 路径列支持悬浮选择复制RSS或JSON格式链接

### 🔐 授权凭证管理
- **多种认证方式**: 支持 Bearer Token、Basic Auth、Cookie、自定义请求头
- **统一管理**: 集中管理所有授权信息，避免重复配置
- **安全存储**: 敏感信息加密存储，确保数据安全
- **灵活应用**: 可在 RSS 订阅和动态路由中灵活使用

### 📱 智能通知系统
- **多平台支持**: 支持 Bark、邮件、Gotify、企业微信、钉钉、飞书等通知方式
- **触发条件**: 可配置新内容、更新错误、系统警告等多种触发条件
- **个性化设置**: 每种通知方式都支持详细的个性化配置
- **测试功能**: 提供通知测试功能，确保配置正确

### 📦 包管理系统
- **npm 包管理**: 支持在线安装、卸载、搜索 npm 包
- **依赖统计**: 显示包的详细信息和依赖关系
- **配置导入导出**: 支持包配置的备份和恢复
- **脚本增强**: 为动态路由脚本提供更多功能库支持

### 🔧 系统管理
- **用户管理**: 支持多用户注册、登录和权限控制
- **全局设置**: HTTP 代理、系统参数等全局配置
- **数据备份**: 完整的数据备份和恢复功能
- **配置分享**: 支持配置的导出分享（排除敏感信息）

### 技术特点

- 🚀 **现代化架构**: 前后端分离，TypeScript 全栈开发
- 🐳 **容器化部署**: 支持 Docker 一键部署
- 📦 **模块化设计**: 清晰的项目结构，易于维护和扩展
- 🔧 **灵活配置**: 丰富的配置选项，满足不同需求
- 🛡️ **安全可靠**: JWT 认证，数据加密存储
- 🏗️ **模块化架构**: 采用共享模块设计，前后端类型定义统一管理
- 🔧 **代码质量**: 完善的ESLint和Prettier配置，确保代码质量和一致性



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

3. 启动开发服务器

```bash
pnpm dev
```

### 生产环境部署

#### Docker 部署（推荐）

使用 Docker Compose

```bash
# 下载 docker-compose.yml 文件
wget https://raw.githubusercontent.com/fillpit/FeedHub/refs/heads/main/docker-compose.yml

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 环境变量配置

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| NODE_ENV | 运行环境 | production |
| PORT | 服务端口 | 8009 |
| JWT_SECRET | JWT 密钥 | 随机生成 |
| BASIC_AUTH_USERNAME | Basic Auth 用户名 | admin |
| BASIC_AUTH_PASSWORD | Basic Auth 密码 | admin@123 |
| API_BASE_URL | API 基础 URL | http://localhost:8008 |
| SCRIPTS_DIR | 脚本存放目录 | 项目根目录/scripts |
| CUSTOM_PACKAGES_DIR | 自定义包存放目录 | 项目根目录/custom_packages |

**SCRIPTS_DIR 说明**：
- 可以设置为绝对路径：`/path/to/custom/scripts`
- 可以设置为相对路径：`custom-scripts`（相对于项目根目录）
- 如果不设置，默认使用项目根目录下的 `scripts` 目录
- 该目录用于存放动态路由的内联脚本文件

**CUSTOM_PACKAGES_DIR 说明**：
- 可以设置为绝对路径：`/path/to/custom/packages`
- 可以设置为相对路径：`custom-packages`（相对于项目根目录）
- 如果不设置，默认使用项目根目录下的 `custom_packages` 目录
- 该目录用于存放通过包管理功能安装的npm包

## 特别声明

本项目仅供学习和研究使用，请遵守相关网站的robots.txt协议和使用条款。在使用本项目时，请确保：

### 📋 使用规范
1. **遵守协议**: 遵守目标网站的使用条款和robots.txt协议
2. **合理频率**: 合理控制抓取频率，避免对目标网站造成过大负担
3. **尊重版权**: 尊重网站的版权和知识产权
4. **合法使用**: 不要用于商业用途或其他违法行为
5. **数据安全**: 妥善保管授权凭证和敏感信息

### 🔒 安全建议
1. **定期备份**: 建议定期备份系统数据和配置
2. **更新维护**: 及时更新系统和依赖包，确保安全性
3. **访问控制**: 在生产环境中设置适当的访问控制和防火墙规则
4. **监控日志**: 定期检查系统日志，及时发现异常情况

### ⚠️ 免责声明
使用本项目所产生的任何法律责任由使用者自行承担。项目开发者不对因使用本项目而导致的任何直接或间接损失承担责任。

## 开源协议

本项目基于 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解更多细节
