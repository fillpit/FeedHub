import { Router } from "express";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { CustomRouteController } from "../controllers/customRoute";

const router = Router();
const controller = container.get<CustomRouteController>(TYPES.CustomRouteController);

// 获取所有自定义路由配置
router.get("/",  (req, res) => controller.getAllRoutes(req, res));

// 根据ID获取自定义路由配置
router.get("/:id",  (req, res) => controller.getRouteById(req, res));

// 添加自定义路由配置
router.post("/",  (req, res) => controller.addRoute(req, res));

// 更新自定义路由配置
router.put("/:id",  (req, res) => controller.updateRoute(req, res));

// 删除自定义路由配置
router.delete("/:id",  (req, res) => controller.deleteRoute(req, res));

// 调试自定义路由脚本
router.post("/debug",  (req, res) => controller.debugRouteScript(req, res));

export default router;