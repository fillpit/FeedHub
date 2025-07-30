/**
 * 工具函数模块
 * 在这里定义可复用的工具函数
 */

/**
 * 格式化日期
 * @param {Date|string} date 日期
 * @param {string} format 格式
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  // 实现日期格式化逻辑
  return new Date(date).toISOString();
}

/**
 * 安全获取对象属性
 * @param {Object} obj 对象
 * @param {string} path 属性路径
 * @param {any} defaultValue 默认值
 * @returns {any} 属性值或默认值
 */
function safeGet(obj, path, defaultValue = null) {
  try {
    return path.split('.').reduce((current, key) => current && current[key], obj) || defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 清理HTML标签
 * @param {string} html HTML字符串
 * @returns {string} 纯文本
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

module.exports = {
  formatDate,
  safeGet,
  stripHtml
};
