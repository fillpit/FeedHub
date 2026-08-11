import * as cheerio from "cheerio";
import { fetchHtml as fetchHtmlWithEngine } from "./html-scraper";

const FETCH_TIMEOUT_MS = 10000;
const DEFAULT_FAVICON_PATH = "/favicon.ico";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

export interface SiteMetaResult {
  readonly title: string;
  readonly description: string;
  readonly favicon: string;
}

const fetchHtml = async (url: string): Promise<string> => {
  return await fetchHtmlWithEngine(url);
};

const extractTitle = ($: cheerio.CheerioAPI): string => {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const docTitle = $("title").text().trim();
  return ogTitle || twitterTitle || docTitle || "";
};

const extractDescription = ($: cheerio.CheerioAPI): string => {
  const metaDesc = $('meta[name="description"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const twitterDesc = $('meta[name="twitter:description"]').attr("content");
  return metaDesc || ogDesc || twitterDesc || "";
};

const extractFavicon = ($: cheerio.CheerioAPI, baseUrlStr: string): string => {
  const candidates = [
    $('link[rel="apple-touch-icon"]').attr("href"),
    $('link[rel="apple-touch-icon-precomposed"]').attr("href"),
    $('link[rel="shortcut icon"]').attr("href"),
    $('link[rel="icon"]').attr("href"),
    $('link[rel*="icon"]').attr("href"),
  ];
  const href = candidates.find((c) => !!c);
  if (!href) {
    return new URL(DEFAULT_FAVICON_PATH, baseUrlStr).toString();
  }
  try {
    return new URL(href, baseUrlStr).toString();
  } catch {
    return href;
  }
};

export const fetchSiteMeta = async (url: string): Promise<SiteMetaResult> => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("无效的 URL 格式");
  }

  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const extractedTitle = extractTitle($);
  const extractedDesc = extractDescription($);
  const extractedFavicon = extractFavicon($, url);

  return {
    title: extractedTitle || parsedUrl.hostname,
    description: extractedDesc,
    favicon: extractedFavicon,
  };
};
