import { Router } from "express";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { DynamicRouteController } from "../controllers/dynamicRoute";

const router = Router();
const controller = container.get<DynamicRouteController>(TYPES.DynamicRouteController);

// 获取所有自定义路由配置
router.get("/", (req, res) => controller.getAllDynamicRoutes(req, res));

// 根据ID获取自定义路由配置
router.get("/:id", (req, res) => controller.getDynamicRoute(req, res));

// 添加自定义路由配置
router.post("/", (req, res) => controller.addDynamicRoute(req, res));

// 更新自定义路由配置
router.put("/:id", (req, res) => controller.updateDynamicRoute(req, res));

// 删除自定义路由配置
router.delete("/:id", (req, res) => controller.deleteDynamicRoute(req, res));

// 调试自定义路由脚本
router.post("/debug", (req, res) => controller.debugDynamicRouteScript(req, res));


// 获取内联脚本的文件列表
router.get("/:id/inline-script/files", (req, res) => controller.getInlineScriptFiles(req, res));

// 获取内联脚本的文件内容
router.get("/:id/inline-script/files/:fileName", (req, res) => controller.getInlineScriptFileContent(req, res));

// 更新内联脚本的文件内容
router.put("/:id/inline-script/files", (req, res) => controller.updateInlineScriptFileContent(req, res));

// 创建内联脚本文件
router.post("/:id/inline-script/files", (req, res) => controller.createInlineScriptFile(req, res));

// 删除内联脚本文件
router.delete("/:id/inline-script/files", (req, res) => controller.deleteInlineScriptFile(req, res));

export default router;
