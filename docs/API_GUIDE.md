# FeedHub API 说明文档 - NPM 软件包管理模块

本文档详细描述了 FeedHub 系统的 NPM 软件包管理模块相关的后端 RESTful API 接口设计与规格。

---

## 接口基础信息

- **基础路径**：`/api/npm-packages`
- **请求格式**：`application/json`
- **响应格式**：`application/json`
- **鉴权机制**：部分敏感写操作需要携带 Bearer Token 头（`Authorization: Bearer <token>`）

---

## 接口列表说明

### 1. 获取已安装包列表

查询系统目前已登记并安装的全部 NPM 软件包以及当前的状态。

- **请求方法**：`GET`
- **请求路径**：`/`
- **请求参数**：无
- **成功响应** (200 OK)：
  ```json
  [
    {
      "id": 1,
      "name": "lodash",
      "version": "4.17.21",
      "status": "installed",
      "error": null,
      "createdAt": "2026-05-24 14:00:00",
      "updatedAt": "2026-05-24 14:00:05"
    },
    {
      "id": 2,
      "name": "invalid-package-name",
      "version": "9.9.9",
      "status": "error",
      "error": "Failed to resolve package...",
      "createdAt": "2026-05-24 14:10:00",
      "updatedAt": "2026-05-24 14:10:02"
    }
  ]
  ```

---

### 2. 安装/登记新软件包

向系统中添加一个新软件包，并在后台启动异步下载和安装任务。

- **请求方法**：`POST`
- **请求路径**：`/`
- **请求体**：
  ```json
  {
    "name": "axios",
    "version": "1.6.0" 
  }
  ```
  - `name` (string, 必填)：要安装的包名
  - `version` (string, 选填)：目标版本，缺省则默认为 `"latest"`
- **成功响应** (200 OK)：
  ```json
  {
    "success": true
  }
  ```
- **异常响应**：
  - `400 Bad Request`：包名为空或非法。
  - `500 Internal Server Error`：数据库写入或初始化任务失败。

---

### 3. 重试安装失败的软件包 [NEW]

对于在安装过程中发生错误（`status === 'error'`）的包，可以使用此接口重新触发后台的安装流程。

- **请求方法**：`POST`
- **请求路径**：`/:name/retry`
- **路径参数**：
  - `name` (string, 必填)：需要重试的 NPM 软件包名称（需进行 URL 编码）
- **成功响应** (200 OK)：
  ```json
  {
    "success": true
  }
  ```
- **异常响应**：
  - `500 Internal Server Error`：指定的软件包未找到，或更新状态为 `pending` 时数据库操作失败。

---

### 4. 卸载软件包

从数据库和底层 Node 环境中移除并清理指定的 NPM 软件包。

- **请求方法**：`DELETE`
- **请求路径**：`/:name`
- **路径参数**：
  - `name` (string, 必填)：要卸载的包名（需进行 URL 编码）
- **成功响应** (200 OK)：
  ```json
  {
    "success": true
  }
  ```

---

### 5. 触发/同步全部挂起任务

手动强制触发后台对所有处于 `pending` 或 `error` 状态的包进行重新遍历与安装。

- **请求方法**：`POST`
- **请求路径**：`/refresh`
- **成功响应** (200 OK)：
  ```json
  {
    "success": true
  }
  ```

---

### 6. 搜索 NPM 注册表软件包

实时从 NPM 官方注册表（registry.npmjs.org）模糊检索符合关键词的包。

- **请求方法**：`GET`
- **请求路径**：`/search`
- **查询参数**：
  - `q` (string, 必填)：搜索关键字
- **成功响应** (200 OK)：
  ```json
  [
    {
      "name": "lodash",
      "version": "4.17.21",
      "description": "Lodash modular utilities."
    }
  ]
  ```

---

### 7. 查询包所有可用版本

从 NPM 注册表拉取一个软件包对应的所有发布版本列表。

- **请求方法**：`GET`
- **请求路径**：`/versions/:name`
- **路径参数**：
  - `name` (string, 必填)：软件包名称（需进行 URL 编码）
- **成功响应** (200 OK)：
  ```json
  [
    "4.17.21",
    "4.17.20",
    "4.17.19"
  ]
  ```

---

## 通知推送配置模块 [NEW]

### 8. 获取通知推送设置

获取当前的推送渠道（Bark、飞书）以及事件订阅状态。

- **请求方法**：`GET`
- **请求路径**：`/api/feed-settings`
- **请求参数**：无
- **成功响应** (200 OK)：
  ```json
  {
    "feed_user_agent": "Mozilla/5.0...",
    "feed_cache_ttl": "3600",
    "feed_proxy_enabled": "false",
    "feed_bark_enabled": "false",
    "feed_bark_url": "",
    "feed_feishu_enabled": "false",
    "feed_feishu_webhook": "",
    "feed_notify_website_failure": "false",
    "feed_notify_dynamic_failure": "false",
    "feed_notify_npm_failure": "false"
  }
  ```

---

### 9. 修改通知推送设置

更新当前的推送配置。

- **请求方法**：`PUT`
- **请求路径**：`/api/feed-settings`
- **请求体**：
  ```json
  {
    "feed_bark_enabled": "true",
    "feed_bark_url": "https://api.day.app/yourkey",
    "feed_notify_website_failure": "true"
  }
  ```
- **成功响应** (200 OK)：
  返回更新后的全部配置对象。

---

### 10. 测试消息通道推送

向选定通道发送连通性测试消息。

- **请求方法**：`POST`
- **请求路径**：`/api/feed-settings/test-push`
- **请求体**：
  ```json
  {
    "type": "bark",
    "payload": {
      "feed_bark_url": "https://api.day.app/yourkey"
    }
  }
  ```
- **成功响应** (200 OK)：
  ```json
  {
    "success": true
  }
  ```

---

## 动态路由输出模块 [NEW]

### 11. 获取动态订阅 Feed

根据动态路由路径和参数获取 RSS 或 JSON 格式的订阅源。

- **请求方法**：`GET`
- **请求路径**：`/api/dynamic/sub/*`
- **路径参数**：包含由动态路由定义的各种路径级参数（例如，对于 `/issue/:user/:repo`，其请求路径可能为 `/api/dynamic/sub/issue/microsoft/vscode`）
- **查询参数**：
  - `type` (string, 选填)：返回的格式类型，支持 `"rss"` (默认值) 或 `"json"`
- **注意事项**：
  - 系统会对路径进行标准化，支持忽略末尾的斜杠 `/`（例如 `/api/dynamic/sub/issue/microsoft/vscode/` 也能正常匹配）。
  - 若路径参数中依然包含未替换的冒号开头的占位符参数（如 `:user` 或 `:repo`），接口将拦截并返回 `400 Bad Request` 错误。
- **参数未替换异常响应** (400 Bad Request)：
  ```json
  {
    "error": "请将路由路径中的参数占位符（如 :user, :repo）替换为实际的值后再进行访问。"
  }
  ```
- **路径未找到响应** (404 Not Found)：
  ```json
  {
    "error": "路由不存在"
  }
  ```
- **成功响应** (200 OK)：
  - 当 `type=rss` 时，返回 XML 格式内容，`Content-Type: application/rss+xml; charset=utf-8`
  - 当 `type=json` 时，返回 JSON 格式内容，`Content-Type: application/feed+json; charset=utf-8`
