/**
 * 新闻数据格式化工具
 */

/**
 * 格式化新闻数据为RSS项目格式
 * @param {Array} newsItems - 解析后的新闻数据数组
 * @param {number} limit - 限制数量
 * @returns {Array} RSS格式的项目数组
 */
function formatNewsItems(newsItems, limit = 10) {
  if (!Array.isArray(newsItems)) {
    console.warn('formatNewsItems: 输入不是数组，返回空数组');
    return [];
  }

  return newsItems
    .slice(0, parseInt(limit))
    .map(formatSingleNewsItem)
    .filter(item => item !== null);
}

/**
 * 格式化单个新闻项目
 * @param {Object} newsItem - 单个新闻数据项
 * @returns {Object|null} RSS格式的项目
 */
function formatSingleNewsItem(newsItem) {
  try {
    // 基本字段验证
    if (!newsItem || !newsItem.title) {
      console.warn('formatSingleNewsItem: 新闻项目缺少必要字段');
      return null;
    }

    return {
      title: sanitizeText(newsItem.title),
      link: newsItem.url || '#',
      guid: newsItem.id || newsItem.url || generateGuid(),
      content: formatNewsContent(newsItem),
      contentSnippet: generateSnippet(newsItem.summary || newsItem.content || ''),
      author: newsItem.author || '未知作者',
      pubDate: formatDate(newsItem.publishedAt),
      categories: formatCategories(newsItem.tags),
      image: newsItem.image || ''
    };
  } catch (error) {
    console.error('formatSingleNewsItem 错误:', error.message);
    return null;
  }
}

/**
 * 格式化新闻内容
 * @param {Object} newsItem - 新闻数据项
 * @returns {string} 格式化后的内容
 */
function formatNewsContent(newsItem) {
  let content = '';
  
  // 添加摘要
  if (newsItem.summary) {
    content += `<p><strong>摘要:</strong> ${sanitizeHtml(newsItem.summary)}</p>`;
  }
  
  // 添加正文内容
  if (newsItem.content) {
    content += `<div class="content">${sanitizeHtml(newsItem.content)}</div>`;
  }
  
  // 添加分类信息
  if (newsItem.category) {
    content += `<p><strong>分类:</strong> ${sanitizeText(newsItem.category)}</p>`;
  }
  
  // 添加来源信息
  if (newsItem.source) {
    content += `<p><strong>来源:</strong> ${sanitizeText(newsItem.source)}</p>`;
  }
  
  // 添加标签
  if (newsItem.tags && newsItem.tags.length > 0) {
    const tagList = newsItem.tags.map(tag => `<span class="tag">${sanitizeText(tag)}</span>`).join(' ');
    content += `<p><strong>标签:</strong> ${tagList}</p>`;
  }
  
  // 添加图片
  if (newsItem.image) {
    content += `<p><img src="${newsItem.image}" alt="新闻图片" style="max-width: 100%; height: auto;"/></p>`;
  }
  
  // 添加原文链接
  if (newsItem.url) {
    content += `<p><a href="${newsItem.url}" target="_blank">阅读原文</a></p>`;
  }
  
  return content || '<p>无内容</p>';
}

/**
 * 生成内容摘要
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 摘要文本
 */
function generateSnippet(text, maxLength = 200) {
  if (!text || typeof text !== 'string') {
    return '无摘要';
  }
  
  // 移除HTML标签
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  
  if (cleanText.length <= maxLength) {
    return cleanText;
  }
  
  return cleanText.substring(0, maxLength).trim() + '...';
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
  if (!dateString) {
    return new Date().toISOString();
  }
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  } catch (error) {
    console.warn('日期格式化失败:', error.message);
    return new Date().toISOString();
  }
}

/**
 * 格式化分类
 * @param {Array} tags - 标签数组
 * @returns {Array} 分类数组
 */
function formatCategories(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  
  return tags
    .filter(tag => tag && typeof tag === 'string')
    .map(tag => sanitizeText(tag))
    .slice(0, 5); // 限制最多5个分类
}

/**
 * 清理文本内容
 * @param {string} text - 原始文本
 * @returns {string} 清理后的文本
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/[<>"'&]/g, match => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return entities[match] || match;
    })
    .trim();
}

/**
 * 清理HTML内容
 * @param {string} html - HTML内容
 * @returns {string} 清理后的HTML
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // 移除危险的标签和属性
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * 生成GUID
 * @returns {string} GUID
 */
function generateGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = {
  formatNewsItems,
  formatSingleNewsItem,
  formatNewsContent,
  generateSnippet,
  formatDate,
  formatCategories,
  sanitizeText,
  sanitizeHtml
};