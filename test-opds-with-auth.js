const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

// 配置axios
axios.defaults.timeout = 30000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// 测试OPDS书籍创建功能
async function testOpdsBookCreation() {
  try {
    console.log('正在登录...');
    
    // 1. 登录获取token
    const loginResponse = await axios.post('http://localhost:8009/api/user/login', {
      username: 'admin',
      password: 'admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('登录成功，获取到token');
    
    // 2. 创建包含OPDS书籍的RSS配置
    const rssConfig = {
      title: 'OPDS测试RSS',
      description: '这是一个测试OPDS书籍RSS配置',
      opdsConfig: {
        name: 'Global OPDS',
        url: '',
        authType: 'none',
        enabled: false
      },
      bookFilter: {
        title: '',
        author: '',
        categories: [],
        language: '',
        fileFormats: []
      },
      maxBooks: 50,
      updateInterval: 1,
      opdsBook: {
        title: '测试OPDS书籍',
        author: '测试作者',
        description: '这是一个测试OPDS书籍',
        link: 'https://example.com/book.epub',
        language: 'zh-CN',
        categories: ['测试'],
        fileFormat: 'epub'
      }
    };
    
    console.log('正在创建RSS配置...');
    const createResponse = await axios.post('http://localhost:8009/api/book-rss', rssConfig, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('RSS配置创建成功:', createResponse.data);
    
    // 3. 查询数据库验证OPDS书籍是否创建
    const db = new sqlite3.Database('./backend/data/database.sqlite');
    
    db.get('SELECT * FROM books WHERE sourceType = "opds" ORDER BY id DESC LIMIT 1', (err, row) => {
      if (err) {
        console.error('数据库查询错误:', err);
      } else if (row) {
        console.log('OPDS书籍创建成功:', row);
        console.log('测试通过！');
      } else {
        console.log('未找到OPDS书籍记录');
      }
      db.close();
    });
    
  } catch (error) {
    console.error('测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else if (error.code) {
      console.error('错误代码:', error.code);
      console.error('错误信息:', error.message);
    } else {
      console.error('未知错误:', error.message);
    }
  }
}

testOpdsBookCreation();