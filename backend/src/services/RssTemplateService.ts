import { injectable, inject } from "inversify";
import RssTemplate, { RssTemplateAttributes, TemplateParameter } from "../models/RssTemplate";
import { ApiResponse } from "../core/ApiResponse";
import { logger } from "../utils/logger";
import { createRequestConfig } from "../utils/requestUtils";
import { createScriptContext, executeScript, validateScriptResult } from "../utils/scriptRunner";
import { formatDate } from "../utils/dateUtils";
import axios from "axios";
import { AxiosInstance } from "axios";
import AuthCredential from "../models/AuthCredential";
import { WebsiteRssService } from "./WebsiteRssService";
import WebsiteRssConfig, { WebsiteRssConfigAttributes } from "../models/WebsiteRssConfig";
import { v4 as uuidv4 } from "uuid";
import { TYPES } from "../core/types";
import * as he from 'he';

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
  private websiteRssService: WebsiteRssService;

  constructor(@inject(TYPES.WebsiteRssService) websiteRssService: WebsiteRssService) {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    this.websiteRssService = websiteRssService;
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
   * 根据模板和参数直接创建RSS配置
   */
  async createRssConfigFromTemplate(templateId: number, parameters: Record<string, any>): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
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
      let title = template.name;
      for (const param of template.parameters) {
        const value = parameters[param.name];
        if (value !== undefined) {
          title = title.replace(new RegExp(`\\{\\{${param.name}\\}\\}`, "g"), String(value));
        }
      }

      // 构建配置数据
      const configData: Omit<WebsiteRssConfigAttributes, "id" | "lastContent" | "lastFetchTime"> = {
        key: uuidv4().replace(/-/g, '').slice(0, 8),
        title,
        url,
        fetchMode: "script",
        selector: {
          selectorType: "css",
          container: "",
          title: "",
          link: "",
        },
        script: {
          enabled: true,
          script,
          timeout: 30000,
        },
        auth: {
          enabled: false,
          authType: "none",
        },
        templateId: templateId,
        templateParameters: parameters,
        fetchInterval: 60,
        rssDescription: template.description || title,
        favicon: template.icon || "",
      };

      // 调用WebsiteRssService创建配置
      const result = await this.websiteRssService.addConfig(configData);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message || "创建配置失败",
          error: result.error,
        };
      }

      return {
        success: true,
        data: result.data,
        message: "从模板创建RSS配置成功",
      };
    } catch (error) {
      logger.error("从模板创建RSS配置失败:", error);
      return {
        success: false,
        message: "从模板创建RSS配置失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 批量更新使用指定模板的所有配置
   */
  async updateConfigsByTemplate(templateId: number): Promise<ApiResponseData<{ updatedCount: number; failedConfigs: string[] }>> {
    try {
      const template = await RssTemplate.findByPk(templateId);
      
      if (!template) {
        return {
          success: false,
          message: "模板不存在",
        };
      }

      // 查找所有使用该模板的配置
      const configs = await WebsiteRssConfig.findAll({
        where: { templateId: templateId }
      });

      if (configs.length === 0) {
        return {
          success: true,
          data: { updatedCount: 0, failedConfigs: [] },
          message: "没有找到使用该模板的配置",
        };
      }

      let updatedCount = 0;
      const failedConfigs: string[] = [];

      // 逐个更新配置
      for (const config of configs) {
        try {
          if (!config.templateParameters) {
            failedConfigs.push(`${config.title} (ID: ${config.id}) - 缺少模板参数`);
            continue;
          }

          // 验证参数是否仍然有效
          const validationResult = this.validateParameters(template.parameters, config.templateParameters);
          if (!validationResult.success) {
            failedConfigs.push(`${config.title} (ID: ${config.id}) - 参数验证失败: ${validationResult.message}`);
            continue;
          }

          // 重新生成URL
          let url = template.urlTemplate;
          for (const param of template.parameters) {
            const value = config.templateParameters[param.name];
            if (value !== undefined) {
              url = url.replace(new RegExp(`\\{\\{${param.name}\\}\\}`, "g"), String(value));
            }
          }

          // 重新生成脚本
          let script = template.scriptTemplate;
          for (const param of template.parameters) {
            const value = config.templateParameters[param.name];
            if (value !== undefined) {
              script = script.replace(new RegExp(`\\{\\{${param.name}\\}\\}`, "g"), String(value));
            }
          }

          // 重新生成标题
          let title = template.name;
          for (const param of template.parameters) {
            const value = config.templateParameters[param.name];
            if (value !== undefined) {
              title = title.replace(new RegExp(`\\{\\{${param.name}\\}\\}`, "g"), String(value));
            }
          }

          // 更新配置
          await config.update({
            url,
            title,
            script: {
              ...config.script,
              script,
            },
            rssDescription: template.description || title,
            favicon: template.icon || config.favicon,
          });

          updatedCount++;
        } catch (error) {
          failedConfigs.push(`${config.title} (ID: ${config.id}) - 更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return {
        success: true,
        data: { updatedCount, failedConfigs },
        message: `批量更新完成，成功更新 ${updatedCount} 个配置${failedConfigs.length > 0 ? `，${failedConfigs.length} 个配置更新失败` : ''}`,
      };
    } catch (error) {
      logger.error("批量更新配置失败:", error);
      return {
        success: false,
        message: "批量更新配置失败",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 获取使用指定模板的配置列表
   */
  async getConfigsByTemplate(templateId: number): Promise<ApiResponseData<WebsiteRssConfigAttributes[]>> {
    try {
      const configs = await WebsiteRssConfig.findAll({
        where: { templateId: templateId }
      });

      return {
        success: true,
        data: configs,
        message: "获取模板相关配置成功",
      };
    } catch (error) {
      logger.error("获取模板相关配置失败:", error);
      return {
        success: false,
        message: "获取模板相关配置失败",
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
          urlTemplate: "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?type=video&host_mid={{userId}}&platform=web",
          scriptTemplate: `
            let items = [];

            try {
              // 使用utils.fetchApi会自动应用配置的授权信息
              const result = await utils.fetchApi(url);

              // 处理返回的数据
              result.data.data.items.forEach((post, index)=> {
                // 文章和视频取的不一样
                let article = utils.safeGet(post.modules.module_dynamic.major, 'article', post.modules.module_dynamic.major.archive)
                items.push({
                  image: utils.safeGet(article, 'cover', ''),
                  title: utils.safeGet(article, 'title', ''),
                  link: utils.safeGet(article, 'jump_url', ''),
                  content: utils.safeGet(article, 'desc', ''),
                  author: utils.safeGet(post.modules.module_author, 'name', ''),
                  pubDate: utils.parseDate(post.modules.module_author.pub_time)
                });
              });
              
            } catch (error) {
              console.error('API请求失败:', error.message);
            }

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
        }
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
