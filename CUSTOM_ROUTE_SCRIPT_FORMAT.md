# 自定义路由脚本返回格式说明

## 概述

自定义路由脚本现在支持两种返回格式：

1. **旧格式（向后兼容）**：直接返回文章项目数组
2. **新格式（推荐）**：返回包含完整RSS字段的对象

## 旧格式（向后兼容）

脚本直接返回文章项目数组，RSS的其他字段（如title、description等）将使用路由配置中的信息：

```javascript
// 返回文章数组
return [
  {
    title: "文章标题1",
    link: "https://example.com/article1",
    content: "文章内容",
    author: "作者",
    pubDate: "2024-01-01T00:00:00Z",
    image: "https://example.com/image1.jpg"
  },
  {
    title: "文章标题2",
    link: "https://example.com/article2",
    content: "文章内容",
    author: "作者",
    pubDate: "2024-01-02T00:00:00Z"
  }
];
```

## 新格式（推荐）

脚本返回包含完整RSS字段的对象，可以自定义RSS频道的所有信息：

```javascript
// 返回完整RSS对象
return {
  // RSS频道信息
  title: "自定义RSS标题",
  description: "RSS频道描述",
  feed_url: "https://example.com/rss.xml",
  site_url: "https://example.com",
  generator: "自定义生成器",
  pubDate: "2024-01-01T00:00:00Z",
  language: "zh-CN",
  copyright: "版权信息",
  managingEditor: "editor@example.com",
  webMaster: "webmaster@example.com",
  ttl: 60, // 缓存时间（分钟）
  image: "https://example.com/logo.png", // RSS频道图片
  
  // 文章项目数组
  items: [
    {
      title: "文章标题1",
      link: "https://example.com/article1",
      content: "文章内容",
      author: "作者",
      pubDate: "2024-01-01T00:00:00Z",
      image: "https://example.com/image1.jpg"
    },
    {
      title: "文章标题2",
      link: "https://example.com/article2",
      content: "文章内容",
      author: "作者",
      pubDate: "2024-01-02T00:00:00Z"
    }
  ]
};
```

## 字段说明

### RSS频道字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `title` | string | 否 | RSS频道标题，未提供时使用路由配置中的名称 |
| `description` | string | 否 | RSS频道描述，未提供时使用路由配置中的描述 |
| `feed_url` | string | 否 | RSS订阅地址，未提供时自动生成 |
| `site_url` | string | 否 | 网站地址，未提供时使用feed_url |
| `generator` | string | 否 | RSS生成器标识，默认为"FeedHub CustomRoute" |
| `pubDate` | string | 否 | 发布时间，ISO格式，默认为当前时间 |
| `language` | string | 否 | 语言代码，如"zh-CN"、"en-US" |
| `copyright` | string | 否 | 版权信息 |
| `managingEditor` | string | 否 | 编辑邮箱 |
| `webMaster` | string | 否 | 网站管理员邮箱 |
| `ttl` | number | 否 | 缓存时间（分钟） |
| `image` | string | 否 | RSS频道图片URL |
| `items` | array | 是 | 文章项目数组 |

### 文章项目字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `title` | string | 否 | 文章标题，未提供时自动生成 |
| `link` | string | 否 | 文章链接 |
| `content` | string | 否 | 文章内容 |
| `contentSnippet` | string | 否 | 文章摘要，未提供时从content截取 |
| `author` | string | 否 | 作者 |
| `pubDate` | string | 否 | 发布时间，ISO格式 |
| `guid` | string | 否 | 唯一标识，未提供时使用link或自动生成 |
| `image` | string | 否 | 文章封面图片URL |

## 实际示例

### 示例1：从API获取数据并返回完整RSS

```javascript
// 获取API数据
const response = await utils.fetchApi('https://api.example.com/news');
const data = response.data;

// 返回完整RSS格式
return {
  title: data.channel.title,
  description: data.channel.description,
  site_url: data.channel.link,
  language: 'zh-CN',
  items: data.articles.map(article => ({
    title: article.headline,
    link: article.url,
    content: article.body,
    author: article.author.name,
    pubDate: article.publishedAt,
    image: article.featuredImage
  }))
};
```

### 示例2：网页抓取并返回简化格式

```javascript
// 抓取网页内容
const articles = [];
$('.article-item').each((i, elem) => {
  articles.push({
    title: $(elem).find('.title').text(),
    link: $(elem).find('a').attr('href'),
    content: $(elem).find('.summary').text(),
    pubDate: new Date().toISOString()
  });
});

// 返回旧格式（向后兼容）
return articles;
```

## 注意事项

1. **向后兼容**：现有的脚本无需修改，仍然可以正常工作
2. **字段优先级**：新格式中提供的字段会覆盖路由配置中的对应字段
3. **必需字段**：新格式中`items`字段是必需的，必须是数组
4. **日期格式**：建议使用ISO 8601格式的日期字符串
5. **URL验证**：确保提供的URL是有效的完整地址

## 迁移建议

如果你想从旧格式迁移到新格式：

1. 将现有的返回数组包装在`items`字段中
2. 添加RSS频道信息字段
3. 测试确保所有字段正确显示

```javascript
// 旧格式
return articles;

// 迁移到新格式
return {
  title: "我的RSS频道",
  description: "频道描述",
  site_url: "https://mysite.com",
  items: articles
};
```