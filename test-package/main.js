const { formatTitle, generateTestData } = require('./utils/helper');

// 标准入口函数
async function main(context) {
  const { routeParams, console, utils, dayjs } = context;
  
  console.log('脚本包执行开始');
  console.log('接收到的路由参数:', routeParams);
  
  // 从路由参数获取配置
  const limit = parseInt(routeParams.limit) || 5;
  const category = routeParams.category || '默认';
  
  // 使用工具函数
  const title = formatTitle(`${category}测试脚本包`);
  const data = generateTestData(limit);
  
  console.log('标题:', title);
  console.log('生成的测试数据条数:', data.length);
  
  // 返回RSS格式数据
  return {
    title: title,
    description: `这是一个${category}测试脚本包，包含${limit}条测试数据`,
    feed_url: 'https://example.com/test-feed.xml',
    site_url: 'https://example.com',
    generator: 'FeedHub Test Package',
    pubDate: dayjs().toISOString(),
    language: 'zh-CN',
    items: data.map((item, index) => ({
      title: `${category}测试文章 ${index + 1}: ${item.title}`,
      link: `https://example.com/${category.toLowerCase()}/article/${index + 1}`,
      content: item.content,
      contentSnippet: item.content.substring(0, 100) + '...',
      author: '测试作者',
      pubDate: dayjs().subtract(index, 'hour').toISOString(),
      guid: `test-${category}-${index + 1}-${Date.now()}`,
      image: `https://example.com/images/test-${index + 1}.jpg`
    }))
  };
}

// 导出main函数
module.exports = { main };