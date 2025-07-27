import * as cheerio from "cheerio";
import { AxiosInstance } from "axios";
import { logger } from "./logger";

export async function getFavicon(url: string, axiosInstance: AxiosInstance): Promise<string> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.origin;
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);
    let faviconUrl =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="apple-touch-icon"]').attr("href");
    if (faviconUrl) {
      if (faviconUrl.startsWith("/")) {
        faviconUrl = `${domain}${faviconUrl}`;
      } else if (!faviconUrl.startsWith("http")) {
        faviconUrl = `${domain}/${faviconUrl}`;
      }
      return faviconUrl;
    }
    return `${domain}/favicon.ico`;
  } catch (error) {
    logger.error(`获取网站图标失败: ${(error as Error).message}`);
    throw new Error(`获取网站图标失败: ${(error as Error).message}`);
  }
}
