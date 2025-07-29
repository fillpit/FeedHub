/**
 * 脚本包配置文件
 */

module.exports = {
  // API配置
  apiUrl: 'https://api.github.com/search/repositories',
  
  // 默认参数
  defaultLimit: 10,
  defaultSort: 'updated',
  defaultKeyword: 'javascript',
  
  // 请求配置
  timeout: 30000, // 30秒超时
  retryCount: 3,
  retryDelay: 1000, // 1秒重试延迟
  
  // 缓存配置
  cacheEnabled: true,
  cacheTtl: 300, // 5分钟缓存
  
  // 限制配置
  maxLimit: 100,
  maxKeywordLength: 100,
  
  // 支持的排序方式
  supportedSorts: ['stars', 'forks', 'updated', 'created'],
  
  // 支持的语言过滤
  supportedLanguages: [
    'javascript', 'typescript', 'python', 'java', 'go',
    'rust', 'cpp', 'c', 'php', 'ruby', 'swift', 'kotlin'
  ],
  
  // RSS配置
  rss: {
    generator: 'FeedHub Script Package',
    language: 'zh-CN',
    ttl: 60, // RSS缓存时间（分钟）
    maxItems: 50 // RSS最大项目数
  },
  
  // 错误消息
  errorMessages: {
    invalidParams: '参数验证失败',
    apiError: 'API请求失败',
    timeout: '请求超时',
    networkError: '网络错误',
    parseError: '数据解析失败'
  }
};