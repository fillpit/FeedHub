import * as cheerio from "cheerio";
import * as xpath from "xpath";
import { DOMParser } from "xmldom";
import { v4 as uuidv4 } from "uuid";
import { WebsiteRssSelector, SelectorField } from "../models/WebsiteRssConfig";
import { logger } from "./logger";
import { formatDate } from "../utils/dateUtils";

// 判断是否为元素节点
export function isElementNode(node: any): node is {
  nodeType: number;
  getAttribute: (name: string) => string | null;
  toString: () => string;
  textContent?: string;
} {
  return (
    node &&
    typeof node === "object" &&
    node.nodeType === 1 &&
    typeof node.getAttribute === "function"
  );
}

// 判断是否为属性节点
export function isAttributeNode(node: any): node is { nodeType: number; nodeValue: string | null } {
  return node && typeof node === "object" && node.nodeType === 2 && "nodeValue" in node;
}

// 判断是否为文本节点
export function isTextNode(node: any): node is { nodeType: number; nodeValue: string | null } {
  return node && typeof node === "object" && node.nodeType === 3 && "nodeValue" in node;
}

// 辅助方法：获取节点文本内容
export function getNodeText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node.trim();
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (isTextNode(node)) {
    // 文本节点
    return String(node.nodeValue || "").trim();
  } else if (isAttributeNode(node)) {
    // 属性节点
    return String(node.nodeValue || "").trim();
  } else if (isElementNode(node)) {
    // 元素节点
    return String(node.textContent || "").trim();
  }
  return "";
}

// 辅助方法：应用正则表达式处理
function applyRegexProcessing(text: string, field: SelectorField, logs?: string[]): string {
  if (!field.regexPattern || !text) {
    return text;
  }

  try {
    const flags = field.regexFlags || '';
    const regex = new RegExp(field.regexPattern, flags);
    const match = text.match(regex);
    
    if (match) {
      const groupIndex = field.regexGroup || 0;
      const result = match[groupIndex] || '';
      
      if (logs) {
        logs.push(`[DEBUG] 正则处理: 模式="${field.regexPattern}", 标志="${flags}", 组索引=${groupIndex}, 原文="${text}", 结果="${result}"`);
      }
      
      return result;
    } else {
      if (logs) {
        logs.push(`[DEBUG] 正则处理: 模式="${field.regexPattern}" 未匹配到内容, 原文="${text}"`);
      }
      return '';
    }
  } catch (error) {
    const errorMsg = `正则表达式处理失败: ${(error as Error).message}`;
    if (logs) {
      logs.push(`[ERROR] ${errorMsg}`);
    }
    logger.error(errorMsg);
    return text; // 返回原始文本
  }
}

// 辅助方法：根据SelectorField配置提取内容（CSS选择器）
function extractWithSelectorField($element: any, field: SelectorField, logs?: string[]): string {
  const elements = $element.find(field.selector);
  if (elements.length === 0) return "";

  let text = "";
  if (field.extractType === "attr" && field.attrName) {
    text = elements.attr(field.attrName) || "";
  } else {
    text = elements.text().trim();
  }

  // 应用正则处理
  return applyRegexProcessing(text, field, logs);
}

// 辅助方法：根据SelectorField配置提取内容（XPath选择器）
function extractWithSelectorFieldXPath(containerNode: Node, field: SelectorField, logs?: string[]): string {
  const nodesResult = xpath.select(field.selector, containerNode);
  const nodes = Array.isArray(nodesResult) ? nodesResult : [nodesResult];

  if (nodes.length === 0 || !nodes[0]) return "";

  const node = nodes[0];
  let text = "";

  if (field.extractType === "attr" && field.attrName) {
    if (isElementNode(node)) {
      // 忽略大小写匹配属性名
      // 首先尝试直接获取
      const directValue = node.getAttribute(field.attrName);
      if (directValue) {
        text = directValue;
      } else {
        // 如果直接获取失败，尝试忽略大小写匹配
        if ((node as any).attributes) {
          const attributes = (node as any).attributes;
          for (let i = 0; i < attributes.length; i++) {
            const attr = attributes.item(i);
            if (attr && attr.name.toLowerCase() === field.attrName.toLowerCase()) {
              text = attr.value || "";
              break;
            }
          }
        }
      }
    }
  } else {
    text = getNodeText(node);
  }

  // 应用正则处理
  return applyRegexProcessing(text, field, logs);
}

export function extractContentWithCSS(
  html: string,
  selector: WebsiteRssSelector,
  baseUrl?: string,
  logs?: string[]
): any[] {
  const $ = cheerio.load(html);
  const items: any[] = [];

  if (logs) logs.push(`[DEBUG] 使用CSS选择器模式`);
  if (logs) logs.push(`[DEBUG] 容器选择器: ${selector.container}`);

  const containerElements = $(selector.container);
  if (logs) logs.push(`[INFO] 找到 ${containerElements.length} 个容器元素`);

  if (containerElements.length === 0) {
    if (logs) logs.push(`[WARN] 未找到匹配容器选择器的元素: ${selector.container}`);
    return items;
  }

  $(selector.container).each((index, element) => {
    const $element = $(element);
    if (logs) logs.push(`[DEBUG] 处理第 ${index + 1} 个容器元素`);

    // 提取标题
    const title = extractWithSelectorField($element, selector.title, logs);
    if (logs)
      logs.push(
        `[DEBUG] 标题选择器: ${selector.title.selector}, 提取类型: ${selector.title.extractType}, 提取结果: "${title}"`
      );

    // 提取链接
    let link = "";
    if (selector.link) {
      link = extractWithSelectorField($element, selector.link, logs);
      if (logs)
        logs.push(
          `[DEBUG] 链接选择器: ${selector.link.selector}, 提取类型: ${selector.link.extractType}, 提取结果: "${link}"`
        );
    }

    // 处理相对URL
    let absoluteLink = link;
    if (link && !link.startsWith("http") && baseUrl) {
      try {
        const configUrl = new URL(baseUrl);
        absoluteLink = new URL(link, configUrl.origin).href;
        if (logs) logs.push(`[DEBUG] 转换相对URL: "${link}" -> "${absoluteLink}"`);
      } catch (error) {
        logger.warn(`处理相对URL失败: ${(error as Error).message}`);
        if (logs) logs.push(`[WARN] 处理相对URL失败: ${(error as Error).message}`);
        absoluteLink = link; // 保持原始链接
      }
    }

    const item: any = {
      title,
      link: absoluteLink,
      guid: absoluteLink || uuidv4(),
    };

    // 提取日期（如果有）
    if (selector.date) {
      const dateText = extractWithSelectorField($element, selector.date, logs);
      if (dateText) {
        item.pubDate = dateText;
        if (logs)
          logs.push(
            `[DEBUG] 日期选择器: ${selector.date.selector}, 提取类型: ${selector.date.extractType}, 提取结果: "${dateText}"`
          );
      } else {
        if (logs) logs.push(`[DEBUG] 日期选择器: ${selector.date.selector}, 未找到匹配元素`);
      }
    }

    // 提取内容（如果有）
    const contentText = extractWithSelectorField($element, selector.content, logs);
    if (contentText) {
      // 对于内容，如果是文本提取，我们需要获取HTML内容
      if (selector.content.extractType === "text") {
        const contentElement = $element.find(selector.content.selector);
        item.content = contentElement.html() || "";
        item.contentSnippet = contentText.substring(0, 300);
      } else {
        item.content = contentText;
        item.contentSnippet = contentText.substring(0, 300);
      }
      if (logs)
        logs.push(
          `[DEBUG] 内容选择器: ${selector.content.selector}, 提取类型: ${selector.content.extractType}, 内容长度: ${item.content.length} 字符`
        );
    } else {
      if (logs) logs.push(`[DEBUG] 内容选择器: ${selector.content.selector}, 未找到匹配元素`);
    }

    // 提取作者（如果有）
    if (selector.author) {
      const authorText = extractWithSelectorField($element, selector.author, logs);
      if (authorText) {
        item.author = authorText;
        if (logs)
          logs.push(
            `[DEBUG] 作者选择器: ${selector.author.selector}, 提取类型: ${selector.author.extractType}, 提取结果: "${authorText}"`
          );
      } else {
        if (logs) logs.push(`[DEBUG] 作者选择器: ${selector.author.selector}, 未找到匹配元素`);
      }
    }

    if (logs)
      logs.push(`[INFO] 第 ${index + 1} 个项目提取完成: 标题="${title}", 链接="${absoluteLink}"`);
    items.push(item);
  });

  return items;
}

export function extractContentWithXPath(
  html: string,
  selector: WebsiteRssSelector,
  baseUrl?: string,
  logs?: string[]
): any[] {
  const items: any[] = [];

  if (logs) logs.push(`[DEBUG] 使用XPath选择器模式`);
  
  // 创建自定义错误处理器，忽略重复属性等非致命错误
  const errorHandler = {
    warning: (msg: string) => {
      // 忽略重复属性警告
      if (msg.includes('redefined') || msg.includes('duplicate')) {
        if (logs) logs.push(`[WARN] 忽略HTML解析警告: ${msg}`);
        return;
      }
      if (logs) logs.push(`[WARN] HTML解析警告: ${msg}`);
    },
    error: (msg: string) => {
      // 对于重复属性错误，降级为警告
      if (msg.includes('redefined') || msg.includes('duplicate')) {
        if (logs) logs.push(`[WARN] 忽略HTML解析错误: ${msg}`);
        return;
      }
      throw new Error(`HTML解析错误: ${msg}`);
    },
    fatalError: (msg: string) => {
      throw new Error(`HTML解析致命错误: ${msg}`);
    }
  };
  console.log('html', html);
  const doc = new DOMParser({
    errorHandler: errorHandler
  }).parseFromString(html, 'text/html');

  // 检查解析是否成功
  if (!doc || doc.documentElement.nodeName === "parsererror") {
    throw new Error("HTML解析失败");
  }

  if (logs) logs.push(`[DEBUG] 容器选择器: ${selector.container}`);
  const containerNodesResult: any = xpath.select(selector.container, doc);

  const containerNodes = Array.isArray(containerNodesResult)
    ? containerNodesResult
    : [containerNodesResult];

  if (logs) logs.push(`[INFO] 找到 ${containerNodes.length} 个容器节点`);

  if (containerNodes.length === 0) {
    if (logs) logs.push(`[WARN] 未找到匹配容器选择器的节点: ${selector.container}`);
    return items;
  }

  // 遍历每个容器节点
  for (let i = 0; i < containerNodes.length; i++) {
    const containerNode = containerNodes[i];
    if (!containerNode) continue;

    if (logs) logs.push(`[DEBUG] 处理第 ${i + 1} 个容器节点`);

    // 提取标题
    const title = extractWithSelectorFieldXPath(containerNode as Node, selector.title, logs);
    if (logs)
      logs.push(
        `[DEBUG] 标题选择器: ${selector.title.selector}, 提取类型: ${selector.title.extractType}, 提取结果: "${title}"`
      );

    // 提取链接
    let link = "";
    if (selector.link) {
      link = extractWithSelectorFieldXPath(containerNode as Node, selector.link, logs);
      if (logs)
        logs.push(
          `[DEBUG] 链接选择器: ${selector.link.selector}, 提取类型: ${selector.link.extractType}, 提取结果: "${link}"`
        );
    }

    // 处理相对URL
    let absoluteLink = link;
    if (link && !link.startsWith("http") && baseUrl) {
      try {
        const configUrl = new URL(baseUrl);
        absoluteLink = new URL(link, configUrl.origin).href;
        if (logs) logs.push(`[DEBUG] 转换相对URL: "${link}" -> "${absoluteLink}"`);
      } catch (error) {
        logger.warn(`处理相对URL失败: ${(error as Error).message}`);
        if (logs) logs.push(`[WARN] 处理相对URL失败: ${(error as Error).message}`);
        absoluteLink = link;
      }
    }

    const item: any = {
      title,
      link: absoluteLink,
      guid: absoluteLink || uuidv4(),
    };

    // 提取日期（如果有）
    if (selector.date) {
      const dateText = extractWithSelectorFieldXPath(containerNode as Node, selector.date, logs);
      if (dateText) {
        item.pubDate = formatDate(dateText);
        if (logs)
          logs.push(
            `[DEBUG] 日期选择器: ${selector.date.selector}, 提取类型: ${selector.date.extractType}, 提取结果: "${dateText}"`
          );
      } else {
        if (logs) logs.push(`[DEBUG] 日期选择器: ${selector.date.selector}, 未找到匹配节点`);
      }
    }

    // 提取内容（如果有）
    const contentText = extractWithSelectorFieldXPath(containerNode as Node, selector.content, logs);
    if (contentText) {
      // 对于内容，如果是文本提取，我们需要获取HTML内容
      if (selector.content.extractType === "text") {
        const contentNodesResult = xpath.select(selector.content.selector, containerNode as Node);
        const contentNodes = Array.isArray(contentNodesResult)
          ? contentNodesResult
          : [contentNodesResult];
        if (contentNodes.length > 0 && contentNodes[0] && isElementNode(contentNodes[0])) {
          item.content = contentNodes[0].toString() || "";
        } else {
          item.content = contentText;
        }
        item.contentSnippet = contentText.substring(0, 300);
      } else {
        item.content = contentText;
        item.contentSnippet = contentText.substring(0, 300);
      }
      if (logs)
        logs.push(
          `[DEBUG] 内容选择器: ${selector.content.selector}, 提取类型: ${selector.content.extractType}, 内容长度: ${item.content.length} 字符`
        );
    } else {
      if (logs) logs.push(`[DEBUG] 内容选择器: ${selector.content.selector}, 未找到匹配节点`);
    }

    // 提取作者（如果有）
    if (selector.author) {
      const authorText = extractWithSelectorFieldXPath(containerNode as Node, selector.author, logs);
      if (authorText) {
        item.author = authorText;
        if (logs)
          logs.push(
            `[DEBUG] 作者选择器: ${selector.author.selector}, 提取类型: ${selector.author.extractType}, 提取结果: "${authorText}"`
          );
      } else {
        if (logs) logs.push(`[DEBUG] 作者选择器: ${selector.author.selector}, 未找到匹配节点`);
      }
    }

    if (logs)
      logs.push(`[INFO] 第 ${i + 1} 个项目提取完成: 标题="${title}", 链接="${absoluteLink}"`);
    items.push(item);
  }

  return items;
}

export function extractContentFromHtml(
  html: string,
  selector: WebsiteRssSelector,
  baseUrl?: string,
  logs?: string[]
): any[] {
  try {
    if (selector.selectorType === "xpath") {
      return extractContentWithXPath(html, selector, baseUrl, logs);
    } else {
      return extractContentWithCSS(html, selector, baseUrl, logs);
    }
  } catch (error) {
    logger.error(`解析HTML内容失败: ${(error as Error).message}`);
    if (logs) logs.push(`[ERROR] 解析HTML内容失败: ${(error as Error).message}`);
    throw new Error(`解析HTML内容失败: ${(error as Error).message}`);
  }
}
