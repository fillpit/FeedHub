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
      headers: {
        'User-Agent': 'FeedHub/1.0'
      },
      timeout: 10000
    });

    if (!response || !response.data) {
      throw new Error('获取数据失败');
    }

    console.log('成功获取原始数据');

    // 解析数据
    const rawData = response.data;
    const parsedData = parseNewsData(rawData, source);
    
    console.log(`解析得到${parsedData.length}条原始新闻`);

    // 根据分类过滤
    let filteredData = parsedData;
    if (category !== 'all') {
      filteredData = parsedData.filter(item => 
        item.category && item.category.toLowerCase() === category.toLowerCase()
      );
    }

    // 格式化数据
    const formattedItems = formatNewsItems(filteredData, parseInt(limit));
    
    console.log(`最终输出${formattedItems.length}条新闻`);

    // 返回RSS格式数据
    const result = {
      title: `${source}新闻聚合 - ${category}`,
      description: `来自${source}的${category}类最新新闻`,
      feed_url: `https://feedhub.example.com/rss/${source}/${category}`,
      site_url: NEWS_SOURCES[source],
      generator: 'FeedHub News Aggregator',
      pubDate: dayjs().toISOString(),
      language: 'zh-CN',
      items: formattedItems
    };

    console.log('脚本执行成功');
    return result;

  } catch (error) {
    console.error('脚本执行失败:', error.message);
    
    // 返回错误信息而不是抛出异常
    return {
      title: `${source}新闻聚合 - 错误`,
      description: `获取${source}新闻时发生错误: ${error.message}`,
      items: [{
        title: '数据获取失败',
        link: '#',
        content: `错误信息: ${error.message}`,
        pubDate: dayjs().toISOString(),
        guid: `error-${Date.now()}`
      }]
    };
  }
}

// 导出main函数
module.exports = { main };