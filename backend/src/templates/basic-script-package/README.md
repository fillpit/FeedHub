# 基础脚本包模板

这是一个FeedHub脚本包的基础模板，展示了如何创建一个完整的脚本包来生成RSS Feed。

## 功能说明

本脚本包通过GitHub API搜索仓库，并将结果格式化为RSS Feed格式返回。

## 文件结构

```
basic-script-package/
├── index.js              # 主入口文件
├── package.json          # 包配置文件
├── README.md            # 说明文档
├── config/
│   └── settings.js      # 配置文件
└── utils/
    ├── formatter.js     # 数据格式化工具
    └── validator.js     # 参数验证工具
```

## 参数说明

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|---------|
| keyword | string | 否 | "javascript" | 搜索关键词 |
| limit | number | 否 | 10 | 返回结果数量（1-100） |
| sort | string | 否 | "updated" | 排序方式：stars, forks, updated, created |

## 使用示例

### 基础用法
```
/api/dynamic-route/your-route-key
```

### 自定义搜索
```
/api/dynamic-route/your-route-key?keyword=vue&limit=20&sort=stars
```

### 搜索特定语言
```
/api/dynamic-route/your-route-key?keyword=machine+learning+language:python&limit=15
```

## 返回格式

返回标准的RSS 2.0 格式，包含以下字段：

- **title**: 仓库全名（owner/repo）
- **description**: 仓库描述 + 统计信息
- **link**: 仓库GitHub链接
- **guid**: 唯一标识符
- **pubDate**: 最后更新时间
- **author**: 仓库所有者
- **category**: 主要编程语言

## 模块说明

### index.js
主入口文件，负责：
- 参数验证
- API请求
- 数据处理
- 返回RSS格式数据

### utils/formatter.js
数据格式化工具，包含：
- `formatData()`: 格式化GitHub API响应
- `formatDescription()`: 格式化仓库描述
- `cleanText()`: 清理HTML内容

### utils/validator.js
参数验证工具，包含：
- `validateParams()`: 验证用户参数
- `validateApiResponse()`: 验证API响应
- `safeJsonParse()`: 安全JSON解析

### config/settings.js
配置文件，包含：
- API配置
- 默认参数
- 限制设置
- 错误消息

## 开发指南

### 1. 修改API源
在 `config/settings.js` 中修改 `apiUrl` 来使用不同的API。

### 2. 添加新参数
1. 在 `package.json` 的 `feedhub.parameters` 中添加参数定义
2. 在 `utils/validator.js` 中添加验证逻辑
3. 在 `index.js` 中使用新参数

### 3. 自定义数据格式
修改 `utils/formatter.js` 中的格式化函数来改变输出格式。

### 4. 错误处理
在 `config/settings.js` 中定义错误消息，在代码中使用统一的错误处理。

## 最佳实践

1. **参数验证**: 始终验证用户输入
2. **错误处理**: 提供清晰的错误信息
3. **配置分离**: 将配置与代码分离
4. **模块化**: 将功能拆分为独立模块
5. **文档完整**: 提供详细的使用说明

## 注意事项

- GitHub API有速率限制，建议添加缓存机制
- 大量请求时考虑使用GitHub Token
- 注意处理网络超时和错误情况
- 遵循RSS 2.0规范确保兼容性