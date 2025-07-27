import { Request, Response } from "express";
import { ApiResponse } from "../core/ApiResponse";
import { ApiResponseData } from "../utils/apiResponse";

export abstract class BaseController {
  protected async handleRequest<T>(
    req: Request,
    res: Response,
    action: () => Promise<ApiResponseData<T> | any | void>
  ): Promise<void> {
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
      res.status(200).json(ApiResponse.error(errorMessage));
    }
  }
}
