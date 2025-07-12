import { injectable } from "inversify";
import RssTemplate, { RssTemplateAttributes, TemplateParameter } from "../models/RssTemplate";
import { ApiResponse } from "../core/ApiResponse";
import { logger } from "../utils/logger";
import { createRequestConfig } from "../utils/requestUtils";
import { createScriptContext, executeScript, validateScriptResult } from "../utils/scriptRunner";
import { formatDate } from "../utils/dateUtils";
import axios from "axios";
import { AxiosInstance } from "axios";
import AuthCredential from "../models/AuthCredential";

// 定义API响应数据类型
type ApiResponseData<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

@injectable()
export class RssTemplateService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(): Promise<ApiResponseData<RssTemplateAttributes[]>> {
    try {
      const templates = await RssTemplate.findAll({
        where: { enabled: true },
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        data: templates,
        message: "获取模板列表成功",
      };
    } catch (error) {
      logger.error("获取模板列表失败:", error);
      return {
        success: false,
        message: "获取模板列表失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 根据ID获取模板
   */
  async getTemplateById(id: number): Promise<ApiResponseData<RssTemplateAttributes | null>> {
    try {
      const template = await RssTemplate.findByPk(id);
      
      if (!template) {
        return {
          success: false,
          message: "模板不存在",
        };
      }

      return {
        success: true,
        data: template,
        message: "获取模板成功",
      };
    } catch (error) {
      logger.error("获取模板失败:", error);
      return {
        success: false,
        message: "获取模板失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 创建模板
   */
  async createTemplate(templateData: Omit<RssTemplateAttributes, "id" | "createdAt" | "updatedAt">): Promise<ApiResponseData<RssTemplateAttributes>> {
    try {
      // 验证必需参数
      const requiredParams = templateData.parameters.filter(p => p.required);
      if (requiredParams.length === 0) {
        return {
          success: false,
          message: "至少需要一个必需参数",
        };
      }

      const template = await RssTemplate.create(templateData);

      return {
        success: true,
        data: template,
        message: "创建模板成功",
      };
    } catch (error) {
      logger.error("创建模板失败:", error);
      return {
        success: false,
        message: "创建模板失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 更新模板
   */
  async updateTemplate(id: number, templateData: Partial<RssTemplateAttributes>): Promise<ApiResponseData<RssTemplateAttributes>> {
    try {
      const template = await RssTemplate.findByPk(id);
      
      if (!template) {
        return {
          success: false,
          message: "模板不存在",
        };
      }

      // 如果更新了参数，验证必需参数
      if (templateData.parameters) {
        const requiredParams = templateData.parameters.filter(p => p.required);
        if (requiredParams.length === 0) {
          return {
            success: false,
            message: "至少需要一个必需参数",
          };
        }
      }

      await template.update(templateData);

      return {
        success: true,
        data: template,
        message: "更新模板成功",
      };
    } catch (error) {
      logger.error("更新模板失败:", error);
      return {
        success: false,
        message: "更新模板失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: number): Promise<ApiResponseData<null>> {
    try {
      const template = await RssTemplate.findByPk(id);
      
      if (!template) {
        return {
          success: false,
          message: "模板不存在",
        };
      }

      await template.destroy();

      return {
        success: true,
        data: null,
        message: "删除模板成功",
      };
    } catch (error) {
      logger.error("删除模板失败:", error);
      return {
        success: false,
        message: "删除模板失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 根据模板和参数生成RSS配置
   */
  async generateRssConfig(templateId: number, parameters: Record<string, any>): Promise<ApiResponseData<{
    url: string;
    script: string;
    name: string;
  }>> {
    try {
      const template = await RssTemplate.findByPk(templateId);
      
      if (!template) {
        return {
          success: false,
          message: "模板不存在",
        };
      }

      // 验证参数
      const validationResult = this.validateParameters(template.parameters, parameters);
      if (!validationResult.success) {
        return {
          success: false,
          message: validationResult.message,
        };
      }

      // 替换URL模板中的参数
      let url = template.urlTemplate;
      for (const param of template.parameters) {
        const value = parameters[param.name];
        if (value !== undefined) {
          url = url.replace(new RegExp(`\\{\\{${param.name}\\}\\}`, "g"), String(value));
        }
      }

      // 替换脚本模板中的参数
      let script = template.scriptTemplate;
      for (const param of template.parameters) {
        const value = parameters[param.name];
        if (value !== undefined) {
          script = script.replace(new RegExp(`\\{\\{${param.name}\\}\\}`, "g"), String(value));
        }
      }

      // 生成名称
      let name = template.name;
      for (const param of template.parameters) {
        const value = parameters[param.name];
        if (value !== undefined) {
          name = name.replace(new RegExp(`\\{\\{${param.name}\\}\\}`, "g"), String(value));
        }
      }

      return {
        success: true,
        data: {
          url,
          script,
          name,
        },
        message: "生成RSS配置成功",
      };
    } catch (error) {
      logger.error("生成RSS配置失败:", error);
      return {
        success: false,
        message: "生成RSS配置失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 验证参数
   */
  private validateParameters(templateParams: TemplateParameter[], providedParams: Record<string, any>): ApiResponseData<null> {
    // 检查必需参数
    for (const param of templateParams) {
      if (param.required && (providedParams[param.name] === undefined || providedParams[param.name] === "")) {
        return {
          success: false,
          message: `参数 "${param.label}" 是必需的`,
        };
      }
    }

    // 检查参数类型
    for (const param of templateParams) {
      const value = providedParams[param.name];
      if (value !== undefined && value !== "") {
        switch (param.type) {
          case "number":
            if (isNaN(Number(value))) {
              return {
                success: false,
                message: `参数 "${param.label}" 必须是数字`,
              };
            }
            break;
          case "select":
            if (param.options && !param.options.includes(String(value))) {
              return {
                success: false,
                message: `参数 "${param.label}" 必须是以下值之一: ${param.options.join(", ")}`,
              };
            }
            break;
        }
      }
    }

    return {
      success: true,
      data: null,
      message: "参数验证通过",
    };
  }

  /**
   * 初始化默认模板
   */
  async initializeDefaultTemplates(): Promise<void> {
    try {
      const existingTemplates = await RssTemplate.count();
      if (existingTemplates > 0) {
        return; // 已有模板，跳过初始化
      }

      const defaultTemplates = [
        {
          name: "B站UP主",
          description: "抓取B站UP主的视频更新",
          platform: "bilibili",
          icon: "bilibili",
          urlTemplate: "https://space.bilibili.com/{{userId}}/video",
          scriptTemplate: `
// B站UP主视频抓取脚本
const items = [];

// 获取视频列表
const videoList = document.querySelectorAll('.bili-video-card');

videoList.forEach(card => {
  const titleElement = card.querySelector('.bili-video-card__info--tit');
  const linkElement = card.querySelector('a');
  const timeElement = card.querySelector('.bili-video-card__info--date');
  const coverElement = card.querySelector('img');
  
  if (titleElement && linkElement) {
    const title = titleElement.textContent.trim();
    const link = 'https:' + linkElement.getAttribute('href');
    const time = timeElement ? timeElement.textContent.trim() : '';
    const cover = coverElement ? coverElement.getAttribute('src') : '';
    
    items.push({
      title,
      link,
      time,
      cover,
      description: title
    });
  }
});

return items;
          `,
                     parameters: [
             {
               name: "userId",
               label: "UP主ID",
               type: "string" as const,
               required: true,
               description: "B站UP主的用户ID",
             },
           ],
          enabled: true,
        },
        {
          name: "抖音博主",
          description: "抓取抖音博主的视频更新",
          platform: "douyin",
          icon: "douyin",
          urlTemplate: "https://www.douyin.com/user/{{userId}}",
          scriptTemplate: `
// 抖音博主视频抓取脚本
const items = [];

// 获取视频列表
const videoList = document.querySelectorAll('[data-e2e="user-post-item"]');

videoList.forEach(item => {
  const titleElement = item.querySelector('a[title]');
  const linkElement = item.querySelector('a');
  const timeElement = item.querySelector('[data-e2e="video-create-time"]');
  const coverElement = item.querySelector('img');
  
  if (titleElement && linkElement) {
    const title = titleElement.getAttribute('title') || titleElement.textContent.trim();
    const link = 'https://www.douyin.com' + linkElement.getAttribute('href');
    const time = timeElement ? timeElement.textContent.trim() : '';
    const cover = coverElement ? coverElement.getAttribute('src') : '';
    
    items.push({
      title,
      link,
      time,
      cover,
      description: title
    });
  }
});

return items;
          `,
                     parameters: [
             {
               name: "userId",
               label: "博主ID",
               type: "string" as const,
               required: true,
               description: "抖音博主的用户ID",
             },
           ],
          enabled: true,
        },
        {
          name: "YouTube频道",
          description: "抓取YouTube频道的视频更新",
          platform: "youtube",
          icon: "youtube",
          urlTemplate: "https://www.youtube.com/{{channelId}}/videos",
          scriptTemplate: `
// YouTube频道视频抓取脚本
const items = [];

// 获取视频列表
const videoList = document.querySelectorAll('#video-title');

videoList.forEach(titleElement => {
  const linkElement = titleElement.closest('a');
  const timeElement = titleElement.closest('ytd-grid-video-renderer')?.querySelector('#metadata-line');
  const coverElement = titleElement.closest('ytd-grid-video-renderer')?.querySelector('#img');
  
  if (titleElement && linkElement) {
    const title = titleElement.textContent.trim();
    const link = 'https://www.youtube.com' + linkElement.getAttribute('href');
    const time = timeElement ? timeElement.textContent.trim() : '';
    const cover = coverElement ? coverElement.getAttribute('src') : '';
    
    items.push({
      title,
      link,
      time,
      cover,
      description: title
    });
  }
});

return items;
          `,
                     parameters: [
             {
               name: "channelId",
               label: "频道ID",
               type: "string" as const,
               required: true,
               description: "YouTube频道的ID",
             },
           ],
          enabled: true,
        },
      ];

      for (const template of defaultTemplates) {
        await RssTemplate.create(template);
      }

      logger.info("初始化默认模板完成");
    } catch (error) {
      logger.error("初始化默认模板失败:", error);
    }
  }

  /**
   * 调试模板（动态传入模板内容和参数）
   */
  async debugTemplate({ template, parameters, authCredentialId }: { template: any, parameters: Record<string, any>, authCredentialId?: number }) {
    const logs: string[] = [];
    const startTime = Date.now();
    try {
      // 1. 动态生成url和脚本
      let url = template.urlTemplate;
      let script = template.scriptTemplate;
      let name = template.name;
      for (const param of template.parameters) {
        const value = parameters[param.name];
        if (value !== undefined) {
          url = url.replace(new RegExp(`\{\{${param.name}\}\}`, "g"), String(value));
          script = script.replace(new RegExp(`\{\{${param.name}\}\}`, "g"), String(value));
          name = name.replace(new RegExp(`\{\{${param.name}\}\}`, "g"), String(value));
        }
      }
      // 2. 构造临时 WebsiteRssConfigAttributes 结构
      let auth: any = {};
      if (authCredentialId) {
        const authObj = await AuthCredential.findByPk(authCredentialId);
        if (!authObj) throw new Error("未找到授权信息");
        auth = { ...authObj.toJSON(), enabled: true, authType: authObj.authType };
      } else if (parameters.authType) {
        auth.enabled = true;
        auth.authType = parameters.authType;
        if (parameters.authType === 'cookie' && parameters.cookie) {
          auth.cookie = parameters.cookie;
        } else if (parameters.authType === 'bearer' && parameters.bearerToken) {
          auth.bearerToken = parameters.bearerToken;
        } else if (parameters.authType === 'basic' && parameters.username && parameters.password) {
          auth.basicAuth = { username: parameters.username, password: parameters.password };
        } else if (parameters.authType === 'custom' && parameters.customHeaders) {
          auth.customHeaders = parameters.customHeaders;
        }
      }
      const config = {
        id: 0,
        key: "debug-temp",
        title: name,
        url,
        favicon: template.icon || "",
        fetchMode: "script",
        selector: {},
        script: {
          enabled: true,
          script,
          timeout: 30000
        },
        auth,
        fetchInterval: 10,
        lastContent: "",
        lastFetchTime: new Date(),
        rssDescription: template.description || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // 3. 创建请求配置
      const requestConfig = createRequestConfig(config.auth);
      // 4. 创建脚本上下文并执行
      const axiosInstance = axios.create({ timeout: 30000 });
      const context = createScriptContext(config, axiosInstance, requestConfig, logs);
      const result = await executeScript(config, context, axiosInstance, logs);
      // 5. 校验结果
      const validated = validateScriptResult(result);
      // 6. 格式化日期
      validated.forEach(item => {
        item.pubDate = formatDate(item.pubDate);
      });
      const executionTime = Date.now() - startTime;
      logs.push(`[INFO] 模板调试成功，耗时 ${executionTime}ms`);
      return {
        data: {
          success: true,
          logs,
          result: validated,
          executionTime,
        },
        message: "模板调试成功"
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logs.push(`[FATAL] 模板调试失败: ${(error as Error).message}`);
      return {
        data: {
          success: false,
          logs,
          error: (error as Error).message,
          stack: (error as Error).stack,
          executionTime,
        },
        message: "模板调试失败"
      };
    }
  }
}
