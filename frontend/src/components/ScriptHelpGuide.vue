<template>
  <div class="script-help-guide">
    <el-popover
      placement="right"
      :width="500"
      trigger="click"
      popper-class="script-help-popover"
    >
      <template #reference>
        <el-button type="primary" size="small" plain>
          <el-icon><QuestionFilled /></el-icon>
          脚本工具说明
        </el-button>
      </template>
      
      <div class="help-content">
        <h4>可用工具函数</h4>
        <el-divider></el-divider>
        
        <div class="tool-item">
          <h5>fetch(url, options)</h5>
          <p>发送HTTP请求获取数据</p>
          <div class="code-example">
            <pre><code>// 基本用法
const response = await fetch('https://example.com');
const html = await response.text();

// 带选项的用法
const response = await fetch('https://api.example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});
const data = await response.json();</code></pre>
          </div>
        </div>
        
        <div class="tool-item">
          <h5>parseHTML(html)</h5>
          <p>解析HTML字符串为DOM对象，便于使用选择器</p>
          <div class="code-example">
            <pre><code>const dom = parseHTML(html);
const title = dom.querySelector('h1').textContent;</code></pre>
          </div>
        </div>
        
        <div class="tool-item">
          <h5>extractItems(selector, options)</h5>
          <p>从HTML中提取多个项目</p>
          <div class="code-example">
            <pre><code>// 从HTML中提取所有文章
const articles = extractItems({
  container: '.article-list .article',
  title: '.article-title',
  link: 'a.article-link',
  content: '.article-content',
  date: '.article-date',
  image: '.article-image img'
});</code></pre>
          </div>
        </div>
        
        <div class="tool-item">
          <h5>formatDate(dateString, format)</h5>
          <p>格式化日期字符串</p>
          <div class="code-example">
            <pre><code>// 将日期字符串转换为标准格式
const isoDate = formatDate('2023年5月1日', 'YYYY-MM-DD');</code></pre>
          </div>
        </div>
        
        <div class="tool-item">
          <h5>log(message)</h5>
          <p>输出日志信息，便于调试</p>
          <div class="code-example">
            <pre><code>log('正在处理数据...');
log('提取到的标题:', title);</code></pre>
          </div>
        </div>
        
        <h4>脚本返回格式</h4>
        <el-divider></el-divider>
        <p>脚本支持两种返回格式：</p>
        <h5>新格式（推荐）- 完整RSS对象：</h5>
        <div class="code-example">
          <pre><code>return {
  title: "RSS频道标题",
  description: "RSS频道描述", 
  site_url: "网站地址",
  language: "zh-CN",
  items: [文章数组]
};</code></pre>
        </div>
        <h5>旧格式（向后兼容）- 仅文章数组：</h5>
        <p>脚本直接返回文章数组，RSS其他字段使用路由配置：</p>
        <div class="code-example">
          <pre><code>return [
  {
    title: '文章标题',
    link: 'https://example.com/article1',
    content: '文章内容...',
    author: '作者名称',  // 可选
    date: '2023-05-01T12:00:00Z',  // ISO格式日期
    image: 'https://example.com/image.jpg'  // 可选
  },
  // 更多文章...
];</code></pre>
        </div>
        
        <h4>完整示例</h4>
        <el-divider></el-divider>
        <div class="code-example">
          <pre><code>async function run() {
  // 获取网页内容
  const response = await fetch('https://example.com/blog');
  const html = await response.text();
  
  // 解析HTML
  const dom = parseHTML(html);
  
  // 提取文章列表
  const articles = [];
  const items = dom.querySelectorAll('.article-item');
  
  for (const item of items) {
    const title = item.querySelector('.title').textContent.trim();
    const link = item.querySelector('a').href;
    const content = item.querySelector('.summary').textContent.trim();
    const dateStr = item.querySelector('.date').textContent.trim();
    const date = formatDate(dateStr, 'YYYY-MM-DD');
    
    articles.push({
      title,
      link,
      content,
      date
    });
  }
  
  return articles;
}</code></pre>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue';
</script>

<style scoped>
.script-help-guide {
  margin: 5px 0;
  display: inline-block;
}

.help-content {
  padding: 10px;
  max-height: 500px;
  overflow-y: auto;
}

.tool-item {
  margin-bottom: 20px;
}

.tool-item h5 {
  font-weight: bold;
  margin-bottom: 5px;
  color: #409EFF;
}

.code-example {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
  margin-top: 5px;
  overflow-x: auto;
}

.code-example pre {
  margin: 0;
}

.code-example code {
  font-family: 'Courier New', Courier, monospace;
  white-space: pre;
}
</style>

<style>
/* 全局样式，确保弹出框有足够的宽度和高度 */
.script-help-popover .el-popover__title {
  font-weight: bold;
  color: #409EFF;
}

.script-help-popover {
  max-width: 90vw;
  max-height: 80vh;
}
</style>