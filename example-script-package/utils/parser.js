/**
 * 新闻数据解析工具
 */

/**
 * 解析新闻API返回的数据
 * @param {Object} data - API返回的原始数据
 * @param {string} source - 新闻源类型
 * @returns {Array} 解析后的新闻数据数组
 */
function parseNewsData(data, source = 'default') {
  if (!data) {
    throw new Error('无效的API响应数据');
  }

  // 根据不同的新闻源解析数据
  switch (source) {
    case 'tech':
      return parseTechNews(data);
    case 'sports':
      return parseSportsNews(data);
    case 'business':
      return parseBusinessNews(data);
    default:
      return parseDefaultNews(data);
  }
}

/**
 * 解析默认新闻数据
 */
function parseDefaultNews(data) {
  const articles = data.articles || data.items || [];
  
  return articles.map(article => ({
    id: article.id || generateId(article),
    title: article.title || '无标题',
    content: article.content || article.description || '无内容',
    summary: article.summary || article.excerpt || '',
    url: article.url || article.link || '#',
    author: article.author || '未知作者',
    publishedAt: article.publishedAt || article.pubDate || new Date().toISOString(),
    category: article.category || 'general',
    tags: article.tags || [],
    image: article.image || article.thumbnail || '',
    source: article.source || 'unknown'
  }));
}

/**
 * 解析科技新闻数据
 */
function parseTechNews(data) {
  const articles = data.articles || [];
  
  return articles.map(article => ({
    id: article.id || generateId(article),
    title: article.title || '无标题',
    content: article.content || '无内容',
    summary: article.summary || '',
    url: article.url || '#',
    author: article.author || '科技编辑',
    publishedAt: article.publishedAt || new Date().toISOString(),
    category: 'tech',
    tags: article.tags || ['科技'],
    image: article.image || '',
    source: 'tech-news',
    techCategory: article.techCategory || 'general'
  }));
}

/**
 * 解析体育新闻数据
 */
function parseSportsNews(data) {
  const articles = data.articles || [];
  
  return articles.map(article => ({
    id: article.id || generateId(article),
    title: article.title || '无标题',
    content: article.content || '无内容',
    summary: article.summary || '',
    url: article.url || '#',
    author: article.author || '体育记者',
    publishedAt: article.publishedAt || new Date().toISOString(),
    category: 'sports',
    tags: article.tags || ['体育'],
    image: article.image || '',
    source: 'sports-news',
    sport: article.sport || 'general'
  }));
}

/**
 * 解析商业新闻数据
 */
function parseBusinessNews(data) {
  const articles = data.articles || [];
  
  return articles.map(article => ({
    id: article.id || generateId(article),
    title: article.title || '无标题',
    content: article.content || '无内容',
    summary: article.summary || '',
    url: article.url || '#',
    author: article.author || '财经记者',
    publishedAt: article.publishedAt || new Date().toISOString(),
    category: 'business',
    tags: article.tags || ['商业'],
    image: article.image || '',
    source: 'business-news',
    sector: article.sector || 'general'
  }));
}

/**
 * 生成唯一ID
 */
function generateId(article) {
  const title = article.title || '';
  const url = article.url || '';
  const timestamp = Date.now();
  return `${title.slice(0, 10)}-${url.slice(-10)}-${timestamp}`.replace(/[^a-zA-Z0-9-]/g, '');
}

module.exports = {
  parseNewsData,
  parseDefaultNews,
  parseTechNews,
  parseSportsNews,
  parseBusinessNews
};