import { Router, Request, Response } from "express";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { SettingController } from "../controllers/setting";
import { UserController } from "../controllers/user";
import { WebsiteRssController } from "../controllers/websiteRss";
import AuthCredentialController from '../controllers/authCredential';
import websiteRssRoutes from "./websiteRss";
import rssTemplateRoutes from "./rssTemplate";
import { createValidationMiddleware, commonValidationRules } from "../middleware/validation";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// 获取控制器实例
const settingController = container.get<SettingController>(TYPES.SettingController);
const userController = container.get<UserController>(TYPES.UserController);
const websiteRssController = container.get<WebsiteRssController>(TYPES.WebsiteRssController);

// 用户相关路由
router.post("/user/login", 
  createValidationMiddleware([
    commonValidationRules.username,
    commonValidationRules.password
  ]),
  asyncHandler((req: Request, res: Response) => userController.login(req, res))
);

router.post("/user/register", 
  createValidationMiddleware([
    commonValidationRules.username,
    commonValidationRules.password
  ]),
  asyncHandler((req: Request, res: Response) => userController.register(req, res))
);

// 设置相关路由
router.get("/setting/get", asyncHandler((req: Request, res: Response) => settingController.get(req, res)));
router.post("/setting/save", asyncHandler((req: Request, res: Response) => settingController.save(req, res)));

// 网站RSS相关路由
router.use("/website-rss", websiteRssRoutes);

// RSS模板相关路由
router.use("/rss-template", rssTemplateRoutes);

// 网站RSS订阅地址（公开访问）
router.get("/rss/:key", (req, res) => websiteRssController.getRssFeed(req, res));

// 网站RSS JSON订阅地址（公开访问）
router.get("/json/:key", (req, res) => websiteRssController.getRssFeedJson(req, res));

// 授权信息管理
router.get('/auth-credential', asyncHandler(AuthCredentialController.getAll.bind(AuthCredentialController)));
router.get('/auth-credential/:id', 
  createValidationMiddleware([commonValidationRules.id]),
  asyncHandler(AuthCredentialController.getById.bind(AuthCredentialController))
);
router.post('/auth-credential', asyncHandler(AuthCredentialController.create.bind(AuthCredentialController)));
router.put('/auth-credential/:id', 
  createValidationMiddleware([commonValidationRules.id]),
  asyncHandler(AuthCredentialController.update.bind(AuthCredentialController))
);
router.delete('/auth-credential/:id', 
  createValidationMiddleware([commonValidationRules.id]),
  asyncHandler(AuthCredentialController.delete.bind(AuthCredentialController))
);

export default router;
