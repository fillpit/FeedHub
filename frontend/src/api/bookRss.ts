import request from "@/utils/request";
import {
  Book,
  Chapter,
  Subscription,
  OpdsConfig,
  OpdsParseResult,
  BookRssConfig,
} from "@feedhub/shared/src/types/bookRss";

const baseUrl = "/api/book-rss";

// === 书籍管理 ===
// 获取所有书籍
export const getAllBooks = () => {
  return request.get<Book[]>(`${baseUrl}/books`);
};

// 根据ID获取书籍
export const getBookById = (id: number) => {
  return request.get<Book>(`${baseUrl}/books/${id}`);
};

// 上传书籍文件
export const uploadBook = (file: File, metadata?: Partial<Book>) => {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata) {
    formData.append("metadata", JSON.stringify(metadata));
  }
  return request.post<Book>(`${baseUrl}/books/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// 从OPDS添加书籍
export const addBookFromOpds = (opdsId: number, bookData: any) => {
  return request.post<Book>(`${baseUrl}/books/from-opds`, { opdsId, bookData });
};

// 更新书籍信息
export const updateBook = (id: number, data: Partial<Book>) => {
  return request.put<Book>(`${baseUrl}/books/${id}`, data);
};

// 删除书籍
export const deleteBook = (id: number) => {
  return request.delete(`${baseUrl}/books/${id}`);
};

// 检查书籍更新
export const checkBookUpdates = (id: number) => {
  return request.post(`${baseUrl}/books/${id}/check-updates`, {});
};

// === 章节管理 ===
// 根据书籍ID获取章节列表
export const getChaptersByBookId = (bookId: number) => {
  return request.get<Chapter[]>(`${baseUrl}/chapters/book/${bookId}`);
};

// 根据章节ID获取章节详情
export const getChapterById = (id: number) => {
  return request.get<Chapter>(`${baseUrl}/chapters/${id}`);
};

// 获取最新章节
export const getLatestChapters = (limit: number = 10) => {
  return request.get<Chapter[]>(`${baseUrl}/chapters/latest?limit=${limit}`);
};

// 标记章节为已读
export const markChapterAsRead = (id: number) => {
  return request.post(`${baseUrl}/chapters/${id}/mark-read`, {});
};

// === 订阅管理 ===
// 获取所有订阅
export const getAllSubscriptions = () => {
  return request.get<Subscription[]>(`${baseUrl}/subscriptions`);
};

// 创建订阅
export const createSubscription = (data: Omit<Subscription, "id" | "createdAt" | "updatedAt">) => {
  return request.post<Subscription>(`${baseUrl}/subscriptions`, data);
};

// 更新订阅
export const updateSubscription = (id: number, data: Partial<Subscription>) => {
  return request.put<Subscription>(`${baseUrl}/subscriptions/${id}`, data);
};

// 删除订阅
export const deleteSubscription = (id: number) => {
  return request.delete(`${baseUrl}/subscriptions/${id}`);
};

// 根据书籍ID获取订阅
export const getSubscriptionByBookId = (bookId: number) => {
  return request.get<Subscription>(`${baseUrl}/subscriptions/book/${bookId}`);
};

// === RSS/JSON Feed ===
// 获取RSS Feed (XML格式)
export const getRssFeed = (key: string) => {
  return `/api/book-rss/feed/${key}`;
};

// 获取JSON Feed
export const getJsonFeed = (key: string) => {
  return `/api/book-rss/feed/${key}/json`;
};

// === OPDS配置管理 ===
// 获取所有OPDS配置
export const getAllOpdsConfigs = () => {
  return request.get<OpdsConfig[]>(`${baseUrl}/opds`);
};

// 创建OPDS配置
export const createOpdsConfig = (data: Omit<OpdsConfig, "id" | "createdAt" | "updatedAt">) => {
  return request.post<OpdsConfig>(`${baseUrl}/opds`, data);
};

// 更新OPDS配置
export const updateOpdsConfig = (id: number, data: Partial<OpdsConfig>) => {
  return request.put<OpdsConfig>(`${baseUrl}/opds/${id}`, data);
};

// 删除OPDS配置
export const deleteOpdsConfig = (id: number) => {
  return request.delete(`${baseUrl}/opds/${id}`);
};

// 测试OPDS连接
export const testOpdsConnection = (id: number) => {
  return request.post(`${baseUrl}/opds/${id}/test`, {});
};

// 从OPDS获取书籍列表
export const fetchBooksFromOpds = (search?: string) => {
  const params = search ? { search } : {};
  return request.get<OpdsParseResult>("/api/book-rss/opds/books", { params });
};

// 获取全局设置
export const getGlobalSettings = () => {
  return request.get<any>("/api/settings");
};

// === 兼容性API (保持向后兼容) ===
// 获取所有图书RSS配置
export const getAllConfigs = () => {
  return request.get<BookRssConfig[]>(`${baseUrl}/`);
};

// 获取单个图书RSS配置
export const getConfigById = (id: number) => {
  return request.get<BookRssConfig>(`${baseUrl}/${id}`);
};

// 添加图书RSS配置
export const addConfig = (
  config: Omit<BookRssConfig, "id" | "lastUpdateTime" | "lastBooks" | "opdsConfig">
) => {
  return request.post<BookRssConfig>(`${baseUrl}/`, config);
};

// 更新图书RSS配置
export const updateConfig = (id: number, config: Partial<Omit<BookRssConfig, "opdsConfig">>) => {
  return request.put<BookRssConfig>(`${baseUrl}/${id}`, config);
};

// 删除图书RSS配置
export const deleteConfig = (id: number) => {
  return request.delete(`${baseUrl}/${id}`);
};

// 刷新图书RSS配置
export const refreshConfig = (id: number) => {
  return request.post<BookRssConfig>(`${baseUrl}/${id}/refresh`, {});
};

// 获取图书RSS Feed (JSON格式) - 兼容性
export const getRssFeedJson = (key: string) => {
  return `/api/book-rss/feed/${key}/json`;
};

// 导出所有API函数
export default {
  // 书籍管理
  getAllBooks,
  getBookById,
  uploadBook,
  addBookFromOpds,
  updateBook,
  deleteBook,
  checkBookUpdates,
  // 章节管理
  getChaptersByBookId,
  getChapterById,
  getLatestChapters,
  markChapterAsRead,
  // 订阅管理
  getAllSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionByBookId,
  // RSS/JSON Feed
  getRssFeed,
  getJsonFeed,
  // OPDS配置
  getAllOpdsConfigs,
  createOpdsConfig,
  updateOpdsConfig,
  deleteOpdsConfig,
  testOpdsConnection,
  fetchBooksFromOpds,
  getGlobalSettings,
  // 兼容性API
  getAllConfigs,
  getConfigById,
  addConfig,
  updateConfig,
  deleteConfig,
  refreshConfig,
  getRssFeedJson,
};
