/**
 * 工具函数
 */

/**
 * 格式化日期
 * @param {Date|string} date 日期
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  return new Date(date).toISOString();
}

/**
 * 清理HTML标签
 * @param {string} html HTML字符串
 * @returns {string} 清理后的文本
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * 截取文本
 * @param {string} text 文本
 * @param {number} length 长度
 * @returns {string} 截取后的文本
 */
function truncateText(text, length = 100) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

module.exports = {
  formatDate,
  stripHtml,
  truncateText
};
