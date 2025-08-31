import request from "@/utils/request";
import type { WebsiteRssConfig, WebsiteRssConfigList } from "@/types/websiteRss";

const baseUrl = "/api/website";

// 获取网站 RSS 列表
export const getWebsiteRssList = () => {
  return request.get<WebsiteRssConfigList>(baseUrl);
};

// 创建网站 RSS
export const createWebsiteRss = (data: Partial<WebsiteRssConfig>) => {
  return request.post(baseUrl, data, {
    showSuccessMessage: true,
    successMessage: "网站 RSS 创建成功！",
  });
};

// 更新网站 RSS
export const updateWebsiteRss = (id: number, data: Partial<WebsiteRssConfig>) => {
  return request.put(`${baseUrl}/${id}`, data, {
    showSuccessMessage: true,
    successMessage: "网站 RSS 更新成功！",
  });
};

// 删除网站 RSS
export const deleteWebsiteRss = (id: number) => {
  return request.delete(`${baseUrl}/${id}`, {
    showSuccessMessage: true,
    successMessage: "网站 RSS 删除成功！",
  });
};

// 刷新网站 RSS
export const refreshWebsiteRss = (id: number) => {
  return request.post(`${baseUrl}/${id}/refresh`, {});  
};


// 获取订阅链接
export const getSubscribeUrl = (key: string, type: 'rss' | 'json' = "rss") => {
  return `${window.location.origin}${baseUrl}/sub/${key}?type=${type}`;
};

// 调试选择器
export const debugSelector = (data: Partial<WebsiteRssConfig>) => {
  return request.post(`${baseUrl}/debug-selector`, data);
};
