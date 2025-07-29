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
  if (typeof message !== "string") return colorizeLog(level, String(message));
  const lines = message.split("\n");
  if (lines.length === 1) return colorizeLog(level, message);
  return (
    colorizeLog(level, lines[0]) +
    "\n" +
    lines
      .slice(1)
      .map((line) => "    " + line)
      .join("\n")
  );
}

export function createScriptContext(
  config: any,
  axiosInstance: any,
  logs?: string[]
): any {
  const authInfo = {
    type: config.auth?.authType || "none",
    cookie: sanitizeCookie(config.auth?.cookie || ""),
    basicAuth: config.auth?.basicAuth || null,
    bearerToken: config.auth?.bearerToken || "",
    customHeaders: config.auth?.customHeaders || {},
  };
  const createUtils = () => ({
    formatDate: (dateText: string, format?: string) => formatDate(dateText, format),
    uuid: () => uuidv4(),
    dayjs: dayjs,
    fetchApi: async (url: string, options?: any) => {
      try {
        const finalOptions = { ...options };
        if (authInfo.type === "cookie" && authInfo.cookie) {
          try {
            const cookieValue = authInfo.cookie.trim();
            if (cookieValue) {
              finalOptions.headers = {
                ...finalOptions.headers,
                Cookie: cookieValue,
              };
            }
          } catch (cookieError) {
            console.warn("Cookie值无效，跳过Cookie设置:", cookieError);
          }
        }
        if (authInfo.type === "basic" && authInfo.basicAuth) {
          try {
            const { username, password } = authInfo.basicAuth;
            if (username && password) {
              const credentials = Buffer.from(`${username}:${password}`).toString("base64");
              finalOptions.headers = {
                ...finalOptions.headers,
                Authorization: `Basic ${credentials}`,
              };
            }
          } catch (authError) {
            console.warn("Basic Auth配置无效:", authError);
          }
        }
        if (authInfo.type === "bearer" && authInfo.bearerToken) {
          try {
            const token = authInfo.bearerToken.trim();
            if (token) {
              finalOptions.headers = {
                ...finalOptions.headers,
                Authorization: `Bearer ${token}`,
              };
            }
          } catch (tokenError) {
            console.warn("Bearer Token无效:", tokenError);
          }
        }
        if (authInfo.type === "custom" && authInfo.customHeaders) {
          try {
            finalOptions.headers = {
              ...finalOptions.headers,
              ...authInfo.customHeaders,
            };
          } catch (headerError) {
            console.warn("自定义请求头配置无效:", headerError);
          }
        }
        if (logs) {
          logs.push(formatMultilineLog("DEBUG", `fetchApi请求: url=${url}`));
          logs.push(
            formatMultilineLog("DEBUG", `fetchApi headers: ${JSON.stringify(finalOptions.headers)}`)
          );
          logs.push(
            formatMultilineLog("DEBUG", `fetchApi method: ${finalOptions.method || "GET"}`)
          );
          logs.push(formatMultilineLog("DEBUG", `fetchApi 授权类型: ${authInfo.type}`));
        }
        const response = await axiosInstance.request({
          url,
          method: options?.method || "GET",
          headers: finalOptions.headers || {},
          data: options?.data,
          params: options?.params,
          timeout: options?.timeout || 30000,
        });
        if (logs) {
          logs.push(formatMultilineLog("DEBUG", `fetchApi响应状态: ${response.status}`));
          logs.push(
            formatMultilineLog("DEBUG", `fetchApi响应头: ${JSON.stringify(response.headers)}`)
          );
          let dataStr = "";
          if (typeof response.data === "object") {
            try {
              if (
                Object.prototype.toString.call(response.data) === "[object Object]" &&
                response.data.constructor &&
                response.data.constructor.name !== "Object"
              ) {
                dataStr = `[对象类型: ${response.data.constructor.name}]`;
                const keys = Object.keys(response.data);
                if (keys.length > 0) {
                  dataStr += "\n可枚举属性: " + JSON.stringify(keys);
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
            dataStr = dataStr.slice(0, 2000) + "\n...内容过长已截断...";
          }
          logs.push(formatMultilineLog("DEBUG", `fetchApi响应内容:\n${dataStr}`));
        }
        return {
          data: response.data,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        if (logs) logs.push(formatMultilineLog("ERROR", `fetchApi请求失败: ${errorMessage}`));
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
    parseDate: (dateStr: string, format?: string) => {
      try {
        if (!dateStr || typeof dateStr !== "string") {
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
      keys.forEach((key) => {
        if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = obj[key];
        }
      });
      // The validation is now part of the validateScriptResult function, which will be called outside.
      return result;
    },
    safeGet: (obj: any, path: string, defaultValue: any = null) => {
      try {
        if (!obj || typeof obj !== "object") return defaultValue;
        const keys = path.split(".");
        let current = obj;
        for (const key of keys) {
          if (current && typeof current === "object" && key in current) {
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
      return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
    },
    validateItem: (item: any, index: number) => {
      if (!item || typeof item !== "object") {
        console.warn(`项目 ${index} 不是有效对象`);
        return false;
      }
      if (!item.title && !item.name && !item.headline) {
        console.warn(`项目 ${index} 缺少标题字段`);
        return false;
      }
      return true;
    },
    queryParams: (obj: any, ignoreEmpty: boolean = false) => {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        return "";
      }
      const params = new URLSearchParams();
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (value !== null && value !== undefined) {
          if (ignoreEmpty && String(value).trim() === "") {
            return; // 跳过空值
          }
          if (Array.isArray(value)) {
            value.forEach((item) => {
              const itemStr = String(item);
              if (!ignoreEmpty || itemStr.trim() !== "") {
                params.append(key, itemStr);
              }
            });
          } else {
            params.append(key, String(value));
          }
        }
      });
      return params.toString();
    },
  });
  const createConsole = () => {
    if (logs) {
      return {
        log: (...args: any[]) => logs.push(formatMultilineLog("LOG", util.format(...args))),
        error: (...args: any[]) => logs.push(formatMultilineLog("ERROR", util.format(...args))),
        warn: (...args: any[]) => logs.push(formatMultilineLog("WARN", util.format(...args))),
      };
    } else {
      return {
        log: (...args: any[]) => logger.info(formatMultilineLog("Script", args.join(" "))),
        error: (...args: any[]) => logger.error(formatMultilineLog("Script", args.join(" "))),
        warn: (...args: any[]) => logger.warn(formatMultilineLog("Script", args.join(" "))),
      };
    }
  };
  return {
    authInfo,
    createUtils,
    createConsole
  };
}

export async function executeScript(
  config: any,
  context: any,
  axiosInstance: any,
  logs?: string[],
  npmPackageService?: any
): Promise<any> {
  const { authInfo, createUtils, createConsole, routeParams } =
    context;

  // 创建安全的require函数
  const createSafeRequire = () => {
    if (!npmPackageService) {
      return () => {
        throw new Error("npm包功能未启用");
      };
    }
    return (packageName: string) => {
      console.log("加载npm包:", packageName);
    }
    // return (packageName: string) => {
    //   try {
    //     // 验证包名格式
    //     const packageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    //     if (!packageNameRegex.test(packageName)) {
    //       throw new Error(`无效的包名: ${packageName}`);
    //     }

    //     // 尝试加载包
    //     const packagesDir = npmPackageService.getPackagesDirectory();
    //     const packagePath = require.resolve(packageName, { paths: [packagesDir] });
    //     // eslint-disable-next-line @typescript-eslint/no-var-requires
    //     const loadedPackage = require(packagePath);

    //     // 更新使用统计
    //     npmPackageService.updatePackageUsage(packageName).catch((error: any) => {
    //       logger.warn(`更新包使用统计失败: ${packageName}`, error);
    //     });

    //     if (logs) {
    //       logs.push(formatMultilineLog("INFO", `成功加载npm包: ${packageName}`));
    //     }

    //     return loadedPackage;
    //   } catch (error) {
    //     const errorMessage = `加载npm包失败: ${packageName} - ${(error as Error).message}`;
    //     if (logs) {
    //       logs.push(formatMultilineLog("ERROR", errorMessage));
    //     }
    //     throw new Error(errorMessage);
    //   }
    // };
  };
  const scriptContext = {
    url: config.url,
    axios: axiosInstance,
    auth: authInfo,
    console: createConsole(),
    utils: createUtils(),
    dayjs: dayjs,
    routeParams: routeParams || {},
    requirex: createSafeRequire(),
  };
  const vmContext = vm.createContext(scriptContext);
  const timeout = config.script?.timeout || 30000;

  const script = new vm.Script(config.script?.script);
  const result = await Promise.race([
    script.runInContext(vmContext, { timeout }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`脚本执行超时 (${timeout}ms)`)), timeout)
    ),
  ]);
    
  return result;
}

export function validateScriptResult(result: any): any {

  // 如果返回的是数组，说明是旧格式（只返回items），保持向后兼容
  if (Array.isArray(result)) {
    const validatedItems = result.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`项目 ${index} 必须是对象`);
      }
      const validatedItem: any = {
        title: item.title || `项目 ${index + 1}`,
        link: item.link || "",
        guid: item.guid || item.link || uuidv4(),
        content: item.content || "",
        contentSnippet: item.contentSnippet || (item.content ? item.content.substring(0, 300) : ""),
        author: item.author || "",
        pubDate: item.pubDate || new Date().toISOString(),
        image: item.image || "", // 添加文章封面字段
      };
      return validatedItem;
    });
    return { items: validatedItems };
  }

  // 如果返回的是对象，说明是新格式（包含完整RSS字段）
  if (!result || typeof result !== "object") {
    throw new Error("脚本必须返回一个数组或包含RSS字段的对象");
  }

  // 验证items字段
  if (!Array.isArray(result.items)) {
    throw new Error("返回对象必须包含items数组字段");
  }

  const validatedItems = result.items.map((item: any, index: number) => {
    if (!item || typeof item !== "object") {
      throw new Error(`项目 ${index} 必须是对象`);
    }
    const validatedItem: any = {
      title: item.title || `项目 ${index + 1}`,
      link: item.link || "",
      guid: item.guid || item.link || uuidv4(),
      content: item.content || "",
      contentSnippet: item.contentSnippet || (item.content ? item.content.substring(0, 300) : ""),
      author: item.author || "",
      pubDate: item.pubDate || new Date().toISOString(),
      image: item.image || "", // 添加文章封面字段
    };
    return validatedItem;
  });

  // 返回完整的RSS结构
  return {
    title: result.title || "",
    description: result.description || "",
    feed_url: result.feed_url || "",
    site_url: result.site_url || "",
    generator: result.generator || "FeedHub CustomRoute",
    pubDate: result.pubDate || new Date().toISOString(),
    language: result.language || "",
    copyright: result.copyright || "",
    managingEditor: result.managingEditor || "",
    webMaster: result.webMaster || "",
    ttl: result.ttl || undefined,
    image: result.image || undefined, // RSS频道图片
    items: validatedItems,
  };
}
