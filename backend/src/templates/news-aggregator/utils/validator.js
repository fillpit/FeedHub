/**
 * 新闻聚合参数验证工具模块
 */

/**
 * 验证新闻聚合参数
 * @param {Object} params - 用户传入的参数
 * @returns {Object} 验证结果 { valid: boolean, message?: string }
 */
function validateNewsParams(params) {
  // 检查参数是否为对象
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      message: '参数必须是一个对象'
    };
  }

  // 验证limit参数
  if (params.limit !== undefined) {
    const limit = parseInt(params.limit);
    
    if (isNaN(limit)) {
      return {
        valid: false,
        message: 'limit参数必须是数字'
      };
    }
    
    if (limit < 1 || limit > 100) {
      return {
        valid: false,
        message: 'limit参数必须在1-100之间'
      };
    }
  }

  // 验证category参数
  if (params.category !== undefined) {
    const validCategories = [
      'general', 'business', 'entertainment', 'health',
      'science', 'sports', 'technology', 'politics'
    ];
    
    if (!validCategories.includes(params.category)) {
      return {
        valid: false,
        message: `category参数必须是以下值之一: ${validCategories.join(', ')}`
      };
    }
  }

  // 验证language参数
  if (params.language !== undefined) {
    const validLanguages = ['zh', 'en', 'all'];
    
    if (!validLanguages.includes(params.language)) {
      return {
        valid: false,
        message: `language参数必须是以下值之一: ${validLanguages.join(', ')}`
      };
    }
  }

  // 验证sortBy参数
  if (params.sortBy !== undefined) {
    const validSorts = ['publishedAt', 'popularity', 'relevancy'];
    
    if (!validSorts.includes(params.sortBy)) {
      return {
        valid: false,
        message: `sortBy参数必须是以下值之一: ${validSorts.join(', ')}`
      };
    }
  }

  // 验证deduplicate参数
  if (params.deduplicate !== undefined) {
    if (typeof params.deduplicate !== 'boolean' && 
        params.deduplicate !== 'true' && 
        params.deduplicate !== 'false') {
      return {
        valid: false,
        message: 'deduplicate参数必须是布尔值'
      };
    }
  }

  return { valid: true };
}

/**
 * 验证新闻源配置
 * @param {Object} source - 新闻源配置
 * @returns {Object} 验证结果
 */
function validateNewsSource(source) {
  if (!source || typeof source !== 'object') {
    return {
      valid: false,
      message: '新闻源配置必须是一个对象'
    };
  }

  // 必需字段检查
  const requiredFields = ['id', 'name', 'url', 'type'];
  for (const field of requiredFields) {
    if (!source[field]) {
      return {
        valid: false,
        message: `新闻源配置缺少必需字段: ${field}`
      };
    }
  }

  // URL格式检查
  try {
    new URL(source.url);
  } catch (error) {
    return {
      valid: false,
      message: '新闻源URL格式无效'
    };
  }

  // 类型检查
  const validTypes = ['rss', 'api', 'html'];
  if (!validTypes.includes(source.type)) {
    return {
      valid: false,
      message: `新闻源类型必须是以下值之一: ${validTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * 验证API响应数据
 * @param {Object} data - API响应数据
 * @param {string} sourceType - 数据源类型
 * @returns {Object} 验证结果
 */
function validateApiResponse(data, sourceType = 'api') {
  if (!data) {
    return {
      valid: false,
      message: 'API响应数据为空'
    };
  }

  switch (sourceType) {
    case 'rss':
      if (!data.items || !Array.isArray(data.items)) {
        return {
          valid: false,
          message: 'RSS数据格式错误：缺少items数组'
        };
      }
      break;
      
    case 'api':
      if (!data.articles || !Array.isArray(data.articles)) {
        return {
          valid: false,
          message: 'API数据格式错误：缺少articles数组'
        };
      }
      break;
      
    default:
      // 通用验证
      if (typeof data !== 'object') {
        return {
          valid: false,
          message: '响应数据必须是对象格式'
        };
      }
  }

  return { valid: true };
}

/**
 * 安全地解析JSON字符串
 * @param {string} jsonString - JSON字符串
 * @returns {Object} 解析结果 { success: boolean, data?: any, error?: string }
 */
function safeJsonParse(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  validateNewsParams,
  validateNewsSource,
  validateApiResponse,
  safeJsonParse
};