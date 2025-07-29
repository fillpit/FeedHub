import { Router } from "express";
import { ScriptPackageController } from "../controllers/ScriptPackageController";

const router = Router();
const scriptPackageController = new ScriptPackageController();

// 预览脚本包内容
router.get("/preview", (req, res) => scriptPackageController.previewPackage(req, res));

// 验证脚本包结构
router.get("/validate", (req, res) => scriptPackageController.validatePackage(req, res));

// 获取脚本包模板列表
router.get("/templates", (req, res) => scriptPackageController.getTemplates(req, res));

// 下载脚本包模板
router.get("/templates/:templateId/download", (req, res) => scriptPackageController.downloadTemplate(req, res));

// 在线编辑功能
// 创建编辑会话
router.post("/edit-session", (req, res) => scriptPackageController.createEditSession(req, res));

// 获取编辑会话文件列表
router.get("/edit-session/:sessionId/files", (req, res) => scriptPackageController.getEditSessionFiles(req, res));

// 获取编辑会话文件内容
router.get("/edit-session/:sessionId/file", (req, res) => scriptPackageController.getEditSessionFileContent(req, res));

// 保存编辑会话文件内容
router.put("/edit-session/:sessionId/file", (req, res) => scriptPackageController.saveEditSessionFileContent(req, res));

// 关闭编辑会话
router.delete("/edit-session/:sessionId", (req, res) => scriptPackageController.closeEditSession(req, res));

// 导出编辑会话为脚本包
router.get("/edit-session/:sessionId/export", (req, res) => scriptPackageController.exportEditSession(req, res));

export default router;