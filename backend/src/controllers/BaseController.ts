import { Request, Response } from "express";
import { ApiResponse } from "../core/ApiResponse";
import { ApiResponseData } from "../utils/apiResponse";

export abstract class BaseController {
  protected async handleRequest<T>(
    req: Request,
    res: Response,
    action: () => Promise<ApiResponseData<T> | any | void>
  ): Promise<void> {

    // 设置防缓存头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const result = await action();
      if (result) {
        if (typeof result === "object" && result !== null) {
          res.json(ApiResponse.success(result.data, result.message));
        } else {
          res.json(result);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error(`[BaseController] 请求处理失败:`, {
        path: req.path,
        method: req.method,
        body: req.body,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
      res.status(500).json(ApiResponse.error(errorMessage));
    }
  }
}
