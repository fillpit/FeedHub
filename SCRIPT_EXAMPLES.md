# 脚本抓取示例文档

本文档提供了各种网站和API接口的脚本抓取示例，帮助您快速上手脚本抓取功能。

## 安全数据处理最佳实践

### 避免 "Cannot read properties of undefined" 错误

在处理API响应数据时，始终使用安全的数据访问方法：

```javascript
// ❌ 危险的数据访问方式
const items = [];
const result = await utils.fetchApi('https://api.example.com/posts');
result.data.forEach(post => {
  items.push({
    title: post.title,  // 如果 post 是 undefined，这里会报错
    link: post.url,
    content: post.content
  });
});

// ✅ 安全的数据访问方式
const items = [];
try {
  const result = await utils.fetchApi('https://api.example.com/posts');
  
  // 使用安全工具函数
  const data = utils.safeArray(result.data);
  
  data.forEach((post, index) => {
    // 验证数据项
    if (!utils.validateItem(post, index)) {
      return; // 跳过无效项
    }
    
    items.push({
      title: utils.safeGet(post, 'title', `项目 ${index + 1}`),
      link: utils.safeGet(post, 'url', ''),
      content: utils.safeGet(post, 'content', ''),
      author: utils.safeGet(post, 'author', '未知作者'),
      pubDate: utils.parseDate(utils.safeGet(post, 'created_at', new Date().toISOString()))
    });
  });
  
} catch (error) {
  console.error('API请求失败:', error.message);
}

return items;
```

### 安全工具函数使用指南

```javascript
// 1. safeGet - 安全访问嵌套属性
const title = utils.safeGet(post, 'user.profile.name', '未知用户');
const tags = utils.safeGet(post, 'tags', []);

// 2. safeArray - 确保得到数组
const posts = utils.safeArray(result.data);
posts.forEach(post => {
  // 安全处理每个项目
});

// 3. safeObject - 确保得到对象
const config = utils.safeObject(response.config);

// 4. validateItem - 验证数据项
if (utils.validateItem(item, index)) {
  // 处理有效的数据项
}
```

## 快速开始

### API接口抓取示例

如果您想从API接口获取数据，这里是一个简单的示例：

```javascript
// 从API接口获取文章列表（自动使用配置的授权信息）
const items = [];

try {
  // 使用utils.fetchApi会自动应用配置的授权信息
  const result = await utils.fetchApi('https://api.example.com/posts');
  
  // 处理返回的数据
  result.data.forEach(post => {
    items.push({
      title: post.title,
      link: post.url,
      content: post.content,
      author: post.author,
      pubDate: utils.parseDate(post.created_at)
    });
  });
  
} catch (error) {
  console.error('API请求失败:', error.message);
}

return items;
```

### 使用配置的授权信息

如果您在配置中设置了授权方式，脚本可以自动使用这些授权信息：

```javascript
// 查看当前配置的授权信息
const authInfo = utils.getAuthInfo();
console.log('授权类型:', authInfo.type);

// 根据授权类型进行不同的处理
if (authInfo.type === 'bearer') {
  console.log('使用Bearer Token认证');
} else if (authInfo.type === 'basic') {
  console.log('使用Basic认证');
} else if (authInfo.type === 'cookie') {
  console.log('使用Cookie认证');
}

// utils.fetchApi会自动应用这些授权信息
const result = await utils.fetchApi('https://api.example.com/posts');
```

## 目录

1. [网页抓取示例](#网页抓取示例)
2. [API接口抓取示例](#api接口抓取示例)
3. [复杂数据处理示例](#复杂数据处理示例)
4. [错误处理最佳实践](#错误处理最佳实践)

## 网页抓取示例

### 基础网页抓取

```javascript
// 抓取文章列表
const items = [];
$('.article-item').each((index, element) => {
  const $el = $(element);
  items.push({
    title: $el.find('.title').text().trim(),
    link: $el.find('a').attr('href'),
    content: $el.find('.content').text().trim(),
    author: $el.find('.author').text().trim(),
    pubDate: utils.formatDate($el.find('.date').text().trim())
  });
});
return items;
```

### 动态内容抓取

```javascript
// 抓取需要等待加载的内容
const items = [];
$('.post-item').each((index, element) => {
  const $el = $(element);
  const title = $el.find('h2').text().trim();
  const link = $el.find('a').attr('href');
  
  // 处理相对链接
  const fullLink = link.startsWith('http') ? link : new URL(link, url).href;
  
  items.push({
    title: title,
    link: fullLink,
    content: $el.find('.excerpt').text().trim(),
    author: $el.find('.author-name').text().trim(),
    pubDate: utils.formatDate($el.find('.publish-date').text().trim())
  });
});
return items;
```

## API接口抓取示例

### REST API 抓取

```javascript
// 抓取REST API数据
const items = [];

try {
  // 使用utils.fetchApi发送请求
  const result = await utils.fetchApi('https://api.example.com/posts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
  
  // 处理返回的数据
  result.data.forEach(post => {
    items.push({
      title: post.title,
      link: post.url || `https://example.com/post/${post.id}`,
      content: post.content || post.excerpt,
      author: post.author?.name || post.author_name,
      pubDate: utils.parseDate(post.created_at || post.published_at)
    });
  });
  
} catch (error) {
  console.error('API请求失败:', error.message);
}

return items;
```

### 使用配置的授权信息

```javascript
// 使用配置的授权信息进行API请求
const items = [];

try {
  // 获取当前配置的授权信息
  const authInfo = utils.getAuthInfo();
  console.log('当前授权类型:', authInfo.type);
  
  // 根据授权类型进行不同的处理
  let apiUrl = 'https://api.example.com/posts';
  let requestOptions = {};
  
  switch (authInfo.type) {
    case 'bearer':
      // Bearer Token会自动被utils.fetchApi应用
      console.log('使用Bearer Token认证');
      break;
      
    case 'basic':
      // Basic Auth会自动被utils.fetchApi应用
      console.log('使用Basic认证');
      break;
      
    case 'cookie':
      // Cookie会自动被utils.fetchApi应用
      console.log('使用Cookie认证');
      break;
      
    case 'custom':
      // 自定义请求头会自动被utils.fetchApi应用
      console.log('使用自定义请求头认证');
      console.log('自定义请求头:', authInfo.customHeaders);
      break;
      
    default:
      console.log('无授权配置');
  }
  
  // 发送请求（授权信息会自动应用）
  const result = await utils.fetchApi(apiUrl, requestOptions);
  
  // 处理数据
  result.data.forEach(post => {
    items.push({
      title: post.title,
      link: post.url,
      content: post.content,
      author: post.author,
      pubDate: utils.parseDate(post.created_at)
    });
  });
  
} catch (error) {
  console.error('API请求失败:', error.message);
}

return items;
```

### GraphQL API 抓取

```javascript
// 抓取GraphQL API数据
const items = [];

try {
  const query = `
    query GetPosts($limit: Int!) {
      posts(limit: $limit) {
        id
        title
        content
        author {
          name
        }
        createdAt
        url
      }
    }
  `;
  
  const result = await utils.fetchApi('https://api.example.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-token',
      'Content-Type': 'application/json'
    },
    data: {
      query: query,
      variables: { limit: 20 }
    }
  });
  
  result.data.posts.forEach(post => {
    items.push({
      title: post.title,
      link: post.url,
      content: post.content,
      author: post.author.name,
      pubDate: utils.parseDate(post.createdAt)
    });
  });
  
} catch (error) {
  console.error('GraphQL请求失败:', error.message);
}

return items;
```

### 分页API抓取

```javascript
// 抓取分页API数据
const items = [];
let page = 1;
const maxPages = 3; // 限制抓取页数

try {
  while (page <= maxPages) {
    const result = await utils.fetchApi(`https://api.example.com/posts?page=${page}&limit=20`, {
      headers: {
        'Authorization': 'Bearer your-token'
      }
    });
    
    if (!result.data || result.data.length === 0) {
      break; // 没有更多数据
    }
    
    result.data.forEach(post => {
      items.push({
        title: post.title,
        link: post.url,
        content: post.content,
        author: post.author,
        pubDate: utils.parseDate(post.created_at)
      });
    });
    
    page++;
    
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
} catch (error) {
  console.error('分页API请求失败:', error.message);
}

return items;
```

### 多API源数据合并

```javascript
// 从多个API源获取数据并合并
const items = [];

try {
  // 并行请求多个API
  const [postsResult, newsResult] = await Promise.all([
    utils.fetchApi('https://api.example.com/posts'),
    utils.fetchApi('https://api.example.com/news')
  ]);
  
  // 处理博客文章
  postsResult.data.forEach(post => {
    items.push({
      title: post.title,
      link: post.url,
      content: post.content,
      author: post.author,
      pubDate: utils.parseDate(post.created_at),
      source: 'blog'
    });
  });
  
  // 处理新闻
  newsResult.data.forEach(news => {
    items.push({
      title: news.title,
      link: news.url,
      content: news.summary,
      author: news.reporter,
      pubDate: utils.parseDate(news.published_at),
      source: 'news'
    });
  });
  
  // 按发布时间排序
  items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  
} catch (error) {
  console.error('多API请求失败:', error.message);
}

return items;
```

## 复杂数据处理示例

### 数据清洗和转换

```javascript
// 数据清洗和格式转换
const items = [];

try {
  const result = await utils.fetchApi('https://api.example.com/raw-data');
  
  result.data.forEach(item => {
    // 清洗标题
    const cleanTitle = item.title
      .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 移除特殊字符
      .trim();
    
    // 处理内容
    let content = item.content || item.description || '';
    if (content.length > 500) {
      content = content.substring(0, 500) + '...';
    }
    
    // 处理作者信息
    let author = item.author || item.writer || '未知作者';
    if (typeof author === 'object') {
      author = author.name || author.username || '未知作者';
    }
    
    // 处理日期
    let pubDate = new Date().toISOString();
    if (item.created_at || item.published_at || item.date) {
      pubDate = utils.parseDate(item.created_at || item.published_at || item.date);
    }
    
    items.push({
      title: cleanTitle,
      link: item.url || item.link || `https://example.com/item/${item.id}`,
      content: content,
      author: author,
      pubDate: pubDate
    });
  });
  
} catch (error) {
  console.error('数据处理失败:', error.message);
}

return items;
```

### 条件过滤和排序

```javascript
// 条件过滤和智能排序
const items = [];

try {
  const result = await utils.fetchApi('https://api.example.com/items');
  
  // 过滤和转换数据
  const processedItems = result.data
    .filter(item => {
      // 过滤条件：必须有标题和内容
      return item.title && item.content && item.title.length > 5;
    })
    .map(item => ({
      title: item.title,
      link: item.url,
      content: item.content,
      author: item.author || '未知作者',
      pubDate: utils.parseDate(item.created_at),
      priority: item.priority || 0,
      category: item.category || 'default'
    }))
    .sort((a, b) => {
      // 按优先级和发布时间排序
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(b.pubDate) - new Date(a.pubDate);
    });
  
  items.push(...processedItems);
  
} catch (error) {
  console.error('数据过滤失败:', error.message);
}

return items;
```

## 错误处理最佳实践

### 完整的错误处理示例

```javascript
// 完整的错误处理和重试机制
const items = [];
const maxRetries = 3;

async function fetchWithRetry(url, options, retries = 0) {
  try {
    return await utils.fetchApi(url, options);
  } catch (error) {
    if (retries < maxRetries) {
      console.warn(`请求失败，重试第${retries + 1}次:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      return fetchWithRetry(url, options, retries + 1);
    }
    throw error;
  }
}

try {
  const result = await fetchWithRetry('https://api.example.com/posts', {
    headers: {
      'Authorization': 'Bearer your-token'
    },
    timeout: 15000
  });
  
  if (!result.data || !Array.isArray(result.data)) {
    throw new Error('API返回数据格式不正确');
  }
  
  result.data.forEach(post => {
    // 验证必要字段
    if (!post.title || !post.id) {
      console.warn('跳过无效数据项:', post);
      return;
    }
    
    items.push({
      title: post.title,
      link: post.url || `https://example.com/post/${post.id}`,
      content: post.content || post.excerpt || '',
      author: post.author || '未知作者',
      pubDate: utils.parseDate(post.created_at || post.published_at)
    });
  });
  
} catch (error) {
  console.error('最终请求失败:', error.message);
  // 返回空数组而不是抛出错误，避免整个抓取失败
}

return items;
```

### 数据验证和容错

```javascript
// 数据验证和容错处理
const items = [];

try {
  const result = await utils.fetchApi('https://api.example.com/data');
  
  // 验证API响应
  if (!result.data) {
    throw new Error('API响应中没有data字段');
  }
  
  const data = Array.isArray(result.data) ? result.data : [result.data];
  
  data.forEach((item, index) => {
    try {
      // 验证必要字段
      if (!item || typeof item !== 'object') {
        console.warn(`跳过无效项目 ${index}: 不是对象`);
        return;
      }
      
      const title = item.title || item.name || item.headline || `项目 ${index + 1}`;
      const link = item.url || item.link || item.permalink || '';
      const content = item.content || item.body || item.summary || item.description || '';
      const author = item.author || item.writer || item.creator || '未知作者';
      
      // 处理日期
      let pubDate = new Date().toISOString();
      if (item.created_at || item.published_at || item.date || item.timestamp) {
        try {
          pubDate = utils.parseDate(item.created_at || item.published_at || item.date || item.timestamp);
        } catch (dateError) {
          console.warn(`日期解析失败: ${dateError.message}`);
        }
      }
      
      items.push({
        title: title,
        link: link,
        content: content,
        author: author,
        pubDate: pubDate
      });
      
    } catch (itemError) {
      console.warn(`处理项目 ${index} 时出错:`, itemError.message);
    }
  });
  
} catch (error) {
  console.error('数据获取失败:', error.message);
}

return items;
```

## 注意事项

1. **超时设置**: 脚本执行有超时限制，建议设置合理的请求超时时间
2. **错误处理**: 始终使用try-catch包装API请求
3. **数据验证**: 验证API返回的数据格式和必要字段
4. **性能考虑**: 避免在脚本中进行过多的数据处理
5. **安全性**: 不要在脚本中硬编码敏感信息（如API密钥）
6. **调试**: 使用console.log输出调试信息

## 常见问题

**Q: 如何处理API认证？**
A: 在配置中设置授权方式，脚本会自动使用这些授权信息。也可以使用 `utils.getAuthInfo()` 获取授权信息。

**Q: 如何处理分页数据？**
A: 使用循环和分页参数，注意设置合理的页数限制。

**Q: 如何处理API限流？**
A: 在请求之间添加延迟，使用重试机制。

**Q: 如何合并多个数据源？**
A: 使用Promise.all并行请求，然后合并结果。

**Q: 如何处理数据格式不一致？**
A: 使用数据清洗和转换逻辑，设置默认值。

**Q: 如何在脚本中使用配置的授权信息？**
A: 使用 `utils.fetchApi()` 会自动应用配置的授权信息，或使用 `utils.getAuthInfo()` 获取授权信息手动处理。

**Q: 配置了授权信息但脚本中没有生效？**
A: 确保使用 `utils.fetchApi()` 而不是直接使用 `axios`，因为只有 `utils.fetchApi()` 会自动应用配置的授权信息。 