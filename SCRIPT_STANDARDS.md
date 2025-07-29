# 脚本规范标准

本文档定义了FeedHub动态路由脚本的标准规范，包括脚本结构、入口方法、参数格式和返回值要求。

## 1. 脚本包结构规范

### 1.1 必需文件

```
script-package.zip
├── package.json      # 必需：包描述文件
├── main.js          # 必需：主入口文件（由package.json的main字段指定）
├── utils/           # 可选：工具模块目录
├── config/          # 可选：配置文件目录
└── README.md        # 推荐：说明文档
```

### 1.2 package.json规范

```json
{
  "name": "my-script-package",
  "version": "1.0.0",
  "description": "脚本包描述",
  "main": "main.js",
  "author": "作者名称",
  "license": "MIT",
  "keywords": ["feedhub", "rss", "script"]
}
```

**必需字段：**
- `name`: 包名称
- `version`: 版本号
- `main`: 入口文件路径
- `description`: 包描述

## 2. 入口方法规范

### 2.1 标准入口函数

所有脚本包的入口文件必须导出一个名为 `main` 的异步函数：

```javascript
// main.js
async function main(context) {
  // 脚本逻辑
  return result;
}

module.exports = { main };
```

### 2.2 上下文参数 (context)

`main` 函数接收一个 `context` 对象，包含以下属性：

```javascript
const context = {
  // 路由参数
  routeParams: {
    // 用户传入的查询参数
    param1: 'value1',
    param2: 'value2'
  },
  
  // HTTP工具
  utils: {
    fetchApi: async (url, options) => { /* HTTP请求 */ },
    parseHtml: (html) => { /* HTML解析 */ },
    formatDate: (date, format) => { /* 日期格式化 */ }
  },
  
  // 认证信息
  auth: {
    token: 'user_token',
    credentials: { /* 用户凭据 */ }
  },
  
  // 日志工具
  console: {
    log: (message) => { /* 日志记录 */ },
    error: (message) => { /* 错误日志 */ },
    warn: (message) => { /* 警告日志 */ }
  },
  
  // 辅助工具
  helpers: {
    generateGuid: () => { /* 生成GUID */ },
    safeGet: (obj, path, defaultValue) => { /* 安全获取属性 */ }
  },
  
  // 时间工具
  dayjs: dayjs, // dayjs实例
  
  // 包管理（如果启用）
  require: (packageName) => { /* 加载npm包 */ }
};
```

### 2.3 返回值规范

`main` 函数必须返回符合以下格式的对象：

#### 2.3.1 完整RSS格式（推荐）

```javascript
return {
  // RSS频道信息
  title: "RSS标题",
  description: "RSS描述",
  feed_url: "https://example.com/rss.xml",
  site_url: "https://example.com",
  generator: "FeedHub CustomRoute",
  pubDate: "2024-01-01T00:00:00Z",
  language: "zh-CN",
  copyright: "版权信息",
  managingEditor: "编辑邮箱",
  webMaster: "网站管理员邮箱",
  ttl: 60, // 缓存时间（分钟）
  image: {
    url: "https://example.com/logo.png",
    title: "网站Logo",
    link: "https://example.com"
  },
  
  // 文章列表
  items: [
    {
      title: "文章标题",
      link: "https://example.com/article1",
      guid: "unique-id-1",
      content: "文章内容HTML",
      contentSnippet: "文章摘要",
      author: "作者",
      pubDate: "2024-01-01T00:00:00Z",
      image: "https://example.com/image1.jpg"
    }
  ]
};
```

#### 2.3.2 简化格式（向后兼容）

```javascript
// 直接返回文章数组
return [
  {
    title: "文章标题",
    link: "https://example.com/article1",
    content: "文章内容",
    author: "作者",
    pubDate: "2024-01-01T00:00:00Z",
    image: "https://example.com/image1.jpg"
  }
];
```

## 3. 模块化开发规范

### 3.1 模块导入导出

```javascript
// utils/parser.js
function parseData(data) {
  // 解析逻辑
  return parsedData;
}

module.exports = { parseData };
```

```javascript
// main.js
const { parseData } = require('./utils/parser');
const { formatItems } = require('./utils/formatter');

async function main(context) {
  const { routeParams, utils } = context;
  
  // 获取数据
  const response = await utils.fetchApi('https://api.example.com/data');
  
  // 解析数据
  const parsedData = parseData(response.data);
  
  // 格式化输出
  const items = formatItems(parsedData);
  
  return {
    title: "示例RSS",
    description: "示例描述",
    items: items
  };
}

module.exports = { main };
```

### 3.2 配置文件规范

```javascript
// config/constants.js
module.exports = {
  API_BASE_URL: 'https://api.example.com',
  DEFAULT_LIMIT: 20,
  TIMEOUT: 30000,
  USER_AGENT: 'FeedHub/1.0'
};
```

## 4. 错误处理规范

### 4.1 错误捕获

```javascript
async function main(context) {
  try {
    // 脚本逻辑
    const result = await fetchAndProcessData(context);
    return result;
  } catch (error) {
    context.console.error('脚本执行失败:', error.message);
    
    // 返回空结果而不是抛出错误
    return {
      title: "错误",
      description: "数据获取失败",
      items: []
    };
  }
}
```

### 4.2 参数验证

```javascript
async function main(context) {
  const { routeParams } = context;
  
  // 验证必需参数
  if (!routeParams.source) {
    throw new Error('缺少必需参数: source');
  }
  
  // 验证参数值
  const validSources = ['news', 'blog', 'forum'];
  if (!validSources.includes(routeParams.source)) {
    throw new Error(`无效的source参数: ${routeParams.source}`);
  }
  
  // 继续执行
}
```

## 5. 性能优化规范

### 5.1 缓存策略

```javascript
async function main(context) {
  const { routeParams, utils } = context;
  
  // 构建缓存键
  const cacheKey = `data_${routeParams.source}_${routeParams.page || 1}`;
  
  // 尝试从缓存获取
  let data = await utils.getCache(cacheKey);
  
  if (!data) {
    // 缓存未命中，获取新数据
    data = await fetchDataFromAPI(context);
    
    // 设置缓存（5分钟）
    await utils.setCache(cacheKey, data, 5);
  }
  
  return processData(data);
}
```

### 5.2 并发控制

```javascript
async function main(context) {
  const { routeParams } = context;
  const sources = routeParams.sources?.split(',') || ['default'];
  
  // 限制并发数量
  const maxConcurrent = 3;
  const results = [];
  
  for (let i = 0; i < sources.length; i += maxConcurrent) {
    const batch = sources.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(source => fetchSourceData(source, context))
    );
    results.push(...batchResults);
  }
  
  return {
    title: "聚合RSS",
    items: results.flat()
  };
}
```

## 6. 安全规范

### 6.1 输入验证

```javascript
function validateInput(input) {
  // 防止XSS
  if (typeof input === 'string') {
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  }
  return input;
}

async function main(context) {
  const { routeParams } = context;
  
  // 验证所有输入参数
  const safeParams = {};
  for (const [key, value] of Object.entries(routeParams)) {
    safeParams[key] = validateInput(value);
  }
  
  // 使用安全参数
  return processWithSafeParams(safeParams, context);
}
```

### 6.2 URL验证

```javascript
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function main(context) {
  const { routeParams, utils } = context;
  
  if (!isValidUrl(routeParams.url)) {
    throw new Error('无效的URL参数');
  }
  
  const response = await utils.fetchApi(routeParams.url);
  // 处理响应
}
```

## 7. 测试规范

### 7.1 单元测试示例

```javascript
// test/main.test.js
const { main } = require('../main');

// 模拟上下文
const mockContext = {
  routeParams: { source: 'test' },
  utils: {
    fetchApi: async (url) => ({ data: 'mock data' })
  },
  console: {
    log: console.log,
    error: console.error
  }
};

// 测试主函数
async function testMain() {
  try {
    const result = await main(mockContext);
    console.log('测试通过:', result);
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testMain();
```

## 8. 最佳实践

### 8.1 代码组织

- 保持入口文件简洁，主要逻辑放在独立模块中
- 使用有意义的文件和函数命名
- 添加必要的注释说明
- 遵循一致的代码风格

### 8.2 错误处理

- 总是捕获和处理异常
- 提供有意义的错误信息
- 在出错时返回空结果而不是崩溃
- 记录详细的错误日志

### 8.3 性能考虑

- 合理使用缓存减少重复请求
- 控制并发请求数量
- 设置合理的超时时间
- 避免内存泄漏

### 8.4 可维护性

- 模块化设计，职责分离
- 配置与代码分离
- 提供完整的文档说明
- 版本化管理

这些规范确保了脚本包的一致性、可靠性和可维护性，为开发者提供了清晰的开发指南。