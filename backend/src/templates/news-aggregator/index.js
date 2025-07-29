/**
 * 新闻聚合脚本包模板
 * 从多个新闻源聚合新闻并生成RSS Feed
 */

// 导入工具模块
const { formatNewsData } = require('./utils/formatter');
const { validateNewsParams } = require('./utils/validator');
const { fetchFromMultipleSources } = require('./utils/fetcher');
const config = require('./config/sources');

/**
 * 主函数 - 新闻聚合脚本包的入口点
 * @param {Object} params - 路由参数
 * @param {Object} context - 脚本执行上下文
 * @returns {Object} RSS格式的新闻数据
 */
async function main(params, context) {
  try {
    // 1. 验证参数
    const validationResult = validateNewsParams(params);
    if (!validationResult.valid) {
      throw new Error(`参数验证失败: ${validationResult.message}`);
    }

    // 2. 获取配置
    const { sources, defaultLimit, categories } = config;
    const limit = Math.min(params.limit || defaultLimit, 50);
    const category = params.category || 'general';
    const language = params.language || 'zh';

    // 3. 筛选新闻源
    const selectedSources = sources.filter(source => {
      if (category !== 'general' && !source.categories.includes(category)) {
        return false;
      }
      if (language !== 'all' && !source.languages.includes(language)) {
        return false;
      }
      return source.enabled;
    });

    if (selectedSources.length === 0) {
      throw new Error(`没有找到符合条件的新闻源: category=${category}, language=${language}`);
    }

    // 4. 并发获取新闻数据
    const newsData = await fetchFromMultipleSources(selectedSources, {
      limit: Math.ceil(limit / selectedSources.length),
      category,
      language,
      context
    });

    // 5. 格式化和排序
    const formattedNews = formatNewsData(newsData, {
      limit,
      sortBy: params.sortBy || 'publishedAt',
      deduplicate: params.deduplicate !== false
    });

    // 6. 返回RSS格式数据
    return {
      title: `新闻聚合 - ${categories[category] || category}`,
      description: `来自多个新闻源的${categories[category] || category}新闻聚合`,
      link: 'https://example.com/news',
      language: language,
      lastBuildDate: new Date().toUTCString(),
      generator: 'FeedHub News Aggregator',
      items: formattedNews
    };
    
  } catch (error) {
    console.error('新闻聚合脚本执行失败:', error);
    throw error;
  }
}

// 导出主函数
module.exports = main;