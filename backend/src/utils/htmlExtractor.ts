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

export function extractContentWithCSS(html: string, selector: WebsiteRssSelector, baseUrl?: string): any[] {
  const $ = cheerio.load(html);
  const items: any[] = [];

  $(selector.container).each((index, element) => {
    const $element = $(element);
    const title = $element.find(selector.title).text().trim();
    const link = $element.find(selector.link).attr('href');
    
    // 处理相对URL
    let absoluteLink = link;
    if (link && !link.startsWith('http') && baseUrl) {
      try {
        const configUrl = new URL(baseUrl);
        absoluteLink = new URL(link, configUrl.origin).href;
      } catch (error) {
        logger.warn(`处理相对URL失败: ${(error as Error).message}`);
        absoluteLink = link; // 保持原始链接
      }
    }

    const item: any = {
      title,
      link: absoluteLink,
      guid: absoluteLink || uuidv4(),
    };

    // 提取日期（如果有）
    if (selector.date && $element.find(selector.date).length > 0) {
      const dateText = $element.find(selector.date).text().trim();
      item.pubDate = dateText;
    }

    // 提取内容（如果有）
    if (selector.content && $element.find(selector.content).length > 0) {
      item.content = $element.find(selector.content).html() || '';
      item.contentSnippet = $element.find(selector.content).text().trim().substring(0, 300);
    }

    // 提取作者（如果有）
    if (selector.author && $element.find(selector.author).length > 0) {
      item.author = $element.find(selector.author).text().trim();
    }
    
    // 提取封面图片（如果有）
    if (selector.image && $element.find(selector.image).length > 0) {
      // 尝试获取图片的src属性
      const imgSrc = $element.find(selector.image).attr('src');
      if (imgSrc) {
        // 处理相对URL
        if (imgSrc && !imgSrc.startsWith('http') && baseUrl) {
          try {
            const configUrl = new URL(baseUrl);
            item.image = new URL(imgSrc, configUrl.origin).href;
          } catch (error) {
            logger.warn(`处理图片相对URL失败: ${(error as Error).message}`);
            item.image = imgSrc; // 保持原始链接
          }
        } else {
          item.image = imgSrc;
        }
      }
    }

    items.push(item);
  });

  return items;
}

export function extractContentWithXPath(html: string, selector: WebsiteRssSelector, baseUrl?: string): any[] {
  const items: any[] = [];
  const doc = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: () => {},
      fatalError: () => {}
    }
  }).parseFromString(html, "text/html");

  // 获取所有容器节点
  const containerNodesResult = xpath.select(selector.container, doc);
  const containerNodes = Array.isArray(containerNodesResult) ? containerNodesResult : [containerNodesResult];
  
  // 遍历每个容器节点
  for (let i = 0; i < containerNodes.length; i++) {
    const containerNode = containerNodes[i];
    if (!containerNode) continue;
    
    // 提取标题
    const titleNodesResult = xpath.select(selector.title, containerNode as Node);
    const titleNodes = Array.isArray(titleNodesResult) ? titleNodesResult : [titleNodesResult];
    const title = titleNodes.length > 0 && titleNodes[0] ? getNodeText(titleNodes[0]) : '';
    
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
    
    // 处理相对URL
    let absoluteLink = link;
    if (link && !link.startsWith('http') && baseUrl) {
      try {
        const configUrl = new URL(baseUrl);
        absoluteLink = new URL(link, configUrl.origin).href;
      } catch (error) {
        logger.warn(`处理相对URL失败: ${(error as Error).message}`);
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
      }
    }

    // 提取作者（如果有）
    if (selector.author) {
      const authorNodesResult = xpath.select(selector.author, containerNode as Node);
      const authorNodes = Array.isArray(authorNodesResult) ? authorNodesResult : [authorNodesResult];
      if (authorNodes.length > 0 && authorNodes[0]) {
        item.author = getNodeText(authorNodes[0]);
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
        
        // 处理相对URL
        if (imgSrc && !imgSrc.startsWith('http') && baseUrl) {
          try {
            const configUrl = new URL(baseUrl);
            item.image = new URL(imgSrc, configUrl.origin).href;
          } catch (error) {
            logger.warn(`处理图片相对URL失败: ${(error as Error).message}`);
            item.image = imgSrc; // 保持原始链接
          }
        } else if (imgSrc) {
          item.image = imgSrc;
        }
      }
    }

    items.push(item);
  }

  return items;
}

export function extractContentFromHtml(html: string, selector: WebsiteRssSelector, baseUrl?: string): any[] {
  try {
    if (selector.selectorType === "xpath") {
      return extractContentWithXPath(html, selector, baseUrl);
    } else {
      return extractContentWithCSS(html, selector, baseUrl);
    }
  } catch (error) {
    logger.error(`解析HTML内容失败: ${(error as Error).message}`);
    throw new Error(`解析HTML内容失败: ${(error as Error).message}`);
  }
}