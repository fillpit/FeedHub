/**
 * 数据格式化工具模块
 */

/**
 * 格式化GitHub API响应数据为RSS项目
 * @param {Object} apiData - GitHub API响应数据
 * @param {Object} params - 用户参数
 * @returns {Array} 格式化后的RSS项目数组
 */
function formatData(apiData, params) {
  if (!apiData || !apiData.items || !Array.isArray(apiData.items)) {
    return [];
  }

  return apiData.items.map(repo => ({
    title: repo.full_name,
    description: formatDescription(repo),
    link: repo.html_url,
    guid: `github-repo-${repo.id}`,
    pubDate: new Date(repo.updated_at).toUTCString(),
    author: repo.owner.login,
    category: repo.language || 'Unknown'
  }));
}

/**
 * 格式化仓库描述
 * @param {Object} repo - GitHub仓库对象
 * @returns {string} 格式化后的描述
 */
function formatDescription(repo) {
  let description = repo.description || '无描述';
  
  // 添加统计信息
  const stats = [
    `⭐ ${repo.stargazers_count} stars`,
    `🍴 ${repo.forks_count} forks`,
    `📝 ${repo.language || 'Unknown'} language`
  ];
  
  if (repo.topics && repo.topics.length > 0) {
    stats.push(`🏷️ Topics: ${repo.topics.slice(0, 3).join(', ')}`);
  }
  
  return `${description}\n\n${stats.join(' | ')}`;
}

/**
 * 清理和转义HTML内容
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
    .replace(/'/g, '&#39;');
}

module.exports = {
  formatData,
  formatDescription,
  cleanText
};