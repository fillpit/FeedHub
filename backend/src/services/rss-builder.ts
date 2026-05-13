import { FeedOutput, FeedItem } from "../types/feed";

/** 将 FeedOutput 转换为标准 RSS 2.0 XML 字符串 */
export function buildRssXml(feed: FeedOutput, selfUrl?: string): string {
  const channelTitle = escapeXml(feed.title);
  const channelDesc = escapeXml(feed.description ?? feed.title);
  const channelLink = escapeXml(feed.link ?? selfUrl ?? "");
  const atomLink = selfUrl
    ? `<atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>`
    : "";

  const items = feed.items.map(buildItemXml).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${channelTitle}</title>
    <description>${channelDesc}</description>
    <link>${channelLink}</link>
    ${atomLink}
    <generator>FeedHub</generator>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

function buildItemXml(item: FeedItem): string {
  const title = escapeXml(item.title);
  const link = escapeXml(item.link);
  const guid = escapeXml(item.guid ?? item.link);
  const content = item.content ? `<content:encoded><![CDATA[${item.content}]]></content:encoded>` : "";
  const author = item.author ? `<author>${escapeXml(item.author)}</author>` : "";
  const pubDate = item.pubDate ? `<pubDate>${formatRssDate(item.pubDate)}</pubDate>` : "";

  return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${guid}</guid>
      ${author}
      ${pubDate}
      ${content}
    </item>`;
}

function formatRssDate(raw: string): string {
  try {
    return new Date(raw).toUTCString();
  } catch {
    return new Date().toUTCString();
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 将 FeedOutput 转换为 JSON Feed 格式 */
export function buildJsonFeed(feed: FeedOutput, selfUrl?: string): object {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: feed.title,
    description: feed.description,
    home_page_url: feed.link,
    feed_url: selfUrl,
    items: feed.items.map((item) => ({
      id: item.guid ?? item.link,
      url: item.link,
      title: item.title,
      content_html: item.content,
      author: item.author ? { name: item.author } : undefined,
      date_published: item.pubDate,
    })),
  };
}
