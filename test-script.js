// 测试脚本文件
function main(params) {
  const { keyword = 'test' } = params;
  
  return {
    title: `测试RSS - ${keyword}`,
    description: '这是一个测试脚本',
    items: [
      {
        title: '测试项目1',
        description: '这是第一个测试项目',
        link: 'https://example.com/1',
        pubDate: new Date().toISOString()
      },
      {
        title: '测试项目2', 
        description: '这是第二个测试项目',
        link: 'https://example.com/2',
        pubDate: new Date().toISOString()
      }
    ]
  };
}

module.exports = { main };