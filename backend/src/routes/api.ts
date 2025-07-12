import { Router } from "express";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { SettingController } from "../controllers/setting";
import { UserController } from "../controllers/user";
import { WebsiteRssController } from "../controllers/websiteRss";
import AuthCredentialController from '../controllers/authCredential';
import websiteRssRoutes from "./websiteRss";
import rssTemplateRoutes from "./rssTemplate";

const router = Router();

// 获取控制器实例
const settingController = container.get<SettingController>(TYPES.SettingController);
const userController = container.get<UserController>(TYPES.UserController);
const websiteRssController = container.get<WebsiteRssController>(TYPES.WebsiteRssController);

// 用户相关路由
router.post("/user/login", (req, res) => userController.login(req, res));
router.post("/user/register", (req, res) => userController.register(req, res));

// 设置相关路由
router.get("/setting/get", (req, res) => settingController.get(req, res));
router.post("/setting/save", (req, res) => settingController.save(req, res));

// 网站RSS相关路由
router.use("/website-rss", websiteRssRoutes);

// RSS模板相关路由
router.use("/rss-template", rssTemplateRoutes);

// 网站RSS订阅地址（公开访问）
router.get("/rss/:key", (req, res) => websiteRssController.getRssFeed(req, res));

// 授权信息管理
router.get('/auth-credential', AuthCredentialController.getAll.bind(AuthCredentialController));
router.get('/auth-credential/:id', AuthCredentialController.getById.bind(AuthCredentialController));
router.post('/auth-credential', AuthCredentialController.create.bind(AuthCredentialController));
router.put('/auth-credential/:id', AuthCredentialController.update.bind(AuthCredentialController));
router.delete('/auth-credential/:id', AuthCredentialController.delete.bind(AuthCredentialController));

export default router;
