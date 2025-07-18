import { v4 as uuidv4 } from "uuid";
import * as cheerio from "cheerio";
import * as util from "util";
import * as vm from "vm";
import dayjs from "dayjs";
import { logger } from "./logger";
import { sanitizeCookie } from "./requestUtils";
import { formatDate } from "./dateUtils";

function colorizeLog(level: string, message: string): string {
  return `[${level}] ${message}`;
}

function formatMultilineLog(level: string, message: string): string {
  if (typeof message !== 'string') return colorizeLog(level, String(message));
  const lines = message.split('\n');
  if (lines.length === 1) return colorizeLog(level, message);
  return colorizeLog(level, lines[0]) + '\n' + lines.slice(1).map(line => '    ' + line).join('\n');
}

export function createScriptContext(config: any, axiosInstance: any, requestConfig: any, logs?: string[]): any {
  let html = '';
  let $: any = null;
  const fetchHtml = async () => {
    try {
      if (logs) logs.push(formatMultilineLog('INFO', `正在尝试获取URL内容: ${config.url}`));
      if (logs) logs.push(formatMultilineLog('DEBUG', `请求配置: ${JSON.stringify(requestConfig, null, 2)}`));
      if (logs) logs.push(formatMultilineLog('DEBUG', `授权信息: ${JSON.stringify(config.auth, null, 2)}`));
      const response = await axiosInstance.get(config.url, requestConfig);
      html = response.data;
      $ = cheerio.load(html);
      if (logs) {
        logs.push(formatMultilineLog('INFO', '成功获取URL内容。'));
        logs.push(formatMultilineLog('INFO', `响应状态: ${response.status}`));
        logs.push(formatMultilineLog('INFO', `响应头: ${JSON.stringify(response.headers)}`));
        let dataStr = '';
        if (typeof response.data === 'object') {
          try {
            if (Object.prototype.toString.call(response.data) === '[object Object]' && response.data.constructor && response.data.constructor.name !== 'Object') {
              dataStr = `[对象类型: ${response.data.constructor.name}]`;
              const keys = Object.keys(response.data);
              if (keys.length > 0) {
                dataStr += '\n可枚举属性: ' + JSON.stringify(keys);
              }
            } else {
              dataStr = JSON.stringify(response.data, null, 2);
            }
          } catch {
            dataStr = String(response.data);
          }
        } else {
          dataStr = String(response.data);
        }
        if (dataStr.length > 2000) {
          dataStr = dataStr.slice(0, 2000) + '\n...内容过长已截断...';
        }
        logs.push(formatMultilineLog('INFO', `响应内容:\n${dataStr}`));
      }
    } catch (error) {
      const errorMessage = `获取网页内容失败，这可能是一个API接口，可忽略: ${(error as Error).message}`;
      if (logs) {
        logs.push(formatMultilineLog('WARN', errorMessage));
      } else {
        logger.warn(errorMessage);
      }
    }
  };
  const authInfo = {
    type: config.auth?.authType || 'none',
    cookie: sanitizeCookie(config.auth?.cookie || ''),
    basicAuth: config.auth?.basicAuth || null,
    bearerToken: config.auth?.bearerToken || '',
    customHeaders: config.auth?.customHeaders || {}
  };
  const createUtils = () => ({
    formatDate: (dateText: string, format?: string) => formatDate(dateText, format),
    uuid: () => uuidv4(),
    dayjs: dayjs,
    fetchApi: async (url: string, options?: any) => {
      try {
        const finalOptions = { ...options };
        if (authInfo.type === 'cookie' && authInfo.cookie) {
          try {
            const cookieValue = authInfo.cookie.trim();
            if (cookieValue) {
              finalOptions.headers = {
                ...finalOptions.headers,
                'Cookie': cookieValue
              };
            }
          } catch (cookieError) {
            console.warn('Cookie值无效，跳过Cookie设置:', cookieError);
          }
        }
        if (authInfo.type === 'basic' && authInfo.basicAuth) {
          try {
            const { username, password } = authInfo.basicAuth;
            if (username && password) {
              const credentials = Buffer.from(`${username}:${password}`).toString('base64');
              finalOptions.headers = {
                ...finalOptions.headers,
                'Authorization': `Basic ${credentials}`
              };
            }
          } catch (authError) {
            console.warn('Basic Auth配置无效:', authError);
          }
        }
        if (authInfo.type === 'bearer' && authInfo.bearerToken) {
          try {
            const token = authInfo.bearerToken.trim();
            if (token) {
              finalOptions.headers = {
                ...finalOptions.headers,
                'Authorization': `Bearer ${token}`
              };
            }
          } catch (tokenError) {
            console.warn('Bearer Token无效:', tokenError);
          }
        }
        if (authInfo.type === 'custom' && authInfo.customHeaders) {
          try {
            finalOptions.headers = {
              ...finalOptions.headers,
              ...authInfo.customHeaders
            };
          } catch (headerError) {
            console.warn('自定义请求头配置无效:', headerError);
          }
        }
        if (logs) {
          logs.push(formatMultilineLog('DEBUG', `fetchApi请求: url=${url}`));
          logs.push(formatMultilineLog('DEBUG', `fetchApi headers: ${JSON.stringify(finalOptions.headers)}`));
          logs.push(formatMultilineLog('DEBUG', `fetchApi method: ${finalOptions.method || 'GET'}`));
          logs.push(formatMultilineLog('DEBUG', `fetchApi 授权类型: ${authInfo.type}`));
        }
        const response = await axiosInstance.request({
          url,
          method: options?.method || 'GET',
          headers: finalOptions.headers || {},
          data: options?.data,
          params: options?.params,
          timeout: options?.timeout || 30000
        });
        if (logs) {
          logs.push(formatMultilineLog('DEBUG', `fetchApi响应状态: ${response.status}`));
          logs.push(formatMultilineLog('DEBUG', `fetchApi响应头: ${JSON.stringify(response.headers)}`));
          let dataStr = '';
          if (typeof response.data === 'object') {
            try {
              if (Object.prototype.toString.call(response.data) === '[object Object]' && response.data.constructor && response.data.constructor.name !== 'Object') {
                dataStr = `[对象类型: ${response.data.constructor.name}]`;
                const keys = Object.keys(response.data);
                if (keys.length > 0) {
                  dataStr += '\n可枚举属性: ' + JSON.stringify(keys);
                }
              } else {
                dataStr = JSON.stringify(response.data, null, 2);
              }
            } catch {
              dataStr = String(response.data);
            }
          } else {
            dataStr = String(response.data);
          }
          if (dataStr.length > 2000) {
            dataStr = dataStr.slice(0, 2000) + '\n...内容过长已截断...';
          }
          logs.push(formatMultilineLog('DEBUG', `fetchApi响应内容:\n${dataStr}`));
        }
        return {
          data: response.data,
          status: response.status,
          headers: response.headers
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        if (logs) logs.push(formatMultilineLog('ERROR', `fetchApi请求失败: ${errorMessage}`));
        throw new Error(`API请求失败: ${errorMessage}`);
      }
    },
    getAuthInfo: () => authInfo,
    parseJson: (text: string) => {
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(`JSON解析失败: ${(error as Error).message}`);
      }
    },
    extractText: (html: string) => {
      if (!$) return html;
      return $(html).text().trim();
    },
    parseDate: (dateStr: string, format?: string) => {
      try {
        if (!dateStr || typeof dateStr !== 'string') {
          return new Date().toISOString();
        }
        const formattedDate = formatDate(dateStr, format);
        if (formattedDate === dateStr) {
          const date = format ? dayjs(dateStr, format) : dayjs(dateStr);
          if (date.isValid()) {
            return date.toISOString();
          } else {
            console.warn(`无效的日期格式: ${dateStr}`);
            return new Date().toISOString();
          }
        }
        return formattedDate;
      } catch (error) {
        console.warn(`日期解析失败: ${dateStr}, 错误: ${(error as Error).message}`);
        return new Date().toISOString();
      }
    },
    chunk: (array: any[], size: number) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    },
    pick: (obj: any, keys: string[]) => {
      const result: any = {};
      keys.forEach(key => {
        if (obj && obj.hasOwnProperty(key)) {
          result[key] = obj[key];
        }
      });
      return result;
    },
    safeGet: (obj: any, path: string, defaultValue: any = null) => {
      try {
        if (!obj || typeof obj !== 'object') return defaultValue;
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return defaultValue;
          }
        }
        return current !== undefined ? current : defaultValue;
      } catch (error) {
        console.warn(`安全访问失败: ${path}, 错误: ${(error as Error).message}`);
        return defaultValue;
      }
    },
    safeArray: (arr: any) => {
      return Array.isArray(arr) ? arr : [];
    },
    safeObject: (obj: any) => {
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    },
    validateItem: (item: any, index: number) => {
      if (!item || typeof item !== 'object') {
        console.warn(`项目 ${index} 不是有效对象`);
        return false;
      }
      if (!item.title && !item.name && !item.headline) {
        console.warn(`项目 ${index} 缺少标题字段`);
        return false;
      }
      return true;
    }
  });
  const createConsole = () => {
    if (logs) {
      return {
        log: (...args: any[]) => logs.push(formatMultilineLog('LOG', util.format(...args))),
        error: (...args: any[]) => logs.push(formatMultilineLog('ERROR', util.format(...args))),
        warn: (...args: any[]) => logs.push(formatMultilineLog('WARN', util.format(...args)))
      };
    } else {
      return {
        log: (...args: any[]) => logger.info(formatMultilineLog('Script', args.join(' '))),
        error: (...args: any[]) => logger.error(formatMultilineLog('Script', args.join(' '))),
        warn: (...args: any[]) => logger.warn(formatMultilineLog('Script', args.join(' ')))
      };
    }
  };
  return {
    fetchHtml,
    authInfo,
    createUtils,
    createConsole,
    html,
    $
  };
}

export async function executeScript(config: any, context: any, axiosInstance: any, logs?: string[]): Promise<any> {
  const { fetchHtml, authInfo, createUtils, createConsole, html, $ } = context;
  await fetchHtml();
  const scriptContext = {
    $: $,
    html: html,
    url: config.url,
    axios: axiosInstance,
    auth: authInfo,
    console: createConsole(),
    utils: createUtils(),
    dayjs: dayjs
  };
  const vmContext = vm.createContext(scriptContext);
  const timeout = config.script?.timeout || 30000;
  const asyncScript = `
    (async () => {
      try {
        ${config.script?.script}
      } catch (error) {
        console.error('脚本执行错误:', error.message);
        throw error;
      }
    })()
  `;
  const script = new vm.Script(asyncScript);
  const result = await Promise.race([
    script.runInContext(vmContext, { timeout }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`脚本执行超时 (${timeout}ms)`)), timeout))
  ]);
  return result;
}

export function validateScriptResult(result: any): any[] {
  if (!Array.isArray(result)) {
    throw new Error("脚本必须返回一个数组");
  }
  const validatedItems = result.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`项目 ${index} 必须是对象`);
    }
    const validatedItem: any = {
      title: item.title || `项目 ${index + 1}`,
      link: item.link || '',
      guid: item.guid || item.link || uuidv4(),
      content: item.content || '',
      contentSnippet: item.contentSnippet || (item.content ? item.content.substring(0, 300) : ''),
      author: item.author || '',
      pubDate: item.pubDate || new Date().toISOString(),
      image: item.image || '' // 添加文章封面字段
    };
    return validatedItem;
  });
  return validatedItems;
}