import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiResponse } from "../utils/apiResponse";

// 配置multer存储
const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    const uploadDir = path.resolve(process.cwd(), "uploads");
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的文件类型
  const allowedTypes = [".js", ".zip"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${ext}。只允许上传 .js 和 .zip 文件`));
  }
};

// 配置multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export class UploadController {
  /**
   * 单文件上传
   */
  static uploadSingle = upload.single("file");

  /**
   * 处理文件上传
   */
  static async handleUpload(
    req: Request & { file?: Express.Multer.File },
    res: Response
  ): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json(ApiResponse.error("没有上传文件"));
        return;
      }

      const fileInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
      };

      res.json(
        ApiResponse.success({
          message: "文件上传成功",
          file: fileInfo,
        })
      );
    } catch (error) {
      console.error("文件上传失败:", error);
      res.status(500).json(ApiResponse.error("文件上传失败"));
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const filePath = path.resolve(process.cwd(), "uploads", filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json(ApiResponse.success({ message: "文件删除成功" }));
      } else {
        res.status(404).json(ApiResponse.error("文件不存在"));
      }
    } catch (error) {
      console.error("文件删除失败:", error);
      res.status(500).json(ApiResponse.error("文件删除失败"));
    }
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const filePath = path.resolve(process.cwd(), "uploads", filename);

      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileInfo = {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
        res.json(ApiResponse.success(fileInfo));
      } else {
        res.status(404).json(ApiResponse.error("文件不存在"));
      }
    } catch (error) {
      console.error("获取文件信息失败:", error);
      res.status(500).json(ApiResponse.error("获取文件信息失败"));
    }
  }
}
