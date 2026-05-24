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
