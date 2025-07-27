import { WebsiteRssSelector } from "../models/WebsiteRssConfig";
import { logger } from "./logger";

export function validateselector(selector: WebsiteRssSelector): void {
  logger.info(`开始验证选择器: ${JSON.stringify(selector)}`);
  try {
    if (
      !selector.selectorType ||
      (selector.selectorType !== "css" && selector.selectorType !== "xpath")
    ) {
      logger.error(`选择器类型无效: ${selector.selectorType}`);
      throw new Error("选择器类型必须为 'css' 或 'xpath'");
    }
    if (!selector.container) {
      logger.error("缺少必需的container选择器");
      throw new Error("缺少必需的container选择器");
    }
    if (!selector.title) {
      logger.error("缺少必需的title选择器");
      throw new Error("缺少必需的title选择器");
    }
    if (!selector.link) {
      logger.error("缺少必需的link选择器");
      throw new Error("缺少必需的link选择器");
    }
    logger.info("选择器验证通过");
  } catch (error) {
    logger.error(`选择器验证失败: ${(error as Error).message}`);
    throw error;
  }
}
