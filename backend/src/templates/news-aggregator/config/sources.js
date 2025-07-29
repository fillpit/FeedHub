/**
 * 新闻聚合配置文件
 */

module.exports = {
  // 默认参数
  defaultLimit: 20,
  maxLimit: 100,
  
  // 新闻分类映射
  categories: {
    'general': '综合新闻',
    'business': '商业财经',
    'entertainment': '娱乐',
    'health': '健康',
    'science': '科技科学',
    'sports': '体育',
    'technology': '科技',
    'politics': '政治'
  },
  
  // 支持的语言
  languages: {
    'zh': '中文',
    'en': '英文',
    'all': '全部'
  },
  
  // 新闻源配置
  sources: [
    {
      id: 'newsapi-general',
      name: 'NewsAPI综合',
      url: 'https://newsapi.org/v2/top-headlines',
      type: 'api',
      enabled: true,
      categories: ['general', 'business', 'technology', 'science'],
      languages: ['en'],
      timeout: 10000,
      headers: {
        'X-API-Key': 'YOUR_NEWSAPI_KEY' // 需要替换为实际的API密钥
      },
      params: {
        country: 'us'
      }
    },
    {
      id: 'rss-tech',
      name: '科技RSS源',
      url: 'https://feeds.feedburner.com/TechCrunch',
      type: 'rss',
      enabled: true,
      categories: ['technology', 'science'],
      languages: ['en'],
      timeout: 8000
    },
    {
      id: 'rss-news',
      name: '综合新闻RSS',
      url: 'https://rss.cnn.com/rss/edition.rss',
      type: 'rss',
      enabled: true,
      categories: ['general', 'politics'],
      languages: ['en'],
      timeout: 8000
    },
    {
      id: 'example-chinese',
      name: '中文新闻示例',
      url: 'https://example.com/api/news',
      type: 'api',
      enabled: false, // 默认禁用示例源
      categories: ['general', 'business'],
      languages: ['zh'],
      timeout: 10000,
      parser: function(data) {
        // 自定义解析函数示例
        return {
          articles: data.data?.map(item => ({
            title: item.title,
            description: item.summary,
            url: item.link,
            publishedAt: item.publish_time,
            author: item.author,
            source: { name: this.name }
          })) || []
        };
      }
    }
  ],
  
  // 缓存配置
  cache: {
    enabled: true,
    ttl: 300, // 5分钟缓存
    maxSize: 1000
  },
  
  // 请求配置
  request: {
    timeout: 10000,
    retryCount: 2,
    retryDelay: 1000,
    userAgent: 'FeedHub-NewsAggregator/1.0'
  },
  
  // 数据处理配置
  processing: {
    deduplication: {
      enabled: true,
      similarity: 0.8 // 相似度阈值
    },
    filtering: {
      minTitleLength: 10,
      maxTitleLength: 200,
      excludeKeywords: ['广告', 'AD:', 'Sponsored']
    },
    formatting: {
      maxDescriptionLength: 500,
      dateFormat: 'RFC2822'
    }
  },
  
  // RSS输出配置
  rss: {
    generator: 'FeedHub News Aggregator',
    language: 'zh-CN',
    ttl: 60, // RSS缓存时间（分钟）
    maxItems: 50,
    description: '多源新闻聚合RSS Feed'
  },
  
  // 错误处理配置
  errorHandling: {
    maxFailures: 3, // 最大失败次数
    fallbackSources: ['rss-news'], // 备用新闻源
    errorMessages: {
      noSources: '没有可用的新闻源',
      fetchFailed: '获取新闻数据失败',
      parseFailed: '解析新闻数据失败',
      timeout: '请求超时',
      invalidData: '数据格式无效'
    }
  },
  
  // 监控和日志配置
  monitoring: {
    logLevel: 'info',
    metrics: {
      enabled: true,
      trackSources: true,
      trackPerformance: true
    }
  }
};