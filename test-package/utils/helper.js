// 工具函数模块
function formatTitle(title, keyword) {
  return `${title} - ${keyword}`;
}

function generateTestData(count, keyword) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: formatTitle(`测试项目 ${i + 1}`, keyword),
    description: `这是第${i + 1}个测试项目，关键词：${keyword}`,
    timestamp: Date.now() - i * 3600000
  }));
}

module.exports = {
  formatTitle,
  generateTestData
};