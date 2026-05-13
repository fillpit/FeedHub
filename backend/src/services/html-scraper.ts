import { FeedItem, WebsiteRssSelector, SelectorField } from "../types/feed";

/**
 * 网页抓取服务
 * - 优先使用 cheerio（需要网络安装）
 * - 无 cheerio 时返回错误提示
 */

interface ScrapeOptions {
  url: string;
  selector: WebsiteRssSelector;
  authHeaders?: Record<string, string>;
}

export async function scrapeWebsite({ url, selector, authHeaders = {} }: ScrapeOptions): Promise<{
  items: FeedItem[];
  error?: string;
  executionTime: number;
}> {
  const startTime = Date.now();
  let html: string;
  try {
    html = await fetchHtml(url, authHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { items: [], error: `网络请求失败: ${message}`, executionTime: Date.now() - startTime };
  }

  if (selector.selectorType === "xpath") {
    return runXPathScraping(html, selector, startTime);
  }
  return runCheerioScraping(html, selector, startTime);
}

async function runCheerioScraping(html: string, selector: WebsiteRssSelector, startTime: number): Promise<{ items: FeedItem[]; error?: string; executionTime: number }> {
  const cheerio = await tryLoadCheerio();
  if (!cheerio) {
    return { items: [], error: "cheerio 模块不可用，请安装后重试", executionTime: Date.now() - startTime };
  }
  try {
    const items = parseWithCheerio(html, selector, cheerio);
    return { items, executionTime: Date.now() - startTime };
  } catch (error) {
    console.error("Scraping parse error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { items: [], error: `解析失败: ${message}`, executionTime: Date.now() - startTime };
  }
}

async function runXPathScraping(html: string, selector: WebsiteRssSelector, startTime: number): Promise<{ items: FeedItem[]; error?: string; executionTime: number }> {
  const cheerio = await tryLoadCheerio();
  const xpathModule = await tryLoadXpath();
  const xmldomModule = await tryLoadXmldom();
  if (!cheerio || !xpathModule || !xmldomModule) {
    return { items: [], error: "解析模块 (cheerio/xpath/xmldom) 不可用，请重试", executionTime: Date.now() - startTime };
  }
  try {
    const items = parseWithXPath(html, selector, cheerio, xpathModule, xmldomModule);
    return { items, executionTime: Date.now() - startTime };
  } catch (error) {
    console.error("Scraping parse XPath error:", error);
    const message = error instanceof Error ? error.message : String(error);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryLoadCheerio(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("cheerio");
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryLoadXpath(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("xpath");
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryLoadXmldom(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("xmldom");
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWithCheerio(html: string, selector: WebsiteRssSelector, cheerioModule: any): FeedItem[] {
  const $ = cheerioModule.load(html);
  const items: FeedItem[] = [];

  if (!selector.container || !selector.container.trim()) {
    return items;
  }

  $(selector.container).each((_: unknown, el: unknown) => {
    const container = $(el);
    const title = extractField(container, selector.title, $);
    if (!title) return;

    const link = selector.link ? extractField(container, selector.link, $) : "";
    const content = extractField(container, selector.content, $);
    const author = selector.author ? extractField(container, selector.author, $) : undefined;
    const pubDate = selector.date ? extractField(container, selector.date, $) : undefined;

    items.push({ title, link: link ?? "", content: content || undefined, author, pubDate });
  });

  return items;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractField(container: any, field: SelectorField, _$: any): string {
  if (!field || !field.selector || !field.selector.trim()) {
    return "";
  }

  const el = container.find(field.selector).first();
  if (!el.length) return "";

  let value: string;
  switch (field.extractType) {
    case "attr":
      value = el.attr(field.attrName ?? "") ?? "";
      break;
    case "html":
      value = el.html() ?? "";
      break;
    default:
      value = el.text().trim();
  }

  return applyRegex(value, field);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWithXPath(html: string, selector: WebsiteRssSelector, cheerioModule: any, xpathModule: any, xmldomModule: any): FeedItem[] {
  const $ = cheerioModule.load(html);
  const cleanXml = $.xml();
  const doc = new xmldomModule.DOMParser().parseFromString(cleanXml, "text/xml");
  const items: FeedItem[] = [];

  if (!selector.container || !selector.container.trim()) {
    return items;
  }

  const containerNodes = xpathModule.select(selector.container, doc);
  if (!Array.isArray(containerNodes)) {
    return items;
  }

  for (const containerNode of containerNodes) {
    const item = parseSingleXPathContainer(containerNode, selector, xpathModule);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSingleXPathContainer(containerNode: any, selector: WebsiteRssSelector, xpathModule: any): FeedItem | null {
  const title = extractFieldXPath(containerNode, selector.title, xpathModule);
  if (!title) return null;

  const link = selector.link ? extractFieldXPath(containerNode, selector.link, xpathModule) : "";
  const content = selector.content ? extractFieldXPath(containerNode, selector.content, xpathModule) : "";
  const author = selector.author ? extractFieldXPath(containerNode, selector.author, xpathModule) : undefined;
  const pubDate = selector.date ? extractFieldXPath(containerNode, selector.date, xpathModule) : undefined;

  return {
    title,
    link,
    content: content || undefined,
    author,
    pubDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFieldXPath(containerNode: any, field: SelectorField, xpathModule: any): string {
  if (!field || !field.selector || !field.selector.trim()) {
    return "";
  }

  const nodes = xpathModule.select(field.selector, containerNode);
  const el = Array.isArray(nodes) && nodes.length > 0 ? nodes[0] : null;
  if (!el) return "";

  const value = extractNodeValue(el, field);
  return applyRegex(value, field);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNodeValue(el: any, field: SelectorField): string {
  if (el.nodeType === 2) {
    return el.nodeValue ?? "";
  }
  if (el.nodeType === 1) {
    if (field.extractType === "attr") {
      return el.getAttribute(field.attrName ?? "") ?? "";
    }
    if (field.extractType === "html") {
      return el.toString() ?? "";
    }
  }
  return el.textContent?.trim() ?? el.nodeValue?.trim() ?? "";
}
