/**
 * 新闻数据格式化工具模块
 */

/**
 * 格式化新闻数据为RSS项目
 * @param {Array} newsData - 来自多个源的新闻数据
 * @param {Object} options - 格式化选项
 * @returns {Array} 格式化后的RSS项目数组
 */
function formatNewsData(newsData, options = {}) {
  const { limit = 20, sortBy = 'publishedAt', deduplicate = true } = options;
  
  // 合并所有新闻
  let allNews = [];
  newsData.forEach(sourceData => {
    if (sourceData.articles && Array.isArray(sourceData.articles)) {
      const formattedArticles = sourceData.articles.map(article => ({
        ...formatSingleArticle(article),
        source: sourceData.source
      }));
      allNews = allNews.concat(formattedArticles);
    }
  });

  // 去重处理
  if (deduplicate) {
    allNews = deduplicateNews(allNews);
  }

  // 排序
  allNews.sort((a, b) => {
    if (sortBy === 'publishedAt') {
      return new Date(b.pubDate) - new Date(a.pubDate);
    }
    return 0;
  });

  // 限制数量
  return allNews.slice(0, limit);
}

/**
 * 格式化单篇新闻文章
 * @param {Object} article - 新闻文章对象
 * @returns {Object} 格式化后的RSS项目
 */
function formatSingleArticle(article) {
  return {
    title: cleanText(article.title || '无标题'),
    description: formatDescription(article),
    link: article.url || article.link || '',
    guid: generateArticleId(article),
    pubDate: formatDate(article.publishedAt || article.pubDate),
    author: article.author || article.source?.name || '未知',
    category: article.category || '新闻'
  };
}

/**
 * 格式化新闻描述
 * @param {Object} article - 新闻文章对象
 * @returns {string} 格式化后的描述
 */
function formatDescription(article) {
  let description = article.description || article.content || '';
  
  // 清理HTML标签
  description = description.replace(/<[^>]*>/g, '');
  
  // 限制长度
  if (description.length > 300) {
    description = description.substring(0, 300) + '...';
  }
  
  // 添加来源信息
  const source = article.source?.name || '未知来源';
  description += `\n\n来源: ${source}`;
  
  return cleanText(description);
}

/**
 * 新闻去重
 * @param {Array} newsArray - 新闻数组
 * @returns {Array} 去重后的新闻数组
 */
function deduplicateNews(newsArray) {
  const seen = new Set();
  return newsArray.filter(article => {
    // 基于标题和链接进行去重
    const key = `${article.title}-${article.link}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 生成文章唯一ID
 * @param {Object} article - 新闻文章对象
 * @returns {string} 唯一ID
 */
function generateArticleId(article) {
  const title = article.title || '';
  const url = article.url || article.link || '';
  const timestamp = article.publishedAt || Date.now();
  
  // 简单的哈希函数
  const hash = (title + url + timestamp).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return `news-${Math.abs(hash)}`;
}

/**
 * 清理和转义文本内容
 * @param {string} text - 原始文本
 * @returns {string} 清理后的文本
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期
 * @returns {string} RFC 2822格式的日期字符串
 */
function formatDate(date) {
  if (!date) return new Date().toUTCString();
  
  try {
    return new Date(date).toUTCString();
  } catch (error) {
    return new Date().toUTCString();
  }
}

module.exports = {
  formatNewsData,
  formatSingleArticle,
  formatDescription,
  deduplicateNews,
  generateArticleId,
  cleanText,
  formatDate
};