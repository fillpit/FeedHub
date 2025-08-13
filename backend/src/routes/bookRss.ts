import { Router } from "express";
import multer from "multer";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { BookController } from "../controllers/BookController";
import { SubscriptionController } from "../controllers/SubscriptionController";
import { ChapterController } from "../controllers/ChapterController";
import { OpdsController } from "../controllers/OpdsController";
import { BookRssController } from "../controllers/bookRss";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 获取控制器实例
const bookController = container.get<BookController>(TYPES.BookController);
const subscriptionController = container.get<SubscriptionController>(TYPES.SubscriptionController);
const chapterController = container.get<ChapterController>(TYPES.ChapterController);
const opdsController = container.get<OpdsController>(TYPES.OpdsController);
const bookRssController = container.get<BookRssController>(TYPES.BookRssController);

// === 书籍管理路由 ===
// 获取所有书籍
router.get("/books", (req, res) => bookController.getAllBooks(req, res));

// 根据ID获取书籍详情
router.get("/books/:id", (req, res) => bookController.getBookById(req, res));

// 上传书籍文件
router.post("/books/upload", upload.single('file'), (req, res) => bookController.uploadBook(req, res));

// 从OPDS添加书籍
router.post("/books/opds", (req, res) => bookController.addBookFromOpds(req, res));

// 更新书籍信息
router.put("/books/:id", (req, res) => bookController.updateBook(req, res));

// 删除书籍
router.delete("/books/:id", (req, res) => bookController.deleteBook(req, res));

// 检查书籍更新
router.post("/books/:id/check-updates", (req, res) => bookController.checkUpdates(req, res));

// === 章节管理路由 ===
// 获取书籍的章节列表
router.get("/books/:bookId/chapters", (req, res) => chapterController.getChaptersByBookId(req, res));

// 获取章节详情
router.get("/chapters/:id", (req, res) => chapterController.getChapterById(req, res));

// 标记章节为已读
router.patch("/chapters/:id/read", (req, res) => chapterController.markChapterAsRead(req, res));

// 获取最新章节
router.get("/books/:bookId/chapters/latest", (req, res) => chapterController.getLatestChapters(req, res));

// === 订阅管理路由 ===
// 获取所有订阅
router.get("/subscriptions", (req, res) => subscriptionController.getAllSubscriptions(req, res));

// 创建订阅
router.post("/subscriptions", (req, res) => subscriptionController.createSubscription(req, res));

// 更新订阅
router.put("/subscriptions/:id", (req, res) => subscriptionController.updateSubscription(req, res));

// 删除订阅
router.delete("/subscriptions/:id", (req, res) => subscriptionController.deleteSubscription(req, res));

// 根据书籍ID获取订阅
router.get("/books/:bookId/subscriptions", (req, res) => subscriptionController.getSubscriptionsByBookId(req, res));

// === OPDS配置路由 ===
// 获取所有OPDS配置
router.get("/opds", (req, res) => opdsController.getAllConfigs(req, res));

// 创建OPDS配置
router.post("/opds", (req, res) => opdsController.createConfig(req, res));

// 更新OPDS配置
router.put("/opds/:id", (req, res) => opdsController.updateConfig(req, res));

// 删除OPDS配置
router.delete("/opds/:id", (req, res) => opdsController.deleteConfig(req, res));

// 测试OPDS连接
router.post("/opds/:id/test", (req, res) => opdsController.testConnection(req, res));

// 从OPDS获取书籍列表
router.get("/opds/:id/books", (req, res) => opdsController.getBooksFromOpds(req, res));

// 从全局OPDS设置获取书籍列表
router.get("/opds/books", (req, res) => opdsController.getBooksFromGlobalOpds(req, res));

// === BookRss配置路由 ===
// 获取所有BookRss配置
router.get("/", (req, res) => bookRssController.getAllConfigs(req, res));

// 获取单个BookRss配置
router.get("/:id", (req, res) => bookRssController.getConfigById(req, res));

// 添加BookRss配置
router.post("/", (req, res) => bookRssController.addConfig(req, res));

// 更新BookRss配置
router.put("/:id", (req, res) => bookRssController.updateConfig(req, res));

// 删除BookRss配置
router.delete("/:id", (req, res) => bookRssController.deleteConfig(req, res));

// 刷新BookRss配置
router.post("/:id/refresh", (req, res) => bookRssController.refreshConfig(req, res));

// RSS Feed路由
router.get("/feed/:key", (req, res) => bookRssController.getRssFeed(req, res));
router.get("/feed/:key/json", (req, res) => bookRssController.getRssFeedJson(req, res));

export default router;