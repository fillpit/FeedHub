import { Router } from "express";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { RssTemplateController } from "../controllers/rssTemplate";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const rssTemplateController = container.get<RssTemplateController>(TYPES.RssTemplateController);

// 所有模板路由都需要认证
router.use(authMiddleware);

// 获取所有模板
router.get("/", (req, res) => rssTemplateController.getAllTemplates(req, res));

// 根据ID获取模板
router.get("/:id", (req, res) => rssTemplateController.getTemplateById(req, res));

// 创建模板
router.post("/", (req, res) => rssTemplateController.createTemplate(req, res));

// 更新模板
router.put("/:id", (req, res) => rssTemplateController.updateTemplate(req, res));

// 删除模板
router.delete("/:id", (req, res) => rssTemplateController.deleteTemplate(req, res));

// 根据模板生成RSS配置
router.post("/generate", (req, res) => rssTemplateController.generateRssConfig(req, res));

// 初始化默认模板
router.post("/init", (req, res) => rssTemplateController.initializeDefaultTemplates(req, res));

// 模板调试
router.post("/debug", (req, res) => rssTemplateController.debugTemplate(req, res));

// 从模板直接创建RSS配置
router.post("/create-config", (req, res) => rssTemplateController.createRssConfigFromTemplate(req, res));

// 批量更新使用指定模板的所有配置
router.post("/:id/update-configs", (req, res) => rssTemplateController.updateConfigsByTemplate(req, res));

// 获取使用指定模板的配置列表
router.get("/:id/configs", (req, res) => rssTemplateController.getConfigsByTemplate(req, res));

export default router;