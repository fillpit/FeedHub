
// 标准入口函数
async function main(context) {
  const { console } = context;

  console.log('进入脚本了')
  
  return {
    title: "RSS频道标题",
    description: "RSS频道描述",
    site_url: "网站地址",
    language: "zh-CN",
    items: [
      {
        title: "文章标题",
        link: "文章链接",
        content: "文章内容",
        author: "作者",
        pubDate: "发布时间",
        image: "封面图片",
        guid: "唯一标识符" // 可选，默认使用link
      }
    ]
  };
}

// 导出main函数
module.exports = { main };