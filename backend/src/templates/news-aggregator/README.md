# 新闻聚合脚本包模板

这是一个FeedHub脚本包模板，用于从多个新闻源聚合新闻并生成统一的RSS Feed。

## 功能特性

- 🌐 **多源聚合**：支持从多个新闻API和RSS源获取数据
- 🏷️ **分类筛选**：支持按新闻分类过滤（科技、商业、娱乐等）
- 🌍 **多语言支持**：支持中文、英文等多种语言
- 🔄 **智能去重**：自动识别和去除重复新闻
- ⚡ **并发获取**：并行请求多个新闻源，提高效率
- 📊 **灵活排序**：支持按时间、热度、相关性排序

## 文件结构

```
news-aggregator/
├── index.js              # 主入口文件
├── package.json          # 包配置文件
├── README.md            # 说明文档
├── config/
│   └── sources.js       # 新闻源配置
└── utils/
    ├── fetcher.js       # 数据获取工具
    ├── formatter.js     # 数据格式化工具
    └── validator.js     # 参数验证工具
```

## 参数说明

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|---------|
| limit | number | 否 | 20 | 返回新闻数量（1-100） |
| category | string | 否 | "general" | 新闻分类 |
| language | string | 否 | "zh" | 语言设置 |
| sortBy | string | 否 | "publishedAt" | 排序方式 |
| deduplicate | boolean | 否 | true | 是否去重 |

### 支持的新闻分类

- `general` - 综合新闻
- `business` - 商业财经
- `entertainment` - 娱乐
- `health` - 健康
- `science` - 科学
- `sports` - 体育
- `technology` - 科技
- `politics` - 政治

### 支持的语言

- `zh` - 中文
- `en` - 英文
- `all` - 全部语言

### 排序方式

- `publishedAt` - 按发布时间排序
- `popularity` - 按热度排序
- `relevancy` - 按相关性排序

## 使用示例

### 基础用法
```
/api/dynamic-route/your-route-key
```

### 获取科技新闻
```
/api/dynamic-route/your-route-key?category=technology&limit=30
```

### 获取英文商业新闻
```
/api/dynamic-route/your-route-key?category=business&language=en&limit=25
```

### 按热度排序的娱乐新闻
```
/api/dynamic-route/your-route-key?category=entertainment&sortBy=popularity&limit=15
```

## 配置新闻源

在 `config/sources.js` 中可以配置新闻源：

```javascript
{
  id: 'your-source-id',
  name: '新闻源名称',
  url: 'https://api.example.com/news',
  type: 'api', // 或 'rss'
  enabled: true,
  categories: ['general', 'technology'],
  languages: ['zh', 'en'],
  timeout: 10000,
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
}
```

### 新闻源类型

1. **API类型** (`type: 'api'`)
   - 支持JSON格式的新闻API
   - 可配置请求头和参数
   - 支持自定义解析函数

2. **RSS类型** (`type: 'rss'`)
   - 支持标准RSS/XML格式
   - 自动解析RSS项目
   - 兼容大多数RSS源

## 返回格式

返回标准的RSS 2.0格式，包含以下字段：

```xml
<rss version="2.0">
  <channel>
    <title>新闻聚合 - 科技</title>
    <description>来自多个新闻源的科技新闻聚合</description>
    <item>
      <title>新闻标题</title>
      <description>新闻描述内容</description>
      <link>新闻链接</link>
      <guid>唯一标识符</guid>
      <pubDate>发布时间</pubDate>
      <author>作者</author>
      <category>分类</category>
    </item>
  </channel>
</rss>
```

## 模块说明

### index.js
主入口文件，负责：
- 参数验证和处理
- 协调各个模块
- 错误处理和日志记录
- 返回标准RSS格式

### utils/fetcher.js
数据获取模块，包含：
- `fetchFromMultipleSources()` - 并发获取多源数据
- `fetchFromSingleSource()` - 单源数据获取
- `parseApiData()` - API数据解析
- `parseRssData()` - RSS数据解析

### utils/formatter.js
数据格式化模块，包含：
- `formatNewsData()` - 新闻数据格式化
- `deduplicateNews()` - 新闻去重
- `formatSingleArticle()` - 单篇文章格式化
- `cleanText()` - 文本清理

### utils/validator.js
参数验证模块，包含：
- `validateNewsParams()` - 参数验证
- `validateNewsSource()` - 新闻源配置验证
- `validateApiResponse()` - API响应验证

### config/sources.js
配置文件，包含：
- 新闻源配置列表
- 分类和语言映射
- 缓存和请求配置
- 错误处理配置

## 开发指南

### 1. 添加新的新闻源

在 `config/sources.js` 中添加新的源配置：

```javascript
{
  id: 'new-source',
  name: '新新闻源',
  url: 'https://api.newsource.com/v1/news',
  type: 'api',
  enabled: true,
  categories: ['general'],
  languages: ['zh'],
  headers: {
    'X-API-Key': 'your-api-key'
  }
}
```

### 2. 自定义数据解析

为特殊格式的API添加自定义解析函数：

```javascript
parser: function(data) {
  return {
    articles: data.results.map(item => ({
      title: item.headline,
      description: item.summary,
      url: item.web_url,
      publishedAt: item.pub_date,
      author: item.byline?.original,
      source: { name: this.name }
    }))
  };
}
```

### 3. 扩展新闻分类

在 `config/sources.js` 的 `categories` 对象中添加新分类：

```javascript
categories: {
  'existing': '现有分类',
  'new-category': '新分类'
}
```

### 4. 优化去重算法

修改 `utils/formatter.js` 中的 `deduplicateNews()` 函数来改进去重逻辑。

## 性能优化

1. **并发控制**：限制同时请求的新闻源数量
2. **缓存机制**：缓存新闻数据减少重复请求
3. **超时设置**：为每个新闻源设置合理的超时时间
4. **错误恢复**：单个源失败不影响整体结果

## 注意事项

1. **API密钥**：使用第三方新闻API时需要配置有效的API密钥
2. **请求限制**：注意各新闻源的请求频率限制
3. **数据质量**：不同新闻源的数据格式可能不一致
4. **版权问题**：确保遵守新闻源的使用条款
5. **网络稳定性**：处理网络异常和超时情况

## 故障排除

### 常见问题

1. **获取数据失败**
   - 检查网络连接
   - 验证API密钥
   - 确认新闻源URL有效

2. **数据格式错误**
   - 检查新闻源返回的数据格式
   - 验证解析函数是否正确

3. **去重效果不佳**
   - 调整去重算法参数
   - 检查新闻标题和链接的一致性

### 调试技巧

1. 启用详细日志记录
2. 单独测试每个新闻源
3. 检查网络请求和响应
4. 验证数据解析结果