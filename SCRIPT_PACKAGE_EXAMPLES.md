# 脚本包示例

本文档提供了动态路由脚本包的使用示例和最佳实践。

## 脚本包结构

脚本包是一个包含多个JavaScript文件的ZIP压缩包，支持模块化开发和代码复用。

### 基本结构

```
script-package.zip
├── index.js          # 主入口文件（必需）
├── utils/
│   ├── parser.js     # 解析工具
│   └── formatter.js  # 格式化工具
├── config/
│   └── constants.js  # 常量配置
└── package.json      # 可选，描述包信息
```

## 示例1：新闻聚合脚本包

### index.js（主入口文件）
```javascript
const { parseNewsData } = require('./utils/parser');
const { formatNewsItems } = require('./utils/formatter');
const { NEWS_SOURCES, DEFAULT_LIMIT } = require('./config/constants');

// 标准入口函数
async function main(context) {
  const { routeParams, utils, console, dayjs } = context;
  
  // 获取路由参数
  const { source = 'default', limit = DEFAULT_LIMIT, category = 'all' } = routeParams;

  console.log(`开始获取${source}的${category}类新闻，限制${limit}条`);

  try {
    // 获取新闻源URL
    const apiUrl = NEWS_SOURCES[source];
    if (!apiUrl) {
      throw new Error(`不支持的新闻源: ${source}`);
    }

    // 发起HTTP请求
    const response = await utils.fetchApi(apiUrl, {
      headers: { 'User-Agent': 'FeedHub/1.0' },
      timeout: 10000
    });

    // 解析和格式化数据
    const rawData = response.data;
    const parsedData = parseNewsData(rawData, source);
    const formattedItems = formatNewsItems(parsedData, parseInt(limit));

    return {
      title: `${source}新闻聚合 - ${category}`,
      description: `来自${source}的${category}类最新新闻`,
      feed_url: `https://feedhub.example.com/rss/${source}/${category}`,
      site_url: NEWS_SOURCES[source],
      generator: 'FeedHub News Aggregator',
      pubDate: dayjs().toISOString(),
      language: 'zh-CN',
      items: formattedItems
    };
  } catch (error) {
    console.error('脚本执行失败:', error.message);
    return {
      title: `${source}新闻聚合 - 错误`,
      description: `获取${source}新闻时发生错误: ${error.message}`,
      items: []
    };
  }
}

// 导出main函数
module.exports = { main };
```

### utils/parser.js
```javascript
/**
 * 解析不同来源的新闻数据
 */
function parseNewsData(data, source) {
  switch (source) {
    case 'techcrunch':
      return parseTechCrunchData(data);
    case 'hackernews':
      return parseHackerNewsData(data);
    default:
      return parseDefaultData(data);
  }
}

function parseTechCrunchData(data) {
  return data.articles.map(article => ({
    title: article.title,
    link: article.url,
    description: article.description,
    pubDate: new Date(article.publishedAt),
    author: article.author
  }));
}

function parseHackerNewsData(data) {
  return data.hits.map(hit => ({
    title: hit.title,
    link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    description: hit.story_text || hit.comment_text || '',
    pubDate: new Date(hit.created_at),
    author: hit.author
  }));
}

function parseDefaultData(data) {
  // 通用解析逻辑
  return data.items || data.articles || data.posts || [];
}

module.exports = {
  parseNewsData
};
```

### utils/formatter.js
```javascript
/**
 * 格式化新闻条目
 */
function formatNewsItems(items, limit) {
  return items
    .slice(0, limit)
    .map(item => ({
      title: cleanTitle(item.title),
      link: item.link,
      description: cleanDescription(item.description),
      pubDate: item.pubDate,
      author: item.author || '未知作者',
      guid: item.link // 使用链接作为唯一标识
    }));
}

function cleanTitle(title) {
  if (!title) return '无标题';
  // 移除HTML标签和多余空格
  return title.replace(/<[^>]*>/g, '').trim();
}

function cleanDescription(description) {
  if (!description) return '';
  // 限制描述长度并清理HTML
  const cleaned = description.replace(/<[^>]*>/g, '').trim();
  return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
}

module.exports = {
  formatNewsItems
};
```

### config/constants.js
```javascript
/**
 * 新闻源配置
 */
const NEWS_SOURCES = {
  default: 'https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_API_KEY',
  techcrunch: 'https://newsapi.org/v2/everything?sources=techcrunch&apiKey=YOUR_API_KEY',
  hackernews: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20',
  reddit: 'https://www.reddit.com/r/programming/hot.json?limit=20'
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

module.exports = {
  NEWS_SOURCES,
  DEFAULT_LIMIT,
  MAX_LIMIT
};
```

## 示例2：电商价格监控脚本包

### index.js
```javascript
const { ProductMonitor } = require('./utils/monitor');
const { PriceFormatter } = require('./utils/formatter');
const { STORE_CONFIGS } = require('./config/stores');

const { store, category = 'all' } = routeParams;

if (!store || !STORE_CONFIGS[store]) {
  throw new Error(`不支持的商店: ${store}`);
}

const monitor = new ProductMonitor(STORE_CONFIGS[store]);
const products = await monitor.getProducts(category);

const formatter = new PriceFormatter();
const items = formatter.formatPriceItems(products);

return {
  title: `${store} 价格监控`,
  description: `${store} ${category} 分类的价格变动`,
  link: STORE_CONFIGS[store].baseUrl,
  items: items
};
```

### utils/monitor.js
```javascript
class ProductMonitor {
  constructor(storeConfig) {
    this.config = storeConfig;
  }

  async getProducts(category) {
    const url = this.buildApiUrl(category);
    const response = await utils.fetchApi(url);
    return this.parseProducts(response.data);
  }

  buildApiUrl(category) {
    const baseUrl = this.config.apiUrl;
    const params = new URLSearchParams({
      category: category,
      sort: 'price_desc',
      limit: 20
    });
    return `${baseUrl}?${params.toString()}`;
  }

  parseProducts(data) {
    return data.products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      url: product.url,
      image: product.image,
      lastUpdated: new Date()
    }));
  }
}

module.exports = {
  ProductMonitor
};
```

## 最佳实践

### 1. 文件组织
- 将相关功能分组到不同的目录
- 使用清晰的文件命名
- 保持模块职责单一

### 2. 错误处理
```javascript
// 在每个模块中添加适当的错误处理
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('操作失败:', error.message);
  throw new Error(`处理失败: ${error.message}`);
}
```

### 3. 配置管理
```javascript
// 将配置集中管理
const config = {
  timeout: 30000,
  retries: 3,
  userAgent: 'FeedHub/1.0'
};

module.exports = config;
```

### 4. 模块导出
```javascript
// 使用明确的导出
module.exports = {
  functionName,
  ClassName,
  CONSTANT_VALUE
};
```

### 5. 安全考虑
- 不要在脚本中硬编码敏感信息
- 使用 `utils.getAuthInfo()` 获取授权信息
- 验证输入参数
- 限制文件访问范围

## 调试技巧

### 1. 日志输出
```javascript
// 使用console.log进行调试
console.log('处理参数:', routeParams);
console.log('API响应:', response.data);
```

### 2. 错误信息
```javascript
// 提供详细的错误信息
if (!data.items) {
  throw new Error('API响应中缺少items字段');
}
```

### 3. 数据验证
```javascript
// 验证必需的参数
if (!routeParams.apiKey) {
  throw new Error('缺少必需的apiKey参数');
}
```

## 打包说明

1. 将所有文件放在一个文件夹中
2. 确保入口文件名正确（默认为index.js）
3. 压缩为ZIP格式
4. 上传到FeedHub动态路由配置
5. 指定正确的入口文件路径

## 注意事项

- 脚本包大小限制为10MB
- 支持相对路径的require
- 临时文件会在执行后自动清理
- 不支持npm包的动态安装
- 建议将常用工具函数封装为模块