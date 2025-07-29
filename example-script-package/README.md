# FeedHub 脚本包示例

这是一个FeedHub动态路由脚本包的示例，演示如何使用模块化的方式组织复杂的脚本逻辑。

## 功能说明

本脚本包通过GitHub API搜索仓库，并将结果格式化为RSS feed。支持自定义搜索关键词和结果数量限制。

## 文件结构

```
example-script-package/
├── index.js              # 主入口文件
├── utils/
│   ├── parser.js         # 数据解析工具
│   └── formatter.js      # 数据格式化工具
├── config/
│   └── constants.js      # 配置常量
├── package.json          # 包信息和参数定义
└── README.md            # 说明文档
```

## 参数说明

- `keyword` (string, 可选): 搜索关键词，默认为 "javascript"
- `limit` (number, 可选): 返回结果数量，默认为 10，最大 50

## 使用方法

1. 将整个文件夹压缩为ZIP文件
2. 在FeedHub动态路由配置中选择"脚本包"类型
3. 上传ZIP文件
4. 设置入口文件为 `index.js`
5. 配置路由参数和路径

## 示例URL

```
# 搜索JavaScript项目
/api/dynamic-route/github-search?keyword=javascript&limit=10

# 搜索Vue.js项目
/api/dynamic-route/github-search?keyword=vue.js&limit=20
```

## 返回格式

脚本返回标准的RSS格式数据：

```javascript
{
  title: "搜索结果标题",
  description: "搜索结果描述",
  link: "API链接",
  items: [
    {
      title: "项目标题",
      link: "项目链接",
      description: "项目描述",
      pubDate: "发布日期",
      author: "作者",
      guid: "唯一标识",
      categories: ["标签1", "标签2"]
    }
  ]
}
```

## 模块说明

### utils/parser.js
负责解析GitHub API返回的原始数据，将不同格式的数据统一转换为标准格式。

### utils/formatter.js
负责将解析后的数据格式化为RSS标准格式，包括文本清理、长度限制等。

### config/constants.js
包含所有配置常量，如API地址、默认参数、错误消息等。

## 扩展建议

1. 添加缓存机制减少API调用
2. 支持更多搜索类型（issues、users等）
3. 添加错误重试逻辑
4. 支持自定义排序方式
5. 添加数据验证和清理

## 注意事项

- GitHub API有速率限制，建议合理设置刷新间隔
- 大型项目建议拆分为更多模块
- 确保所有模块都有适当的错误处理
- 使用相对路径进行模块引用