/**
 * 新闻数据获取工具模块
 */

const { validateApiResponse } = require('./validator');

/**
 * 从多个新闻源并发获取数据
 * @param {Array} sources - 新闻源配置数组
 * @param {Object} options - 获取选项
 * @returns {Promise<Array>} 新闻数据数组
 */
async function fetchFromMultipleSources(sources, options = {}) {
  const { limit = 10, category, language, context } = options;
  
  // 并发获取所有新闻源的数据
  const promises = sources.map(source => 
    fetchFromSingleSource(source, { limit, category, language, context })
      .catch(error => {
        console.warn(`获取新闻源 ${source.name} 数据失败:`, error.message);
        return { source: source.name, articles: [], error: error.message };
      })
  );
  
  const results = await Promise.all(promises);
  
  // 过滤掉失败的请求，但保留部分成功的结果
  return results.filter(result => result.articles && result.articles.length > 0);
}

/**
 * 从单个新闻源获取数据
 * @param {Object} source - 新闻源配置
 * @param {Object} options - 获取选项
 * @returns {Promise<Object>} 新闻数据
 */
async function fetchFromSingleSource(source, options = {}) {
  const { limit = 10, category, language, context } = options;
  
  try {
    let url = source.url;
    
    // 根据新闻源类型构建请求URL
    switch (source.type) {
      case 'api':
        url = buildApiUrl(source, { limit, category, language });
        break;
      case 'rss':
        url = buildRssUrl(source, { limit, category, language });
        break;
      default:
        throw new Error(`不支持的新闻源类型: ${source.type}`);
    }
    
    // 发起请求
    const response = await context.fetchApi(url, {
      headers: {
        'User-Agent': 'FeedHub-NewsAggregator/1.0',
        'Accept': source.type === 'rss' ? 'application/rss+xml, application/xml' : 'application/json',
        ...source.headers
      },
      timeout: source.timeout || 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // 解析响应数据
    let data;
    if (source.type === 'rss') {
      const xmlText = await response.text();
      data = parseRssData(xmlText, source);
    } else {
      data = await response.json();
      data = parseApiData(data, source);
    }
    
    // 验证数据格式
    const validation = validateApiResponse(data, source.type);
    if (!validation.valid) {
      throw new Error(`数据格式验证失败: ${validation.message}`);
    }
    
    return {
      source: source.name,
      articles: data.articles || data.items || [],
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`获取新闻源 ${source.name} 数据失败:`, error);
    throw error;
  }
}

/**
 * 构建API请求URL
 * @param {Object} source - 新闻源配置
 * @param {Object} params - 请求参数
 * @returns {string} 完整的请求URL
 */
function buildApiUrl(source, params) {
  const { limit, category, language } = params;
  const url = new URL(source.url);
  
  // 添加通用参数
  if (limit) url.searchParams.set('pageSize', limit.toString());
  if (category && category !== 'general') url.searchParams.set('category', category);
  if (language && language !== 'all') url.searchParams.set('language', language);
  
  // 添加API密钥（如果配置了）
  if (source.apiKey) {
    url.searchParams.set('apiKey', source.apiKey);
  }
  
  // 添加自定义参数
  if (source.params) {
    Object.entries(source.params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

/**
 * 构建RSS请求URL
 * @param {Object} source - 新闻源配置
 * @param {Object} params - 请求参数
 * @returns {string} 完整的请求URL
 */
function buildRssUrl(source, params) {
  // RSS通常不需要额外参数，直接返回配置的URL
  return source.url;
}

/**
 * 解析API响应数据
 * @param {Object} data - API响应数据
 * @param {Object} source - 新闻源配置
 * @returns {Object} 标准化的数据格式
 */
function parseApiData(data, source) {
  // 根据不同的API格式进行解析
  if (source.parser && typeof source.parser === 'function') {
    return source.parser(data);
  }
  
  // 默认解析逻辑（适用于NewsAPI等标准格式）
  if (data.articles) {
    return {
      articles: data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        publishedAt: article.publishedAt,
        author: article.author,
        source: article.source
      }))
    };
  }
  
  return data;
}

/**
 * 解析RSS数据
 * @param {string} xmlText - RSS XML文本
 * @param {Object} source - 新闻源配置
 * @returns {Object} 标准化的数据格式
 */
function parseRssData(xmlText, source) {
  // 简单的RSS解析（实际项目中建议使用专门的RSS解析库）
  const items = [];
  
  try {
    // 提取RSS项目
    const itemMatches = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    
    if (itemMatches) {
      itemMatches.forEach(itemXml => {
        const item = {
          title: extractXmlValue(itemXml, 'title'),
          description: extractXmlValue(itemXml, 'description'),
          url: extractXmlValue(itemXml, 'link'),
          publishedAt: extractXmlValue(itemXml, 'pubDate'),
          author: extractXmlValue(itemXml, 'author') || source.name,
          source: { name: source.name }
        };
        
        if (item.title) {
          items.push(item);
        }
      });
    }
  } catch (error) {
    console.error('RSS解析失败:', error);
  }
  
  return { items };
}

/**
 * 从XML中提取指定标签的值
 * @param {string} xml - XML文本
 * @param {string} tag - 标签名
 * @returns {string} 标签值
 */
function extractXmlValue(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  
  if (match && match[1]) {
    // 清理CDATA和HTML标签
    return match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
  
  return '';
}

module.exports = {
  fetchFromMultipleSources,
  fetchFromSingleSource,
  buildApiUrl,
  buildRssUrl,
  parseApiData,
  parseRssData,
  extractXmlValue
};