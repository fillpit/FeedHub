/**
 * 动态路由脚本主文件
 * 这是您的自定义脚本入口文件
 */

/**
 * 主函数 - 脚本的入口点
 * @param {Object} context - 脚本执行上下文
 * @returns {Object|Array} RSS格式的数据或文章数组
 */
async function main(context) {
  const { routeParams, utils, auth, console, dayjs, require } = context;
  
  try {
    // 在这里编写您的脚本逻辑
    console.log('脚本开始执行，路由参数:', routeParams);
    
    // 示例：返回简单的文章列表
    const items = [
      {
        title: '示例文章1',
        link: 'https://example.com/article1',
        content: '这是示例文章的内容',
        author: '作者',
        pubDate: dayjs().toISOString(),
      },
      {
        title: '示例文章2', 
        link: 'https://example.com/article2',
        content: '这是另一篇示例文章的内容',
        author: '作者',
        pubDate: dayjs().subtract(1, 'day').toISOString(),
      }
    ];
    
    // 返回完整的RSS格式数据（推荐）
    return {
      title: '我的动态路由RSS',
      description: '这是一个动态生成的RSS源',
      link: 'https://example.com',
      items: items
    };
    
  } catch (error) {
    console.error('脚本执行失败:', error);
    throw error;
  }
}

// 导出主函数
module.exports = { main };
