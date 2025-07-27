import request from "@/utils/request";

export interface TestNotificationRequest {
  service: string;
  config: any;
}

export interface TestNotificationResponse {
  success: boolean;
  message: string;
}

export const notificationApi = {
  // 测试通知
  test: (service: string, config: any) => {
    return request.post<TestNotificationResponse>("/api/notification/test", {
      service,
      config,
    });
  },

  // 发送通知
  send: (data: {
    title: string;
    content: string;
    services?: string[];
  }) => {
    return request.post("/api/notification/send", data);
  },

  // 获取通知历史
  getHistory: (params?: {
    page?: number;
    limit?: number;
    service?: string;
  }) => {
    return request.get("/api/notification/history", { params });
  },
};