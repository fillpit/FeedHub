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
- **统一订阅接口**: 新增统一订阅路由 `/website/sub/:key`，通过 `type` 参数控制输出格式（rss/json），简化订阅管理
- **智能订阅链接**: 网页监控页面提供统一的订阅链接，支持鼠标悬停选择复制RSS或JSON格式链接，提升用户体验
- **实时调试**: 提供选择器和脚本的在线调试功能，调试接口现已支持渲染模式配置
- **渲染模式支持**: 支持静态模式和浏览器渲染模式，调试功能与实际抓取逻辑保持一致
- **批量管理**: 支持配置的批量导入导出和分享
- **状态监控**: 实时监控订阅源的抓取状态和错误信息

### 📚 图书RSS订阅
- **多源支持**: 支持手动上传和OPDS服务两种书籍来源
- **书籍上传**: 支持epub、txt、pdf、mobi、azw、azw3等多种电子书格式上传
- **智能解析**: 完整支持EPUB和PDF格式解析，其他格式支持基础上传
- **EPUB解析**: 自动解析EPUB文件结构，提取章节内容（保留HTML标签），支持元数据获取
- **OPDS集成**: 支持从OPDS服务添加书籍，自动下载并解析EPUB文件
  - 自动下载EPUB文件到临时目录
  - 解析EPUB文件结构（container.xml、OPF文件）
  - 提取书籍元数据（标题、作者、语言、描述等）
  - 自动创建真实章节记录，替换默认章节
  - 支持章节内容提取和字数统计
- **PDF解析**: 智能提取PDF文本内容，自动识别章节结构，支持多种章节分割模式
- **章节订阅**: 可订阅图书的最新章节更新
- **RSS输出**: 生成标准RSS格式的章节更新订阅
- **便捷操作**: 拖拽上传、进度提示、自动选择等用户友好功能

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
- **导出增强**: 网页内容监控导出时保留 key 和 renderMode 字段

### 技术特点

- 🚀 **现代化架构**: 前后端分离，TypeScript 全栈开发
- 🐳 **容器化部署**: 支持 Docker 一键部署
- 📦 **模块化设计**: 清晰的项目结构，易于维护和扩展
- 🔧 **灵活配置**: 丰富的配置选项，满足不同需求
- 🛡️ **安全可靠**: JWT 认证，数据加密存储
- 🏗️ **模块化架构**: 采用共享模块设计，前后端类型定义统一管理
- 🔧 **代码质量**: 完善的ESLint和Prettier配置，确保代码质量和一致性
- ♻️ **代码复用**: 遵循DRY原则，提取公共方法消除重复代码，提升维护性



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

#### 标准部署（单容器）
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

#### 微服务架构部署（推荐）

**新功能**: 支持网页渲染模式，可抓取JavaScript动态生成的内容！

**方式1: 使用 ghcr.io/browserless/chromium（推荐）**
```bash
# 下载微服务配置文件
wget https://raw.githubusercontent.com/fillpit/FeedHub/refs/heads/main/docker-compose.browserless.yml

# 启动微服务架构
docker-compose -f docker-compose.browserless.yml up -d
```

**Token认证配置（可选）：**
在 `docker-compose.browserless.yml` 中将 `your_browserless_token_here` 替换为您的实际token，提供更好的安全性。

**方式2: 使用一键部署脚本**
```bash
# 下载并运行部署脚本
wget https://raw.githubusercontent.com/fillpit/FeedHub/refs/heads/main/deploy-with-chrome-service.sh
chmod +x deploy-with-chrome-service.sh
./deploy-with-chrome-service.sh
```

**微服务架构优势**:
- 🚀 主应用容器更轻量（无需安装Chrome）
- 🔄 支持JavaScript渲染的SPA应用抓取
- 📈 更好的资源隔离和扩展性
- 🛠️ Chrome服务可独立维护和更新

详细说明请参考：[Docker渲染模式部署文档](DOCKER_RENDER_MODE.md)

#### 环境变量配置

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| NODE_ENV | 运行环境 | production |
| PORT | 服务端口 | 8009 |
| JWT_SECRET | JWT 密钥 | 随机生成 |
| BASIC_AUTH_USERNAME | Basic Auth 用户名 | admin |
| BASIC_AUTH_PASSWORD | Basic Auth 密码 | admin@123 |
| API_BASE_URL | API 基础 URL | http://localhost:8008 |
| TZ | 时区设置 | Asia/Shanghai |
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

**TZ 时区配置说明**：
- 用于设置容器的时区，影响日志时间、文件时间戳等
- 支持标准时区格式，如：`Asia/Shanghai`、`America/New_York`、`Europe/London`
- 容器启动时会自动根据此环境变量同步系统时区
- 如果不设置，默认使用 `Asia/Shanghai` 时区
- 常用时区示例：
  - 中国：`Asia/Shanghai`
  - 美国东部：`America/New_York`
  - 美国西部：`America/Los_Angeles`
  - 英国：`Europe/London`
  - 日本：`Asia/Tokyo`
  - UTC：`UTC`

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

## 待办清单

### 已完成功能
- [x] 图书RSS订阅基础功能
- [x] 在手动上传模式下添加书籍上传功能
- [x] 添加"上传新书籍"按钮和文件上传组件
- [x] 支持常见电子书格式（epub、txt、pdf、mobi、azw、azw3等）
- [x] 上传成功后自动刷新书籍列表并选中新书籍
- [x] 当书籍列表为空时显示引导提示
- [x] 添加拖拽上传支持
- [x] 显示支持的文件格式说明
- [x] 提供上传进度提示
- [x] 文件大小限制（100MB以内）
- [x] 修复EPUB等格式文件上传问题
- [x] 修复中文文件名乱码问题
- [x] 优化文件处理逻辑
- [x] 改进错误处理机制

### 当前开发任务

#### EPUB章节内容解析实现 (已完成)
- [x] 创建EPUB解析工具类，处理EPUB文件结构
- [x] 实现EPUB文件解压和目录结构解析
- [x] 解析META-INF/container.xml获取OPF文件路径
- [x] 解析OPF文件获取章节列表和阅读顺序
- [x] 提取HTML章节文件内容（保留HTML标签）
- [x] 更新parseEpubFile方法，替换占位实现
- [x] 添加错误处理和临时文件清理
- [x] 安装必要依赖包（adm-zip, xml2js, cheerio）
- [x] 测试验证EPUB解析功能

#### 章节解析异步化改造 (已完成)
- [x] 修改BookService.uploadBook方法，移除章节解析逻辑
- [x] 在BookRssService中添加异步解析功能
- [x] 为BookRssConfig模型添加解析状态字段
- [x] 在addConfig和updateConfig方法中触发章节解析
- [x] 创建parseBookChaptersAsync异步解析方法
- [x] 添加解析状态跟踪和错误处理
- [ ] 前端界面显示解析状态和重试功能
- [ ] 测试验证异步解析功能

#### 图书RSS更新间隔单位优化 (已完成)
- [x] 数据库迁移：添加迁移逻辑将现有数据从分钟转换为天
- [x] 后端模型更新：修改BookRssConfig模型注释和默认值
- [x] 后端服务更新：RSS生成时进行单位转换（天转分钟用于TTL）
- [x] 前端界面更新：修改表单显示和验证规则（分钟改为天）
- [x] 类型定义更新：更新共享类型注释

#### 图书RSS增量更新功能 ✅
- [x] 数据库模型优化：添加lastFeedTime字段记录RSS生成时间
- [x] 数据库迁移：为现有配置添加新字段
- [x] 后端服务更新：修改fetchChaptersForConfig方法实现增量逻辑
- [x] 时间窗口计算：根据updateInterval和lastFeedTime计算章节过滤范围
- [x] 智能回退机制：无新章节时返回最近章节避免空RSS
- [x] 前端界面调整：添加强制全量更新和最小返回章节数配置
- [x] 测试验证：确保增量更新和全量更新功能正常工作
- [x] 测试验证：确保现有数据平滑迁移和功能正常

#### 图书RSS表单界面优化 ✅
- [x] 布局优化：采用卡片式设计，提升视觉层次
- [x] 分组重新设计：基础信息、书籍配置、订阅设置、高级选项
- [x] 交互体验优化：现代化表单控件、智能提示、友好验证
- [x] 视觉设计提升：现代化图标、渐变配色、悬浮动画、状态指示
- [x] 表单结构优化：网格布局、标签优化、字段分组
- [x] 响应式布局：优化在不同屏幕尺寸下的显示效果
- [x] 测试验证：确保优化后功能正常且用户体验提升

#### OPDS章节问题修复 ✅
- [x] 问题诊断：OPDS书籍添加后没有章节信息
- [x] 根因分析：parseBookChaptersAsync方法对OPDS书籍处理逻辑错误
- [x] 修复实现：为OPDS书籍添加特殊处理逻辑，跳过文件解析
- [x] 逻辑优化：OPDS书籍在创建时已有默认章节，直接标记解析完成
- [x] 测试验证：确保OPDS书籍能正确显示章节信息

#### OPDS书籍完整内容解析实现 ✅
- [x] 问题分析：当前OPDS书籍只创建描述性章节，未解析真实内容
- [x] 下载功能：实现从sourceUrl下载epub文件到临时目录
- [x] 解析集成：在addBookFromOpds方法中集成EpubParser解析功能
- [x] 章节创建：将解析出的真实章节保存到数据库
- [x] 元数据更新：正确设置totalChapters等书籍信息
- [x] 错误处理：添加下载失败和解析失败的降级处理
- [x] 临时文件清理：确保下载的临时文件被正确清理
- [x] 测试验证：验证OPDS书籍能显示完整的真实章节内容

#### Monaco Editor本地化加载 ✅
- [x] 移除CodeEditor.vue中的loader.config()配置（第40-45行）
- [x] 修改initEditor函数，直接使用monaco而不是loader.init()
- [x] 移除@monaco-editor/loader依赖的导入
- [x] 测试Monaco Editor本地加载功能是否正常

#### 动态路由RSS链接复制优化 ✅
- [x] 修改copyDynamicLink方法，检测必填参数并替换路径占位符
- [x] 优化复制成功提示信息，明确告知用户需要替换的参数
- [x] 测试动态路由RSS链接复制功能，验证必填参数处理

#### 其他任务
- [ ] 添加更多电子书格式支持（完整解析）
- [ ] 实现书籍章节的智能分割
- [ ] 优化RSS生成性能
- [ ] 添加书籍封面显示功能

## 开源协议

本项目基于 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解更多细节
