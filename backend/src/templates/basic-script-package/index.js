/**
 * 基础脚本包模板
 * 这是一个简单的示例，展示如何创建一个基本的动态路由脚本包
 */

// 导入工具模块
const { formatData } = require('./utils/formatter');
const { validateParams } = require('./utils/validator');
const config = require('./config/settings');

/**
 * 主函数 - 脚本包的入口点
 * @param {Object} params - 路由参数
 * @param {Object} context - 脚本执行上下文
 * @returns {Object} RSS格式的数据
 */
async function main(params, context) {
  try {
    // 1. 验证参数
    const validationResult = validateParams(params);
    if (!validationResult.valid) {
      throw new Error(`参数验证失败: ${validationResult.message}`);
    }

    // 2. 获取配置
    const { apiUrl, defaultLimit } = config;
    const limit = params.limit || defaultLimit;
    const keyword = params.keyword || 'javascript';

    // 3. 构建API请求URL
    const requestUrl = `${apiUrl}?q=${encodeURIComponent(keyword)}&per_page=${limit}&sort=updated`;
    
    // 4. 发起API请求
    const response = await context.fetchApi(requestUrl, {
      headers: {
        'User-Agent': 'FeedHub-ScriptPackage/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 5. 格式化数据
    const formattedData = formatData(data, params);
    
    // 6. 返回RSS格式数据
    return {
      title: `GitHub搜索结果: ${keyword}`,
      description: `搜索关键词"${keyword}"的GitHub仓库结果`,
      link: `https://github.com/search?q=${encodeURIComponent(keyword)}`,
      items: formattedData
    };
    
  } catch (error) {
    console.error('脚本执行失败:', error);
    throw error;
  }
}

// 导出主函数
module.exports = main;