import { Router, Request, Response } from "express";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { SettingController } from "../controllers/setting";
import { UserController } from "../controllers/user";
import { WebsiteRssController } from "../controllers/websiteRss";
import { DynamicRouteController } from "../controllers/dynamicRoute";
import { BackupController } from "../controllers/backup";
import websiteRssRoutes from "./websiteRss";
import dynamicRouteRoutes from "./dynamicRoute";
import npmPackageRoutes from "./npmPackage";
import notificationRoutes from "./notification";
import authCredentialRoutes from "./authCredential";

import uploadRoutes from "./upload";
import { createValidationMiddleware, commonValidationRules } from "../middleware/validation";
import { asyncHandler } from "../middleware/errorHandler";
import { authMiddleware } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

// 严格的登录限流器：5分钟内最多5次尝试
const loginRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "登录尝试次数过多，请5分钟后再试",
});

// 获取控制器实例
const settingController = container.get<SettingController>(TYPES.SettingController);
const userController = container.get<UserController>(TYPES.UserController);
const websiteRssController = container.get<WebsiteRssController>(TYPES.WebsiteRssController);
const dynamicRouteController = container.get<DynamicRouteController>(TYPES.DynamicRouteController);
const backupController = container.get<BackupController>(TYPES.BackupController);

// 用户相关路由
router.post(
  "/user/login",
  loginRateLimiter,
  createValidationMiddleware([commonValidationRules.username, commonValidationRules.password]),
  asyncHandler((req: Request, res: Response) => userController.login(req, res))
);

router.post(
  "/user/register",
  createValidationMiddleware([commonValidationRules.username, commonValidationRules.password]),
  asyncHandler((req: Request, res: Response) => userController.register(req, res))
);

router.post(
  "/user/change-password",
  createValidationMiddleware([
    { field: "currentPassword", type: "string", required: true },
    { field: "newPassword", type: "string", required: true },
  ]),
  authMiddleware,
  asyncHandler((req: Request, res: Response) => userController.changePassword(req, res))
);

// 设置相关路由
router.get(
  "/setting/get",
  asyncHandler((req: Request, res: Response) => settingController.get(req, res))
);
router.post(
  "/setting/save",
  asyncHandler((req: Request, res: Response) => settingController.save(req, res))
);

router.post(
  "/setting/translation/test",
  asyncHandler((req: Request, res: Response) => settingController.testTranslation(req, res))
);

// 备份还原相关路由
router.get(
  "/backup/export",
  asyncHandler((req: Request, res: Response) => backupController.exportBackup(req, res))
);
router.post(
  "/backup/import",
  asyncHandler((req: Request, res: Response) => backupController.importBackup(req, res))
);

// 分享配置相关路由
router.get(
  "/backup/export-share",
  asyncHandler((req: Request, res: Response) => backupController.exportShareConfig(req, res))
);
router.post(
  "/backup/import-share",
  asyncHandler((req: Request, res: Response) => backupController.importShareConfig(req, res))
);

// 网站RSS相关路由
router.use("/website", websiteRssRoutes);


// RSS模板相关路由

// 自定义路由相关路由
router.use("/dynamic", dynamicRouteRoutes);

// npm包管理相关路由
router.use("/npm-package", npmPackageRoutes);

// 通知路由
router.use("/notification", notificationRoutes);

// 脚本包路由
router.use("/auth-credential", authCredentialRoutes);

// 文件上传路由
router.use("/upload", uploadRoutes);

export default router;
