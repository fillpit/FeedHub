<template>
  <div class="script-help-content">
    <h3>可用工具函数</h3>
    <p>在脚本中，您可以使用以下工具函数：</p>

    <el-divider />

    <h4>1. 获取路由参数</h4>
    <p>路由参数包括查询参数和路径参数（动态参数）：</p>
    <pre class="code-block">// 获取所有路由参数（包括查询参数和路径参数）
const params = routeParams;
console.log('路由参数:', params);

// 解构获取特定参数
const { keyword, limit = 10, uid } = routeParams;

// 示例：对于路由 /bilibili/:uid 和请求 /custom/bilibili/123?limit=20
// routeParams 将包含: { uid: '123', limit: '20' }</pre>

    <h4>2. 发起HTTP请求</h4>
    <pre class="code-block">// 使用 fetchApi 发起请求（推荐，支持自动授权）
const response = await fetchApi('https://api.example.com/data', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});
const data = await response.json();

// 使用原生 fetch（不支持自动授权）
const response = await fetch('https://api.example.com/data');
const data = await response.json();</pre>

    <h4>3. 获取授权信息</h4>
    <p>如果路由配置了授权信息，可以通过 utils.getAuthInfo() 获取：</p>
    <pre class="code-block">// 获取当前路由的授权信息
const authInfo = utils.getAuthInfo();
if (authInfo) {
  console.log('授权类型:', authInfo.authType);
  console.log('授权数据:', authInfo.authData);
  
  // 根据授权类型处理
  if (authInfo.authType === 'bearer') {
    // Bearer Token 授权
    const token = authInfo.authData.token;
  } else if (authInfo.authType === 'basic') {
    // Basic 授权
    const { username, password } = authInfo.authData;
  } else if (authInfo.authType === 'apikey') {
    // API Key 授权
    const { key, value } = authInfo.authData;
  }
}</pre>

    <h4>4. 日志输出</h4>
    <pre class="code-block">// 输出不同级别的日志
console.log('这是一条信息日志');
console.warn('这是一条警告日志');
console.error('这是一条错误日志');
console.debug('这是一条调试日志');

// 使用 utils.log（推荐）
utils.log('info', '这是一条信息日志');
utils.log('warn', '这是一条警告日志');
utils.log('error', '这是一条错误日志');
utils.log('debug', '这是一条调试日志');</pre>

    <h4>5. 解析日期</h4>
    <pre class="code-block">// 解析日期字符串为Date对象
const date = parseDate('2023-01-01 12:00:00');
console.log(date);

// 解析各种格式的日期
const date1 = parseDate('2023年5月1日');
const date2 = parseDate('May 1, 2023');
const date3 = parseDate('2023-05-01T10:30:00Z');</pre>

    <h4>6. HTML解析工具</h4>
    <pre class="code-block">// 解析HTML字符串为DOM对象
const dom = parseHTML(html);
const title = dom.querySelector('h1').textContent;

// 批量提取元素
const items = dom.querySelectorAll('.article-item');
for (const item of items) {
  const title = item.querySelector('.title')?.textContent?.trim();
  const link = item.querySelector('a')?.href;
}</pre>

    <h4>7. 字符串处理工具</h4>
    <pre class="code-block">// 清理HTML标签
const cleanText = utils.stripHtml('<p>Hello <b>World</b></p>'); // 'Hello World'

// 截取文本
const summary = utils.truncate(longText, 200); // 截取前200个字符

// URL处理
const absoluteUrl = utils.resolveUrl('https://example.com', '/path/to/page');
// 结果: 'https://example.com/path/to/page'

// 编码处理
const encoded = encodeURIComponent('中文参数');
const decoded = decodeURIComponent(encoded);</pre>

    <h4>8. 数据处理工具</h4>
    <pre class="code-block">// 去重
const uniqueItems = utils.unique(items, 'id'); // 根据id字段去重

// 排序
const sortedItems = utils.sortBy(items, 'pubDate', 'desc'); // 按发布日期降序

// 过滤
const recentItems = items.filter(item => {
  const daysDiff = (Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 30; // 只保留30天内的文章
});</pre>

    <el-divider />

    <h3>脚本返回格式</h3>
    <p>脚本支持两种返回格式：</p>
    <h4>新格式（推荐）- 完整RSS对象：</h4>
    <pre class="code-block">return {
  title: "RSS频道标题",
  description: "RSS频道描述",
  site_url: "网站地址",
  language: "zh-CN",
  items: [
    {
      title: "文章标题",
      link: "文章链接",
      content: "文章内容",
      author: "作者",
      pubDate: "发布时间",
      image: "封面图片",
      guid: "唯一标识符" // 可选，默认使用link
    }
  ]
};</pre>
    <h4>旧格式（向后兼容）- 仅文章数组：</h4>
    <p>脚本直接返回文章数组，RSS其他字段使用路由配置：</p>

    <pre class="code-block">[
  {
    title: '文章标题',
    link: 'https://example.com/article/1',
    guid: 'unique-id-1', // 可选，默认使用link
    content: '文章内容或摘要',
    pubDate: new Date(), // 发布日期
    author: '作者名称', // 可选
    image: 'https://example.com/image.jpg' // 可选，封面图片URL
  },
  // 更多项目...
]</pre>

    <el-divider />

    <h3>完整示例</h3>
    <h4>示例1：使用查询参数</h4>
    <p>路由路径：<code>/search</code>，请求：<code>/custom/search?keyword=技术&limit=10</code></p>
    <pre class="code-block">// 获取路由参数
const { keyword, limit = 10 } = routeParams;

// 构建API URL
const apiUrl = `https://api.example.com/search?q=${encodeURIComponent(keyword)}&limit=${limit}`;

// 发起请求
const response = await fetchApi(apiUrl);
const data = await response.json();

// 处理结果
const items = data.items.map(item => ({
  title: item.title,
  link: item.url,
  guid: item.id,
  content: item.description,
  pubDate: parseDate(item.published_at),
  author: item.author?.name,
  image: item.image_url
}));

// 返回结果
return items;</pre>

    <h4>示例2：使用动态路径参数</h4>
    <p>路由路径：<code>/bilibili/:uid</code>，请求：<code>/custom/bilibili/123456?limit=20</code></p>
    <pre class="code-block">// 获取路由参数（包括路径参数uid和查询参数limit）
const { uid, limit = 10 } = routeParams;

// 构建API URL，使用路径参数
const apiUrl = `https://api.bilibili.com/x/space/arc/search?mid=${uid}&ps=${limit}`;

// 发起请求
const response = await fetchApi(apiUrl);
const data = await response.json();

// 处理结果
const items = data.data.list.vlist.map(item => ({
  title: item.title,
  link: `https://www.bilibili.com/video/${item.bvid}`,
  guid: item.bvid,
  content: item.description,
  pubDate: new Date(item.created * 1000),
  author: item.author,
  image: item.pic
}));

// 返回结果
return items;</pre>

    <h4>示例3：使用授权信息</h4>
    <p>配置了API Key授权的路由示例：</p>
    <pre class="code-block">// 获取授权信息
const authInfo = utils.getAuthInfo();
const { keyword, limit = 10 } = routeParams;

// 构建请求头（fetchApi会自动处理授权，这里仅作演示）
const headers = {
  'Content-Type': 'application/json'
};

if (authInfo && authInfo.authType === 'apikey') {
  const { key, value } = authInfo.authData;
  headers[key] = value; // 例如: headers['X-API-Key'] = 'your-api-key'
}

// 发起请求（推荐使用fetchApi，会自动应用授权）
const response = await fetchApi(`https://api.example.com/search?q=${keyword}&limit=${limit}`);
const data = await response.json();

// 处理结果
return data.articles.map(article => ({
  title: article.title,
  link: article.url,
  content: utils.stripHtml(article.content),
  pubDate: parseDate(article.publishedAt),
  author: article.author,
  image: article.thumbnail
}));</pre>

    <h4>示例4：网页抓取示例</h4>
    <p>抓取网页内容并解析：</p>
    <pre class="code-block">// 获取网页内容
const response = await fetchApi('https://example.com/blog');
const html = await response.text();

// 解析HTML
const dom = parseHTML(html);

// 提取文章列表
const articles = [];
const items = dom.querySelectorAll('.article-item');

for (const item of items) {
  const titleEl = item.querySelector('.title');
  const linkEl = item.querySelector('a');
  const contentEl = item.querySelector('.summary');
  const dateEl = item.querySelector('.date');
  const imageEl = item.querySelector('img');
  
  if (titleEl && linkEl) {
    const title = titleEl.textContent.trim();
    const link = utils.resolveUrl('https://example.com', linkEl.getAttribute('href'));
    const content = contentEl ? utils.stripHtml(contentEl.innerHTML) : '';
    const pubDate = dateEl ? parseDate(dateEl.textContent.trim()) : new Date();
    const image = imageEl ? utils.resolveUrl('https://example.com', imageEl.src) : null;
    
    articles.push({
      title,
      link,
      content: utils.truncate(content, 300),
      pubDate,
      image
    });
  }
}

// 按日期排序并返回
return utils.sortBy(articles, 'pubDate', 'desc');</pre>

    <div v-if="!compact" class="additional-info">
      <el-divider />
      <h3>性能优化建议</h3>
      <ul>
        <li>使用 <code>fetchApi</code> 而不是原生 <code>fetch</code>，可以自动应用授权信息</li>
        <li>合理设置脚本超时时间，避免长时间运行</li>
        <li>使用 <code>utils.unique</code> 去重，避免重复内容</li>
        <li>使用 <code>utils.truncate</code> 截取过长的内容</li>
        <li>适当使用缓存，避免频繁请求同一资源</li>
        <li>处理异常情况，确保脚本稳定运行</li>
      </ul>

      <h3>调试技巧</h3>
      <ul>
        <li>使用 <code>console.log</code> 或 <code>utils.log</code> 输出调试信息</li>
        <li>在调试模式下查看日志输出选项卡</li>
        <li>检查返回的JSON格式是否正确</li>
        <li>验证日期格式是否能正确解析</li>
        <li>确保所有必需字段都有值</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  compact?: boolean;
}

withDefaults(defineProps<Props>(), {
  compact: false
});
</script>

<style scoped>
.script-help-content {
  padding: 10px;
  max-height: 70vh;
  overflow-y: auto;
}

.script-help-content h3 {
  color: #409EFF;
  margin-bottom: 10px;
}

.script-help-content h4 {
  color: #606266;
  margin: 20px 0 10px 0;
  font-size: 16px;
}

.script-help-content p {
  margin: 8px 0;
  color: #606266;
  line-height: 1.6;
}

.code-block {
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin: 10px 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #2c3e50;
}

.code-block code {
  background: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

.additional-info ul {
  padding-left: 20px;
}

.additional-info li {
  margin: 5px 0;
  color: #606266;
  line-height: 1.6;
}

.additional-info code {
  background-color: #f0f2f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}
</style>