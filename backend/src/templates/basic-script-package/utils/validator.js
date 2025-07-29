/**
 * 参数验证工具模块
 */

/**
 * 验证路由参数
 * @param {Object} params - 用户传入的参数
 * @returns {Object} 验证结果 { valid: boolean, message?: string }
 */
function validateParams(params) {
  // 检查参数是否为对象
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      message: '参数必须是一个对象'
    };
  }

  // 验证keyword参数
  if (params.keyword !== undefined) {
    if (typeof params.keyword !== 'string') {
      return {
        valid: false,
        message: 'keyword参数必须是字符串类型'
      };
    }
    
    if (params.keyword.length === 0) {
      return {
        valid: false,
        message: 'keyword参数不能为空'
      };
    }
    
    if (params.keyword.length > 100) {
      return {
        valid: false,
        message: 'keyword参数长度不能超过100个字符'
      };
    }
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

  // 验证sort参数（如果提供）
  if (params.sort !== undefined) {
    const validSorts = ['stars', 'forks', 'updated', 'created'];
    if (!validSorts.includes(params.sort)) {
      return {
        valid: false,
        message: `sort参数必须是以下值之一: ${validSorts.join(', ')}`
      };
    }
  }

  return { valid: true };
}

/**
 * 验证API响应数据
 * @param {Object} data - API响应数据
 * @returns {Object} 验证结果
 */
function validateApiResponse(data) {
  if (!data) {
    return {
      valid: false,
      message: 'API响应数据为空'
    };
  }

  if (!data.items || !Array.isArray(data.items)) {
    return {
      valid: false,
      message: 'API响应数据格式错误：缺少items数组'
    };
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
  validateParams,
  validateApiResponse,
  safeJsonParse
};