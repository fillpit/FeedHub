import request from '@/utils/request'
import type { WebsiteRssConfig, WebsiteRssConfigList } from '@/types/websiteRss'

const baseUrl = '/api/website-rss';

// 获取所有网站RSS配置
export const getAllConfigs = () => {
  return request.get<WebsiteRssConfig[]>(baseUrl);
};

// 获取单个网站RSS配置
export const getConfigById = (id: number) => {
  return request.get<WebsiteRssConfig>(`${baseUrl}/${id}`);
};

// 添加网站RSS配置
export const addConfig = (config: WebsiteRssConfig) => {
  return request.post<WebsiteRssConfig>(baseUrl, config);
};

// 更新网站RSS配置
export const updateConfig = (id: number, config: WebsiteRssConfig) => {
  return request.put<WebsiteRssConfig>(`${baseUrl}/${id}`, config);
};

// 删除网站RSS配置
export const deleteConfig = (id: number) => {
  return request.delete(`${baseUrl}/${id}`);
};

// 刷新网站RSS配置
export const refreshConfig = (id: number) => {
  return request.post<WebsiteRssConfig>(`${baseUrl}/${id}/refresh`, {});
};

// 获取RSS订阅链接
export const getRssLink = (key: string) => {
  return `${window.location.origin}/api/rss/${key}`;
};

export const getWebsiteRssList = () => {
  return request.get<WebsiteRssConfigList>('/api/website-rss')
}

export const createWebsiteRss = (data: Partial<WebsiteRssConfig>) => {
  return request.post('/api/website-rss', data)
}

export const updateWebsiteRss = (id: number, data: Partial<WebsiteRssConfig>) => {
  return request.put(`/api/website-rss/${id}`, data)
}

export const deleteWebsiteRss = (id: number) => {
  return request.delete(`/api/website-rss/${id}`)
}

export const refreshWebsiteRss = (id: number) => {
  return request.post(`/api/website-rss/${id}/refresh`, {})
}

export const getRssUrl = (key: string) => {
  return `${window.location.origin}/api/rss/${key}`
}

export const debugScript = (data: Partial<WebsiteRssConfig>) => {
  return request.post('/api/website-rss/debug-script', data)
}