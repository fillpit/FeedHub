import * as cheerio from "cheerio";
import { FeedItem, WebsiteRssSelector, SelectorField, ScrapeResult, ScrapeDebugInfo, ScrapeItemDebug, ScrapeFieldDebug } from "../types/feed";

/**
 * 网页抓取服务 - 带诊断和调试支持
 */

interface ScrapeOptions {
  url: string;
  selector: WebsiteRssSelector;
  authHeaders?: Record<string, string>;
  debug?: boolean;
}

interface ExtractFieldResult {
  value: string;
  debug: ScrapeFieldDebug;
}

interface XPathModule {
  select: (selector: string, doc: unknown) => unknown[];
}

interface XmlDomModule {
  DOMParser: new () => {
    parseFromString: (xml: string, mimeType: string) => unknown;
  };
}

const addLog = (logs: string[], msg: string) => {
  logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
};

export async function scrapeWebsite({ url, selector, authHeaders = {}, debug = false }: ScrapeOptions): Promise<ScrapeResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  addLog(logs, `开始抓取网站: ${url}`);
  addLog(logs, `解析模式: ${selector.selectorType}`);

  let html: string;
  try {
    html = await fetchHtml(url, authHeaders);
    addLog(logs, `获取 HTML 成功, 长度: ${html.length} 字符`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(logs, `网络请求失败: ${message}`);
    return { items: [], error: `网络请求失败: ${message}`, executionTime: Date.now() - startTime };
  }

  const result = selector.selectorType === "xpath"
    ? await runXPathScraping(html, selector, startTime, debug, logs)
    : await runCheerioScraping(html, selector, startTime, debug, logs);

  return result;
}

async function runCheerioScraping(
  html: string,
  selector: WebsiteRssSelector,
  startTime: number,
  debug: boolean,
  logs: string[]
): Promise<ScrapeResult> {
  try {
    addLog(logs, "加载 cheerio 模块成功，开始解析 HTML...");
    return parseWithCheerio(html, selector, startTime, debug, logs);
  } catch (error) {
    console.error("Scraping parse error:", error);
    const message = error instanceof Error ? error.message : String(error);
    addLog(logs, `解析失败: ${message}`);
    return { items: [], error: `解析失败: ${message}`, executionTime: Date.now() - startTime };
  }
}

async function runXPathScraping(
  html: string,
  selector: WebsiteRssSelector,
  startTime: number,
  debug: boolean,
  logs: string[]
): Promise<ScrapeResult> {
  const xpathModule = await tryLoadXpath();
  const xmldomModule = await tryLoadXmldom();
  if (!xpathModule || !xmldomModule) {
    addLog(logs, "未找到 xpath 或 xmldom 依赖包");
    return { items: [], error: "解析模块 (xpath/xmldom) 不可用，请重试", executionTime: Date.now() - startTime };
  }
  try {
    addLog(logs, "加载 XPath 解析依赖包成功，开始解析 XML/HTML...");
    return parseWithXPath(html, selector, xpathModule, xmldomModule, startTime, debug, logs);
  } catch (error) {
    console.error("Scraping parse XPath error:", error);
    const message = error instanceof Error ? error.message : String(error);
    addLog(logs, `XPath 解析失败: ${message}`);
    return { items: [], error: `解析失败 (XPath): ${message}`, executionTime: Date.now() - startTime };
  }
}

async function fetchHtml(url: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FeedHub/1.0)", ...headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.text();
}

async function tryLoadXpath(): Promise<XPathModule | null> {
  try {
    return require("xpath") as XPathModule;
  } catch {
    return null;
  }
}

async function tryLoadXmldom(): Promise<XmlDomModule | null> {
  try {
    return require("xmldom") as XmlDomModule;
  } catch {
    return null;
  }
}

function parseWithCheerio(
  html: string,
  selector: WebsiteRssSelector,
  startTime: number,
  debug: boolean,
  logs: string[]
): ScrapeResult {
  const $ = cheerio.load(html);
  const items: FeedItem[] = [];
  const debugItems: ScrapeItemDebug[] = [];

  const containerSelector = selector.container?.trim() || "";
  if (!containerSelector) {
    addLog(logs, "错误：列表容器选择器为空！");
    return { items: [], executionTime: Date.now() - startTime };
  }

  const containerNodes = $(containerSelector);
  addLog(logs, `使用列表容器选择器 "${containerSelector}" 匹配到 ${containerNodes.length} 个节点`);

  const debugInfo: ScrapeDebugInfo = {
    htmlLength: html.length,
    containerCount: containerNodes.length,
    selectorType: "css",
    items: debugItems,
    logs,
  };

  processCheerioNodes($, containerNodes, selector, items, debugItems, debug, logs);

  return {
    items,
    executionTime: Date.now() - startTime,
    debug: debug ? debugInfo : undefined,
  };
}

function processCheerioNodes(
  $: cheerio.CheerioAPI,
  containerNodes: cheerio.Cheerio<cheerio.AnyNode>,
  selector: WebsiteRssSelector,
  items: FeedItem[],
  debugItems: ScrapeItemDebug[],
  debug: boolean,
  logs: string[]
): void {
  const maxDebugCount = 10;
  containerNodes.each((idx: number, el: cheerio.AnyNode) => {
    const container = $(el);
    const { item, itemDebug } = processSingleCheerioNode(container, selector, idx);

    if (item) {
      items.push(item);
    }
    
    if (debug && idx < maxDebugCount) {
      debugItems.push(itemDebug);
      addLog(logs, `容器 #${idx + 1}: ${itemDebug.passed ? "成功解析" : `跳过 (${itemDebug.reason})`}`);
    }
  });
}

function processSingleCheerioNode(
  container: cheerio.Cheerio<cheerio.AnyNode>,
  selector: WebsiteRssSelector,
  index: number
): { item: FeedItem | null; itemDebug: ScrapeItemDebug } {
  const fieldsDebug: ScrapeFieldDebug[] = [];
  const { value: title, debug: titleDebug } = extractFieldDebug(container, selector.title, "title");
  fieldsDebug.push(titleDebug);

  const { value: link, debug: linkDebug } = extractFieldDebug(container, selector.link, "link");
  fieldsDebug.push(linkDebug);

  const { value: content, debug: contentDebug } = extractFieldDebug(container, selector.content, "content");
  fieldsDebug.push(contentDebug);

  const { value: author, debug: authorDebug } = extractFieldDebug(container, selector.author, "author");
  fieldsDebug.push(authorDebug);

  const { value: date, debug: dateDebug } = extractFieldDebug(container, selector.date, "date");
  fieldsDebug.push(dateDebug);

  const containerHtmlSnippet = getContainerHtmlSnippet(container);
  const passed = !!title;
  const reason = passed ? undefined : "标题 (Title) 提取结果为空";

  const item: FeedItem | null = passed
    ? { title, link: link || "", content: content || undefined, author: author || undefined, pubDate: date || undefined }
    : null;

  return {
    item,
    itemDebug: { index, containerHtmlSnippet, fields: fieldsDebug, passed, reason },
  };
}

function getContainerHtmlSnippet(container: cheerio.Cheerio<cheerio.AnyNode>): string {
  try {
    const outerHtml = container.toString() || "";
    return outerHtml.length > 300 ? outerHtml.slice(0, 300) + "..." : outerHtml;
  } catch {
    return "[无法获取 HTML 片段]";
  }
}

function extractFieldDebug(
  container: cheerio.Cheerio<cheerio.AnyNode>,
  field: SelectorField | undefined,
  fieldName: string
): ExtractFieldResult {
  const selector = field?.selector ?? "";
  const extractType = field?.extractType ?? "text";
  const debug: ScrapeFieldDebug = {
    name: fieldName,
    selector,
    extractType,
    matched: false,
    rawValue: "",
    finalValue: "",
  };

  if (!field || !selector.trim()) {
    return { value: "", debug };
  }

  const el = container.find(selector).first();
  if (!el.length) {
    debug.error = `未找到匹配选择器 "${selector}" 的子元素`;
    return { value: "", debug };
  }

  debug.matched = true;
  const rawValue = getElementRawValue(el, field);
  debug.rawValue = rawValue;

  const finalValue = applyRegex(rawValue, field);
  debug.finalValue = finalValue;

  return { value: finalValue, debug };
}

function getElementRawValue(el: cheerio.Cheerio<cheerio.AnyNode>, field: SelectorField): string {
  if (field.extractType === "attr") {
    return el.attr(field.attrName ?? "") ?? "";
  }
  if (field.extractType === "html") {
    return el.html() ?? "";
  }
  return el.text().trim();
}

function applyRegex(value: string, field: SelectorField): string {
  if (!field.regexPattern) return value;
  try {
    const regex = new RegExp(field.regexPattern, field.regexFlags ?? "");
    const match = value.match(regex);
    if (!match) return value;
    const group = field.regexGroup ?? 1;
    return match[group] ?? value;
  } catch {
    return value;
  }
}

export function buildAuthHeaders(credential: Record<string, string>, authType: string): Record<string, string> {
  switch (authType) {
    case "cookie":
      return { Cookie: credential.cookie ?? "" };
    case "token":
      return { Authorization: `Bearer ${credential.token ?? ""}` };
    case "basic": {
      const encoded = Buffer.from(`${credential.username ?? ""}:${credential.password ?? ""}`).toString("base64");
      return { Authorization: `Basic ${encoded}` };
    }
    default:
      return {};
  }
}

function parseWithXPath(
  html: string,
  selector: WebsiteRssSelector,
  xpathModule: XPathModule,
  xmldomModule: XmlDomModule,
  startTime: number,
  debug: boolean,
  logs: string[]
): ScrapeResult {
  const $ = cheerio.load(html);
  const cleanXml = $.xml();
  const doc = new xmldomModule.DOMParser().parseFromString(cleanXml, "text/xml");
  const items: FeedItem[] = [];
  const debugItems: ScrapeItemDebug[] = [];

  const containerSelector = selector.container?.trim() || "";
  if (!containerSelector) {
    addLog(logs, "错误：XPath 列表容器选择器为空！");
    return { items: [], executionTime: Date.now() - startTime };
  }

  const containerNodes = xpathModule.select(containerSelector, doc);
  const nodeCount = Array.isArray(containerNodes) ? containerNodes.length : 0;
  addLog(logs, `使用 XPath 列表容器 "${containerSelector}" 匹配到 ${nodeCount} 个节点`);

  const debugInfo: ScrapeDebugInfo = {
    htmlLength: html.length,
    containerCount: nodeCount,
    selectorType: "xpath",
    items: debugItems,
    logs,
  };

  if (Array.isArray(containerNodes)) {
    processXPathNodes(containerNodes, selector, xpathModule, items, debugItems, debug, logs);
  }

  return {
    items,
    executionTime: Date.now() - startTime,
    debug: debug ? debugInfo : undefined,
  };
}

function processXPathNodes(
  containerNodes: unknown[],
  selector: WebsiteRssSelector,
  xpathModule: XPathModule,
  items: FeedItem[],
  debugItems: ScrapeItemDebug[],
  debug: boolean,
  logs: string[]
): void {
  const maxDebugCount = 10;
  containerNodes.forEach((node, idx) => {
    const { item, itemDebug } = processSingleXPathNode(node, selector, xpathModule, idx);

    if (item) {
      items.push(item);
    }

    if (debug && idx < maxDebugCount) {
      debugItems.push(itemDebug);
      addLog(logs, `XPath 容器 #${idx + 1}: ${itemDebug.passed ? "成功解析" : `跳过 (${itemDebug.reason})`}`);
    }
  });
}

function processSingleXPathNode(
  containerNode: unknown,
  selector: WebsiteRssSelector,
  xpathModule: XPathModule,
  index: number
): { item: FeedItem | null; itemDebug: ScrapeItemDebug } {
  const fieldsDebug: ScrapeFieldDebug[] = [];
  const { value: title, debug: titleDebug } = extractFieldXPathDebug(containerNode, selector.title, "title", xpathModule);
  fieldsDebug.push(titleDebug);

  const { value: link, debug: linkDebug } = extractFieldXPathDebug(containerNode, selector.link, "link", xpathModule);
  fieldsDebug.push(linkDebug);

  const { value: content, debug: contentDebug } = extractFieldXPathDebug(containerNode, selector.content, "content", xpathModule);
  fieldsDebug.push(contentDebug);

  const { value: author, debug: authorDebug } = extractFieldXPathDebug(containerNode, selector.author, "author", xpathModule);
  fieldsDebug.push(authorDebug);

  const { value: date, debug: dateDebug } = extractFieldXPathDebug(containerNode, selector.date, "date", xpathModule);
  fieldsDebug.push(dateDebug);

  const containerHtmlSnippet = getXPathNodeSnippet(containerNode);
  const passed = !!title;
  const reason = passed ? undefined : "标题 (Title) XPath 提取结果为空";

  const item: FeedItem | null = passed
    ? { title, link: link || "", content: content || undefined, author: author || undefined, pubDate: date || undefined }
    : null;

  return {
    item,
    itemDebug: { index, containerHtmlSnippet, fields: fieldsDebug, passed, reason },
  };
}

function getXPathNodeSnippet(node: unknown): string {
  try {
    const outerHtml = node ? String(node) : "";
    return outerHtml.length > 300 ? outerHtml.slice(0, 300) + "..." : outerHtml;
  } catch {
    return "[无法获取 XPath 节点片段]";
  }
}

function extractFieldXPathDebug(
  containerNode: unknown,
  field: SelectorField | undefined,
  fieldName: string,
  xpathModule: XPathModule
): ExtractFieldResult {
  const selector = field?.selector ?? "";
  const extractType = field?.extractType ?? "text";
  const debug: ScrapeFieldDebug = {
    name: fieldName,
    selector,
    extractType,
    matched: false,
    rawValue: "",
    finalValue: "",
  };

  if (!field || !selector.trim()) {
    return { value: "", debug };
  }

  const nodes = xpathModule.select(selector, containerNode);
  const el = Array.isArray(nodes) && nodes.length > 0 ? nodes[0] : null;
  if (!el) {
    debug.error = `未找到匹配 XPath "${selector}" 的子元素`;
    return { value: "", debug };
  }

  debug.matched = true;
  const rawValue = extractNodeValue(el, field);
  debug.rawValue = rawValue;

  const finalValue = applyRegex(rawValue, field);
  debug.finalValue = finalValue;

  return { value: finalValue, debug };
}

function extractNodeValue(el: unknown, field: SelectorField): string {
  const node = el as { nodeType: number; nodeValue?: string; textContent?: string; getAttribute?: (name: string) => string | null };
  if (node.nodeType === 2) {
    return node.nodeValue ?? "";
  }
  if (node.nodeType === 1) {
    if (field.extractType === "attr") {
      return node.getAttribute ? (node.getAttribute(field.attrName ?? "") ?? "") : "";
    }
    if (field.extractType === "html") {
      return String(node);
    }
  }
  return node.textContent?.trim() ?? node.nodeValue?.trim() ?? "";
}
