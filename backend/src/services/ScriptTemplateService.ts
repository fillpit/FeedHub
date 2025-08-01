import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { ScriptFileService } from "./ScriptFileService";

/**
 * 脚本模板服务
 * 提供各种脚本模板的获取功能
 */
@injectable()
export class ScriptTemplateService {
  constructor(
    @inject(TYPES.ScriptFileService) private scriptFileService: ScriptFileService
  ) {}
  /**
   * 获取文件模板
   */
  getFileTemplate(fileName: string, template: string): string {
    const isJsFile = fileName.endsWith('.js');
    const isJsonFile = fileName.endsWith('.json');
    
    switch (template) {
      case 'main':
        return this.getMainFileTemplate();
      case 'package':
        return this.getPackageJsonTemplate();
      case 'utils':
        return this.getUtilsFileTemplate();
      case 'blank':
      default:
        if (isJsonFile) {
          return '{\n  \n}';
        } else if (isJsFile) {
          return `/**\n * ${fileName}\n * 创建时间: ${new Date().toISOString()}\n */\n\n`;
        } else {
          return '';
        }
    }
  }

  /**
   * 获取主文件模板
   */
  getMainFileTemplate(): string {
    return `/**
 * 动态路由脚本主文件
 * 这是您的自定义脚本入口文件
 */

/**
 * 主函数 - 脚本的入口点
 * @param {Object} context - 脚本执行上下文
 * @returns {Object|Array} RSS格式的数据或文章数组
 */
async function main(context) {
  const { routeParams, utils, auth, console, dayjs, require } = context;
  
  try {
    // 在这里编写您的脚本逻辑
    console.log('脚本开始执行，路由参数:', routeParams);
    
    // 示例：返回简单的文章列表
    const items = [
      {
        title: '示例文章1',
        link: 'https://example.com/article1',
        content: '这是示例文章的内容',
        author: '作者',
        pubDate: dayjs().toISOString(),
      },
      {
        title: '示例文章2', 
        link: 'https://example.com/article2',
        content: '这是另一篇示例文章的内容',
        author: '作者',
        pubDate: dayjs().subtract(1, 'day').toISOString(),
      }
    ];
    
    // 返回完整的RSS格式数据（推荐）
    return {
      title: '我的动态路由RSS',
      description: '这是一个动态生成的RSS源',
      link: 'https://example.com',
      items: items
    };
    
  } catch (error) {
    console.error('脚本执行失败:', error);
    throw error;
  }
}

// 导出主函数
module.exports = { main };
`;
  }

  /**
   * 从模板初始化脚本目录
   */
  async initializeFromTemplate(scriptDirName: string, templateName: string, routeConfig?: any): Promise<void> {
    const templates = {
      basic: {
        'main.js': this.getMainFileTemplate(),
        'package.json': this.getPackageJsonTemplate(routeConfig)
      },
      complex: {
        'main.js': this.getMainFileTemplate(),
        'package.json': this.getPackageJsonTemplate(routeConfig),
        'utils/helper.js': this.getUtilsFileTemplate()
      }
    };

    const template = templates[templateName as keyof typeof templates];
    if (!template) {
      throw new Error(`模板 "${templateName}" 不存在`);
    }

    for (const [filePath, content] of Object.entries(template)) {
      await this.scriptFileService.writeScriptFile(scriptDirName, filePath, content);
    }
  }

  /**
   * 获取package.json模板
   */
  getPackageJsonTemplate(routeConfig?: any): string {
    const name = routeConfig?.name ? `route-${routeConfig.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}` : 'dynamic-route-script';
    const description = routeConfig?.description || '动态路由脚本包';
    const version = '1.0.0';
    
    // 构建路由配置信息
    const routeInfo: any = {
      name: routeConfig?.name || '',
      path: routeConfig?.path || '',
      method: routeConfig?.method || 'GET',
      description: routeConfig?.description || '',
      refreshInterval: routeConfig?.refreshInterval || 60
    };
    
    // 添加参数信息
    if (routeConfig?.params && routeConfig.params.length > 0) {
      routeInfo.params = routeConfig.params.map((param: any) => ({
        name: param.name,
        type: param.type,
        required: param.required,
        defaultValue: param.defaultValue,
        description: param.description
      }));
    }
    
    // 添加授权信息
    if (routeConfig?.authCredentialId) {
      routeInfo.requiresAuth = true;
      routeInfo.authCredentialId = routeConfig.authCredentialId;
    }
    
    return `{
  "name": "${name}",
  "version": "${version}",
  "description": "${description}",
  "main": "main.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "dependencies": {
    
  },
  "author": "",
  "license": "ISC",
  "routeConfig": ${JSON.stringify(routeInfo, null, 4).replace(/\n/g, '\n  ')}
}
`;
  }

  /**
   * 获取工具文件模板
   */
  getUtilsFileTemplate(): string {
    return `/**
            * 工具函数模块
            * 在这里定义可复用的工具函数
            */

            /**
             * 格式化日期
             * @param {Date|string} date 日期
             * @param {string} format 格式
             * @returns {string} 格式化后的日期字符串
             */
            function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
              // 实现日期格式化逻辑
              return new Date(date).toISOString();
            }

            /**
             * 安全获取对象属性
             * @param {Object} obj 对象
             * @param {string} path 属性路径
             * @param {any} defaultValue 默认值
             * @returns {any} 属性值或默认值
             */
            function safeGet(obj, path, defaultValue = null) {
              try {
                return path.split('.').reduce((current, key) => current && current[key], obj) || defaultValue;
              } catch (error) {
                return defaultValue;
              }
            }

            /**
             * 清理HTML标签
             * @param {string} html HTML字符串
             * @returns {string} 纯文本
             */
            function stripHtml(html) {
              return html.replace(/<[^>]*>/g, '');
            }

            module.exports = {
              formatDate,
              safeGet,
              stripHtml
            };
    `;
  }

  /**
   * 获取RSS模板
   */
  getRssTemplate(): string {
    return `/**
 * RSS数据抓取脚本模板
 * 适用于从RSS源获取数据
 */

async function main(context) {
  const { routeParams, utils, auth, console, dayjs, require } = context;
  
  try {
    // RSS源URL
    const rssUrl = routeParams.url || 'https://example.com/rss.xml';
    
    console.log('开始抓取RSS数据:', rssUrl);
    
    // 使用utils.axios获取RSS数据
    const response = await utils.axios.get(rssUrl);
    const rssData = response.data;
    
    // 这里应该解析RSS XML数据
    // 示例返回格式
    const items = [
      {
        title: '示例RSS文章',
        link: 'https://example.com/article',
        content: '文章内容摘要',
        author: 'RSS作者',
        pubDate: dayjs().toISOString(),
      }
    ];
    
    return {
      title: 'RSS数据源',
      description: '从RSS源获取的数据',
      link: rssUrl,
      items: items
    };
    
  } catch (error) {
    console.error('RSS抓取失败:', error);
    throw error;
  }
}

module.exports = { main };
`;
  }

  /**
   * 获取API模板
   */
  getApiTemplate(): string {
    return `/**
 * API数据抓取脚本模板
 * 适用于从API接口获取数据
 */

async function main(context) {
  const { routeParams, utils, auth, console, dayjs, require } = context;
  
  try {
    // API接口URL
    const apiUrl = routeParams.apiUrl || 'https://api.example.com/data';
    
    console.log('开始调用API:', apiUrl);
    
    // 构建请求配置
    const requestConfig = {
      method: 'GET',
      url: apiUrl,
      headers: {
        'User-Agent': 'FeedHub/1.0'
      }
    };
    
    // 如果有认证信息，添加到请求头
    if (auth && auth.credentials) {
      if (auth.authType === 'bearer') {
        requestConfig.headers['Authorization'] = \`Bearer \${auth.credentials.token}\`;
      } else if (auth.authType === 'apikey') {
        requestConfig.headers[auth.credentials.headerName || 'X-API-Key'] = auth.credentials.apiKey;
      }
    }
    
    // 发送请求
    const response = await utils.axios(requestConfig);
    const apiData = response.data;
    
    console.log('API响应状态:', response.status);
    
    // 处理API数据，转换为RSS格式
    const items = (apiData.items || []).map(item => ({
      title: item.title || '无标题',
      link: item.url || item.link || '#',
      content: item.description || item.content || '',
      author: item.author || '未知作者',
      pubDate: item.publishedAt || item.createdAt || dayjs().toISOString(),
    }));
    
    return {
      title: 'API数据源',
      description: '从API获取的数据',
      link: apiUrl,
      items: items
    };
    
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}

module.exports = { main };
`;
  }
}