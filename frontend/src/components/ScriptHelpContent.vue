<template>
  <div class="script-help-content">
    <h3>可用工具函数</h3>
    <p>在脚本中，您可以使用以下工具函数：</p>

    <el-divider />

    <h4>1. 获取路由参数</h4>
    <p>路由参数包括查询参数和路径参数（动态参数）：</p>
    <pre class="code-block">
// 获取所有路由参数（包括查询参数和路径参数）
const params = routeParams;
console.log('路由参数:', params);

// 解构获取特定参数
const { keyword, limit = 10, uid } = routeParams;

// 示例：对于路由 /bilibili/:uid 和请求 /custom/bilibili/123?limit=20
// routeParams 将包含: { uid: '123', limit: '20' }</pre
    >

    <h4>2. 发起HTTP请求</h4>
    <pre class="code-block">
// 使用 utils.fetchApi 发起GET请求
const response = await utils.fetchApi('https://jsonplaceholder.typicode.com/posts/1');
console.log(response.status); // 输出: 200
console.log(response.data.title); // 输出: 文章标题

// 发起POST请求
const postResponse = await utils.fetchApi('https://api.example.com/articles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    title: '新文章',
    content: '文章内容'
  }
});
console.log(postResponse.status); // 输出: 201 (创建成功)

// 使用 axios 实例（也支持自动授权）
const axiosResponse = await axios.get('https://api.example.com/users');
console.log(axiosResponse.data.length); // 输出: 用户数量</pre
    >

    <h4>3. 获取授权信息</h4>
    <p>如果路由配置了授权信息，可以通过 utils.getAuthInfo() 或 auth 对象获取：</p>
    <pre class="code-block">
// 获取当前路由的授权信息
const authInfo = utils.getAuthInfo();
// 或者直接使用 auth 对象
const authInfo = auth;

console.log('授权类型:', authInfo.type); // 输出: 'bearer' 或 'basic' 等

// Bearer Token 示例
if (authInfo.type === 'bearer' && authInfo.bearerToken) {
  console.log('Bearer Token:', authInfo.bearerToken);
  // 输出: Bearer Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
}

// Basic Auth 示例
if (authInfo.type === 'basic' && authInfo.basicAuth) {
  console.log('用户名:', authInfo.basicAuth.username); // 输出: admin
  console.log('密码:', authInfo.basicAuth.password); // 输出: password123
}

// Cookie 示例
if (authInfo.type === 'cookie' && authInfo.cookie) {
  console.log('Cookie:', authInfo.cookie);
  // 输出: sessionId=abc123; userId=456
}

// 自定义请求头示例
if (authInfo.type === 'custom' && authInfo.customHeaders) {
  console.log('自定义请求头:', authInfo.customHeaders);
  // 输出: { 'X-API-Key': 'your-api-key', 'X-Client-ID': 'client123' }
}</pre
    >

    <h4>4. 日志输出</h4>
    <pre class="code-block">
// 输出不同级别的日志
console.log('这是一条信息日志');
console.warn('这是一条警告日志');
console.error('这是一条错误日志');

// 注意：console 对象已经过特殊处理，会自动记录到调试日志中</pre
    >

    <h4>5. 日期处理工具</h4>
    <pre class="code-block">
// 使用 utils.parseDate 解析日期字符串
const isoDate = utils.parseDate('2023-01-01 12:00:00');
console.log(isoDate); // 输出: 2023-01-01T12:00:00.000Z

// 解析中文日期
const chineseDate = utils.parseDate('2023年5月1日');
console.log(chineseDate); // 输出: 2023-05-01T00:00:00.000Z

// 使用 utils.formatDate 格式化日期
const formatted = utils.formatDate('2023-01-01', 'YYYY年MM月DD日');
console.log(formatted); // 输出: 2023年01月01日

// 使用 dayjs 进行更复杂的日期操作
const now = dayjs();
console.log(now.format('YYYY-MM-DD')); // 输出: 2024-12-24 (当前日期)

const tomorrow = dayjs().add(1, 'day');
console.log(tomorrow.format('YYYY-MM-DD')); // 输出: 2024-12-25

const formatted2 = dayjs('2023-01-01').format('YYYY-MM-DD HH:mm:ss');
console.log(formatted2); // 输出: 2023-01-01 00:00:00

// 计算日期差
const diff = dayjs().diff(dayjs('2023-01-01'), 'days');
console.log(diff); // 输出: 距离2023年1月1日的天数</pre
    >

    <h4>6. HTML解析工具</h4>
    <pre class="code-block">// 使用 $ (jQuery-like) 解析当前页面HTML
const title = $('h1').text();
console.log(title); // 输出: 页面主标题

const items = $('.article-item');
console.log(items.length); // 输出: 文章项目数量

// 遍历元素并提取信息
const articles = [];
items.each((index, element) => {
  const $item = $(element);
  const title = $item.find('.title').text().trim();
  const link = $item.find('a').attr('href');
  const date = $item.find('.date').text();
  
  console.log(`文章 ${index + 1}: ${title}`);
  articles.push({ title, link, date });
});

// 获取特定属性
const firstLink = $('a').first().attr('href');
console.log(firstLink); // 输出: 第一个链接的href属性

// 提取纯文本内容
const htmlContent = '<p>Hello <b>World</b></p>';
const plainText = utils.extractText(htmlContent);
console.log(plainText); // 输出: Hello World

// 处理复杂HTML结构
const complexHtml = '<div><h2>标题</h2><p>段落1</p><p>段落2</p></div>';
const textOnly = utils.extractText(complexHtml);
console.log(textOnly); // 输出: 标题段落1段落2</pre>

    <h4>7. 数据处理工具</h4>
    <pre class="code-block">
// JSON 解析
const jsonString = '{"name": "张三", "age": 25}';
const data = utils.parseJson(jsonString);
console.log(data.name); // 输出: 张三

// 安全获取对象属性
const user = { profile: { name: '李四' } };
const name = utils.safeGet(user, 'profile.name', '匿名用户');
console.log(name); // 输出: 李四
const email = utils.safeGet(user, 'profile.email', 'no-email');
console.log(email); // 输出: no-email (因为不存在)

// 确保数组类型
const maybeArray = null;
const arr = utils.safeArray(maybeArray);
console.log(arr); // 输出: [] (空数组)
const realArray = utils.safeArray([1, 2, 3]);
console.log(realArray); // 输出: [1, 2, 3]

// 确保对象类型
const maybeObject = null;
const obj = utils.safeObject(maybeObject);
console.log(obj); // 输出: {} (空对象)

// 选择对象的指定属性
const user = { name: '王五', email: 'wang@example.com', age: 30, password: '123456' };
const picked = utils.pick(user, ['name', 'email', 'age']);
console.log(picked); // 输出: { name: '王五', email: 'wang@example.com', age: 30 }

// 数组分块
const largeArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const chunks = utils.chunk(largeArray, 3);
console.log(chunks); // 输出: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]

// 生成查询参数字符串
const params = { name: 'test', page: 1, tags: ['tech', 'news'] };
const queryString = utils.queryParams(params);
console.log(queryString); // 输出: name=test&page=1&tags=tech&tags=news</pre
    >

    <h4>8. 其他实用工具</h4>
    <pre class="code-block">
// 生成UUID
const id = utils.uuid();
console.log(id); // 输出: 类似 '550e8400-e29b-41d4-a716-446655440000'

// 验证数据项
const item1 = { title: '文章标题', link: 'https://example.com' };
const isValid1 = utils.validateItem(item1, 0);
console.log(isValid1); // 输出: true

const item2 = { content: '只有内容' }; // 缺少标题
const isValid2 = utils.validateItem(item2, 1);
console.log(isValid2); // 输出: false

// 过滤最近的文章
const items = [
  { title: '今天的文章', pubDate: new Date().toISOString() },
  { title: '一个月前的文章', pubDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() }
];
const recentItems = items.filter(item => {
  const daysDiff = (Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 30; // 只保留30天内的文章
});
console.log(recentItems.length); // 输出: 1 (只有今天的文章)

// 使用 require 加载 npm 包（需要在白名单中）
try {
  const lodash = require('lodash');
  const uniqueArray = lodash.uniq([1, 2, 2, 3, 3, 4]);
  console.log(uniqueArray); // 输出: [1, 2, 3, 4]
} catch (error) {
  console.log('lodash 包未在白名单中或未安装');
}</pre
    >

    <el-divider />

    <h3>脚本返回格式</h3>
    <p>脚本支持两种返回格式：</p>
    <h4>新格式（推荐）- 完整RSS对象：</h4>
    <pre class="code-block">
return {
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
};</pre
    >
    <h4>旧格式（向后兼容）- 仅文章数组：</h4>
    <p>脚本直接返回文章数组，RSS其他字段使用路由配置：</p>

    <pre class="code-block">
[
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
]</pre
    >

    <el-divider />

    <h3>完整示例</h3>
    <h4>示例1：使用查询参数</h4>
    <p>路由路径：<code>/search</code>，请求：<code>/custom/search?keyword=技术&limit=10</code></p>
    <pre class="code-block">
// 获取路由参数
const { keyword, limit = 10 } = routeParams;

// 构建API URL
const apiUrl = `https://api.example.com/search?q=${encodeURIComponent(keyword)}&limit=${limit}`;

// 发起请求
const response = await utils.fetchApi(apiUrl);
const data = response.data;

// 处理结果
const items = data.items.map(item => ({
  title: item.title,
  link: item.url,
  guid: item.id,
  content: item.description,
  pubDate: utils.parseDate(item.published_at),
  author: item.author?.name,
  image: item.image_url
}));

// 返回结果
return items;</pre
    >

    <h4>示例2：使用动态路径参数</h4>
    <p>
      路由路径：<code>/bilibili/:uid</code>，请求：<code>/custom/bilibili/123456?limit=20</code>
    </p>
    <pre class="code-block">
// 获取路由参数（包括路径参数uid和查询参数limit）
const { uid, limit = 10 } = routeParams;

// 构建API URL，使用路径参数
const apiUrl = `https://api.bilibili.com/x/space/arc/search?mid=${uid}&ps=${limit}`;

// 发起请求
const response = await utils.fetchApi(apiUrl);
const data = response.data;

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
return items;</pre
    >

    <h4>示例3：使用授权信息</h4>
    <p>配置了API Key授权的路由示例：</p>
    <pre class="code-block">
// 获取授权信息
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

// 发起请求（推荐使用utils.fetchApi，会自动应用授权）
const response = await utils.fetchApi(`https://api.example.com/search?q=${keyword}&limit=${limit}`);
const data = response.data;

// 处理结果
return data.articles.map(article => ({
  title: article.title,
  link: article.url,
  content: utils.extractText(article.content),
  pubDate: utils.parseDate(article.publishedAt),
  author: article.author,
  image: article.thumbnail
}));</pre
    >

    <h4>示例4：网页抓取示例</h4>
    <p>抓取网页内容并解析：</p>
    <pre class="code-block">
// 获取网页内容
const response = await utils.fetchApi('https://example.com/blog');
const htmlContent = response.data;

// 注意：html 变量已经包含了页面内容，可以直接使用 $ 解析

// 提取文章列表
const articles = [];
const items = $('.article-item');

items.each((index, element) => {
  const $item = $(element);
  const title = $item.find('.title').text().trim();
  const link = $item.find('a').attr('href');
  const content = $item.find('.summary').text().trim();
  const dateText = $item.find('.date').text().trim();
  const imageSrc = $item.find('img').attr('src');
  
  if (title && link) {
    // 构建绝对URL（如果需要）
    const absoluteLink = link.startsWith('http') ? link : `https://example.com${link}`;
    const absoluteImage = imageSrc && !imageSrc.startsWith('http') ? `https://example.com${imageSrc}` : imageSrc;
    
    articles.push({
      title,
      link: absoluteLink,
      content: content.substring(0, 300), // 截取前300个字符
      pubDate: dateText ? utils.parseDate(dateText) : new Date().toISOString(),
      image: absoluteImage || null
    });
  }
});

// 按日期排序并返回
return articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());</pre
    >

    <div v-if="!compact" class="additional-info">
      <el-divider />
      <h3>性能优化建议</h3>
      <ul>
        <li>
          使用 <code>utils.fetchApi</code> 而不是原生 <code>fetch</code>，可以自动应用授权信息
        </li>
        <li>合理设置脚本超时时间，避免长时间运行</li>
        <li>使用数组的 <code>filter</code> 和 <code>Map</code> 去重，避免重复内容</li>
        <li>使用字符串的 <code>substring</code> 方法截取过长的内容</li>
        <li>适当使用缓存，避免频繁请求同一资源</li>
        <li>处理异常情况，确保脚本稳定运行</li>
      </ul>

      <h3>调试技巧</h3>
      <ul>
        <li>使用 <code>console.log</code> 输出调试信息</li>
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
  compact: false,
});
</script>

<style scoped>
.script-help-content {
  padding: 10px;
  max-height: 70vh;
  overflow-y: auto;
}

.script-help-content h3 {
  color: #409eff;
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
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
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
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
}
</style>
