import { Router } from "express";
import { container } from "../inversify.config";
import { WebsiteRssController } from "../controllers/websiteRss";
import { TYPES } from "../core/types";

const router = Router();
const websiteRssController = container.get<WebsiteRssController>(TYPES.WebsiteRssController);

// 获取所有网站RSS配置
router.get("/", (req, res) => websiteRssController.getAllConfigs(req, res));

// 获取单个网站RSS配置
router.get("/:id", (req, res) => websiteRssController.getConfigById(req, res));

// 添加网站RSS配置
router.post("/", (req, res) => websiteRssController.addConfig(req, res));

// 更新网站RSS配置
router.put("/:id", (req, res) => websiteRssController.updateConfig(req, res));

// 删除网站RSS配置
router.delete("/:id", (req, res) => websiteRssController.deleteConfig(req, res));

// 刷新网站RSS配置
router.post("/:id/refresh", (req, res) => websiteRssController.refreshConfig(req, res));

// 调试选择器配置
router.post("/debug-selector", (req, res) => websiteRssController.debugSelector(req, res));

// 统一订阅地址（公开访问）- 支持type参数控制格式
router.get("/sub/:key", (req, res) => websiteRssController.getSubscriptionFeed(req, res));


export default router;
