import AuthCredential, { AuthCredentialAttributes } from "../models/AuthCredential";
// import { ApiResponseData } from "../core/ApiResponse";
import { logger } from "../utils/logger";

// 定义API响应数据类型
type ApiResponseData<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

class AuthCredentialService {
  /** 获取所有授权信息 */
  async getAll(): Promise<ApiResponseData<AuthCredentialAttributes[]>> {
    try {
      const list = await AuthCredential.findAll({ order: [["updatedAt", "DESC"]] });
      return { data: list, success: true, message: "获取成功" };
    } catch (error) {
      logger.error("获取授权信息失败:", error);
      return { success: false, message: "获取授权信息失败", error: (error as Error).message };
    }
  }

  /** 获取单个授权信息 */
  async getById(id: number): Promise<ApiResponseData<AuthCredentialAttributes | null>> {
    try {
      const item = await AuthCredential.findByPk(id);
      if (!item) return { success: false, message: "未找到授权信息" };
      return { data: item, success: true, message: "获取成功" };
    } catch (error) {
      logger.error("获取授权信息失败:", error);
      return { success: false, message: "获取授权信息失败", error: (error as Error).message };
    }
  }

  /** 创建授权信息 */
  async create(
    data: Omit<AuthCredentialAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<ApiResponseData<AuthCredentialAttributes>> {
    try {
      const item = await AuthCredential.create(data as any);
      return { data: item, success: true, message: "创建成功" };
    } catch (error) {
      logger.error("创建授权信息失败:", error);
      return { success: false, message: "创建授权信息失败", error: (error as Error).message };
    }
  }

  /** 更新授权信息 */
  async update(
    id: number,
    data: Partial<AuthCredentialAttributes>
  ): Promise<ApiResponseData<AuthCredentialAttributes>> {
    try {
      const item = await AuthCredential.findByPk(id);
      if (!item) return { success: false, message: "未找到授权信息" };
      await item.update(data);
      return { data: item, success: true, message: "更新成功" };
    } catch (error) {
      logger.error("更新授权信息失败:", error);
      return { success: false, message: "更新授权信息失败", error: (error as Error).message };
    }
  }

  /** 删除授权信息 */
  async delete(id: number): Promise<ApiResponseData<null>> {
    try {
      const item = await AuthCredential.findByPk(id);
      if (!item) return { success: false, message: "未找到授权信息" };
      await item.destroy();
      return { success: true, message: "删除成功", data: null };
    } catch (error) {
      logger.error("删除授权信息失败:", error);
      return { success: false, message: "删除授权信息失败", error: (error as Error).message };
    }
  }
}

export default new AuthCredentialService();
