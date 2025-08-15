import { Router } from "express";
import { UploadController } from "../controllers/UploadController";
import { asyncHandler } from "../middleware/errorHandler";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// 文件上传路由 - 需要认证
router.post(
  "/",
  authMiddleware, // 添加认证中间件
  UploadController.uploadSingle, // multer中间件
  asyncHandler(UploadController.handleUpload)
);

// 删除文件路由 - 需要认证
router.delete("/:filename", authMiddleware, asyncHandler(UploadController.deleteFile));

// 获取文件信息路由 - 需要认证
router.get("/:filename", authMiddleware, asyncHandler(UploadController.getFileInfo));

export default router;
