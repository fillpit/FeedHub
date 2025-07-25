import * as cheerio from "cheerio";
import * as xpath from "xpath";
import { DOMParser } from "xmldom";
import { v4 as uuidv4 } from "uuid";
import { WebsiteRssSelector } from "../models/WebsiteRssConfig";
import { logger } from "./logger";
import dayjs from "dayjs";

// 判断是否为元素节点
export function isElementNode(node: any): node is { nodeType: number; getAttribute: (name: string) => string | null; toString: () => string; textContent?: string } {
  return node && typeof node === 'object' && node.nodeType === 1 && typeof node.getAttribute === 'function';
}

// 判断是否为属性节点
export function isAttributeNode(node: any): node is { nodeType: number; nodeValue: string | null } {
  return node && typeof node === 'object' && node.nodeType === 2 && 'nodeValue' in node;
}

// 判断是否为文本节点
export function isTextNode(node: any): node is { nodeType: number; nodeValue: string | null } {
  return node && typeof node === 'object' && node.nodeType === 3 && 'nodeValue' in node;
}

// 辅助方法：获取节点文本内容
export function getNodeText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (isTextNode(node)) { // 文本节点
    return String(node.nodeValue || '').trim();
  } else if (isAttributeNode(node)) { // 属性节点
    return String(node.nodeValue || '').trim();
  } else if (isElementNode(node)) { // 元素节点
    return String(node.textContent || '').trim();
  }
  return '';
}

export function extractContentWithCSS(html: string, selector: WebsiteRssSelector, baseUrl?: string, logs?: string[]): any[] {
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
    const titleElement = $element.find(selector.title);
    const title = titleElement.text().trim();
    if (logs) logs.push(`[DEBUG] 标题选择器: ${selector.title}, 找到 ${titleElement.length} 个元素, 提取结果: "${title}"`);
    
    // 提取链接
    const linkElement = $element.find(selector.link);
    const link = linkElement.attr('href');
    if (logs) logs.push(`[DEBUG] 链接选择器: ${selector.link}, 找到 ${linkElement.length} 个元素, 提取结果: "${link}"`);
    
    // 处理相对URL
    let absoluteLink = link;
    if (link && !link.startsWith('http') && baseUrl) {
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
      const dateElement = $element.find(selector.date);
      if (dateElement.length > 0) {
        const dateText = dateElement.text().trim();
        item.pubDate = dateText;
        if (logs) logs.push(`[DEBUG] 日期选择器: ${selector.date}, 找到 ${dateElement.length} 个元素, 提取结果: "${dateText}"`);
      } else {
        if (logs) logs.push(`[DEBUG] 日期选择器: ${selector.date}, 未找到匹配元素`);
      }
    }

    // 提取内容（如果有）
    if (selector.content) {
      const contentElement = $element.find(selector.content);
      if (contentElement.length > 0) {
        item.content = contentElement.html() || '';
        item.contentSnippet = contentElement.text().trim().substring(0, 300);
        if (logs) logs.push(`[DEBUG] 内容选择器: ${selector.content}, 找到 ${contentElement.length} 个元素, 内容长度: ${item.content.length} 字符`);
      } else {
        if (logs) logs.push(`[DEBUG] 内容选择器: ${selector.content}, 未找到匹配元素`);
      }
    }

    // 提取作者（如果有）
    if (selector.author) {
      const authorElement = $element.find(selector.author);
      if (authorElement.length > 0) {
        item.author = authorElement.text().trim();
        if (logs) logs.push(`[DEBUG] 作者选择器: ${selector.author}, 找到 ${authorElement.length} 个元素, 提取结果: "${item.author}"`);
      } else {
        if (logs) logs.push(`[DEBUG] 作者选择器: ${selector.author}, 未找到匹配元素`);
      }
    }
    
    // 提取封面图片（如果有）
    if (selector.image) {
      const imageElement = $element.find(selector.image);
      if (imageElement.length > 0) {
        // 尝试获取图片的src属性
        const imgSrc = imageElement.attr('src');
        if (imgSrc) {
          // 处理相对URL
          if (imgSrc && !imgSrc.startsWith('http') && baseUrl) {
            try {
              const configUrl = new URL(baseUrl);
              item.image = new URL(imgSrc, configUrl.origin).href;
              if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 转换相对URL: "${imgSrc}" -> "${item.image}"`);
            } catch (error) {
              logger.warn(`处理图片相对URL失败: ${(error as Error).message}`);
              if (logs) logs.push(`[WARN] 处理图片相对URL失败: ${(error as Error).message}`);
              item.image = imgSrc; // 保持原始链接
            }
          } else {
            item.image = imgSrc;
            if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 找到 ${imageElement.length} 个元素, 提取结果: "${imgSrc}"`);
          }
        } else {
          if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 找到元素但无src属性`);
        }
      } else {
        if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 未找到匹配元素`);
      }
    }

    if (logs) logs.push(`[INFO] 第 ${index + 1} 个项目提取完成: 标题="${title}", 链接="${absoluteLink}"`);
    items.push(item);
  });

  return items;
}

export function extractContentWithXPath(html: string, selector: WebsiteRssSelector, baseUrl?: string, logs?: string[]): any[] {
  const items: any[] = [];
  const doc = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: () => {},
      fatalError: () => {}
    }
  }).parseFromString(html, "text/html");

  if (logs) logs.push(`[DEBUG] 使用XPath选择器模式`);
  if (logs) logs.push(`[DEBUG] 容器选择器: ${selector.container}`);

  // 获取所有容器节点
  const containerNodesResult = xpath.select(selector.container, doc);
  const containerNodes = Array.isArray(containerNodesResult) ? containerNodesResult : [containerNodesResult];
  
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
    const titleNodesResult = xpath.select(selector.title, containerNode as Node);
    const titleNodes = Array.isArray(titleNodesResult) ? titleNodesResult : [titleNodesResult];
    const title = titleNodes.length > 0 && titleNodes[0] ? getNodeText(titleNodes[0]) : '';
    if (logs) logs.push(`[DEBUG] 标题选择器: ${selector.title}, 找到 ${titleNodes.length} 个节点, 提取结果: "${title}"`);
    
    // 提取链接
    const linkNodesResult = xpath.select(selector.link, containerNode as Node);
    const linkNodes = Array.isArray(linkNodesResult) ? linkNodesResult : [linkNodesResult];
    let link = '';
    if (linkNodes.length > 0 && linkNodes[0]) {
      const linkNode = linkNodes[0];
      if (isAttributeNode(linkNode)) {
        link = String(linkNode.nodeValue || '');
      } else if (isElementNode(linkNode)) {
        link = linkNode.getAttribute('href') || '';
      }
    }
    if (logs) logs.push(`[DEBUG] 链接选择器: ${selector.link}, 找到 ${linkNodes.length} 个节点, 提取结果: "${link}"`);
    
    // 处理相对URL
    let absoluteLink = link;
    if (link && !link.startsWith('http') && baseUrl) {
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
      const dateNodesResult = xpath.select(selector.date, containerNode as Node);
      const dateNodes = Array.isArray(dateNodesResult) ? dateNodesResult : [dateNodesResult];
      if (dateNodes.length > 0 && dateNodes[0]) {
        const dateText = getNodeText(dateNodes[0]);
        item.pubDate = dateText;
        if (logs) logs.push(`[DEBUG] 日期选择器: ${selector.date}, 找到 ${dateNodes.length} 个节点, 提取结果: "${dateText}"`);
      } else {
        if (logs) logs.push(`[DEBUG] 日期选择器: ${selector.date}, 未找到匹配节点`);
      }
    }

    // 提取内容（如果有）
    if (selector.content) {
      const contentNodesResult = xpath.select(selector.content, containerNode as Node);
      const contentNodes = Array.isArray(contentNodesResult) ? contentNodesResult : [contentNodesResult];
      if (contentNodes.length > 0 && contentNodes[0]) {
        const contentNode = contentNodes[0];
        if (isElementNode(contentNode)) {
          item.content = contentNode.toString() || '';
          item.contentSnippet = getNodeText(contentNode).substring(0, 300);
        } else {
          item.content = getNodeText(contentNode);
          item.contentSnippet = item.content.substring(0, 300);
        }
        if (logs) logs.push(`[DEBUG] 内容选择器: ${selector.content}, 找到 ${contentNodes.length} 个节点, 内容长度: ${item.content.length} 字符`);
      } else {
        if (logs) logs.push(`[DEBUG] 内容选择器: ${selector.content}, 未找到匹配节点`);
      }
    }

    // 提取作者（如果有）
    if (selector.author) {
      const authorNodesResult = xpath.select(selector.author, containerNode as Node);
      const authorNodes = Array.isArray(authorNodesResult) ? authorNodesResult : [authorNodesResult];
      if (authorNodes.length > 0 && authorNodes[0]) {
        item.author = getNodeText(authorNodes[0]);
        if (logs) logs.push(`[DEBUG] 作者选择器: ${selector.author}, 找到 ${authorNodes.length} 个节点, 提取结果: "${item.author}"`);
      } else {
        if (logs) logs.push(`[DEBUG] 作者选择器: ${selector.author}, 未找到匹配节点`);
      }
    }
    
    // 提取封面图片（如果有）
    if (selector.image) {
      const imageNodesResult = xpath.select(selector.image, containerNode as Node);
      const imageNodes = Array.isArray(imageNodesResult) ? imageNodesResult : [imageNodesResult];
      if (imageNodes.length > 0 && imageNodes[0]) {
        const imageNode = imageNodes[0];
        let imgSrc = '';
        
        // 如果是属性节点（如 @src），直接获取值
        if (isAttributeNode(imageNode)) {
          imgSrc = String(imageNode.nodeValue || '');
        } 
        // 如果是元素节点（如 <img>），获取src属性
        else if (isElementNode(imageNode)) {
          imgSrc = imageNode.getAttribute('src') || '';
        }
        
        if (imgSrc) {
          // 处理相对URL
          if (imgSrc && !imgSrc.startsWith('http') && baseUrl) {
            try {
              const configUrl = new URL(baseUrl);
              item.image = new URL(imgSrc, configUrl.origin).href;
              if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 转换相对URL: "${imgSrc}" -> "${item.image}"`);
            } catch (error) {
              logger.warn(`处理图片相对URL失败: ${(error as Error).message}`);
              if (logs) logs.push(`[WARN] 处理图片相对URL失败: ${(error as Error).message}`);
              item.image = imgSrc; // 保持原始链接
            }
          } else {
            item.image = imgSrc;
            if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 找到 ${imageNodes.length} 个节点, 提取结果: "${imgSrc}"`);
          }
        } else {
          if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 找到节点但无有效src值`);
        }
      } else {
        if (logs) logs.push(`[DEBUG] 图片选择器: ${selector.image}, 未找到匹配节点`);
      }
    }

    if (logs) logs.push(`[INFO] 第 ${i + 1} 个项目提取完成: 标题="${title}", 链接="${absoluteLink}"`);
    items.push(item);
  }

  return items;
}

export function extractContentFromHtml(html: string, selector: WebsiteRssSelector, baseUrl?: string, logs?: string[]): any[] {
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