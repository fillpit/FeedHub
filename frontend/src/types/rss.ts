export interface RssFeedItem {
  id: number;
  key: string;
  title: string;
  url: string;
  rssUrl: string;
  favicon: string;
  content: string;
}

export interface RssArticle {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  categories?: string[];
  isoDate?: string;
  creator?: string;
  author?: string;
  image?: string; // 文章封面图片URL
}

export interface RssFeedContent {
  title: string;
  description: string;
  link: string;
  items: RssArticle[];
  lastBuildDate?: string;
  pubDate?: string;
  language?: string;
  generator?: string;
}

export interface RssFeedStore {
  feeds: RssFeedItem[];
  currentFeed: RssFeedItem | null;
  currentContent: RssFeedContent | null;
  loading: boolean;
  error: string | null;
}