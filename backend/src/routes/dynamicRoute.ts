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

export default router;
