// 配置常量
module.exports = {
  NEWS_SOURCES: {
    'default': 'https://api.example.com/news',
    'tech': 'https://api.example.com/tech-news',
    'sports': 'https://api.example.com/sports-news',
    'business': 'https://api.example.com/business-news'
  },
  
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  
  API_CONFIG: {
    TIMEOUT: 10000,
    HEADERS: {
      'User-Agent': 'FeedHub-Example/1.0'
    }
  }
};