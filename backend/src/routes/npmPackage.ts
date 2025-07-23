import { Router } from "express";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";
import { NpmPackageController } from "../controllers/npmPackage";

const router = Router();
const controller = container.get<NpmPackageController>(TYPES.NpmPackageController);

// 获取所有包
router.get("/", (req, res) => controller.getAllPackages(req, res));

// 获取已安装的包
router.get("/installed", (req, res) => controller.getInstalledPackages(req, res));

// 安装包
router.post("/install", (req, res) => controller.installPackage(req, res));

// 卸载包
router.delete("/uninstall/:name", (req, res) => controller.uninstallPackage(req, res));

// 获取包统计信息
router.get("/stats", (req, res) => controller.getPackageStats(req, res));

export default router;