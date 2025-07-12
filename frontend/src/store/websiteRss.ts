import { defineStore } from 'pinia';
import { WebsiteRssConfig, WebsiteRssStore } from '../types/websiteRss';
import * as websiteRssApi from '../api/websiteRss';

export const useWebsiteRssStore = defineStore('websiteRss', {
  state: (): WebsiteRssStore => ({
    configs: [],
    currentConfig: null,
    loading: false,
    error: null,
  }),
  
  actions: {
    // 获取所有网站RSS配置
    async fetchAllConfigs() {
      this.loading = true;
      this.error = null;
      try {
        const response = await websiteRssApi.getAllConfigs();
        this.configs = response.data || [];
      } catch (error) {
        this.error = error instanceof Error ? error.message : '获取网站RSS配置失败';
        console.error('获取网站RSS配置失败:', error);
      } finally {
        this.loading = false;
      }
    },
    
    // 获取单个网站RSS配置
    async fetchConfigById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await websiteRssApi.getConfigById(id);
        this.currentConfig = response.data || null;
        return response.data;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '获取网站RSS配置详情失败';
        console.error('获取网站RSS配置详情失败:', error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    // 添加网站RSS配置
    async addConfig(config: WebsiteRssConfig) {
      this.loading = true;
      this.error = null;
      try {
        const response = await websiteRssApi.addConfig(config);
        if (response.data) {
          this.configs.push(response.data);
        }
        return response.data;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '添加网站RSS配置失败';
        console.error('添加网站RSS配置失败:', error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    // 更新网站RSS配置
    async updateConfig(id: number, config: WebsiteRssConfig) {
      this.loading = true;
      this.error = null;
      try {
        const response = await websiteRssApi.updateConfig(id, config);
        const index = this.configs.findIndex(item => item.id === id);
        if (index !== -1) {
          this.configs[index] = response.data;
        }
        if (this.currentConfig?.id === id) {
          this.currentConfig = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '更新网站RSS配置失败';
        console.error('更新网站RSS配置失败:', error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    // 删除网站RSS配置
    async deleteConfig(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await websiteRssApi.deleteConfig(id);
        this.configs = this.configs.filter(item => item.id !== id);
        if (this.currentConfig?.id === id) {
          this.currentConfig = null;
        }
        return true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '删除网站RSS配置失败';
        console.error('删除网站RSS配置失败:', error);
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // 刷新网站RSS配置
    async refreshConfig(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await websiteRssApi.refreshConfig(id);
        const index = this.configs.findIndex(item => item.id === id);
        if (index !== -1) {
          if (response.data) {
            this.configs[index] = response.data;
          }
        }
        if (this.currentConfig?.id === id) {
          this.currentConfig = response.data || null;
        }
        return response.data;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '刷新网站RSS配置失败';
        console.error('刷新网站RSS配置失败:', error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    // 设置当前配置
    setCurrentConfig(config: WebsiteRssConfig | null) {
      this.currentConfig = config;
    },
    
    // 清除错误
    clearError() {
      this.error = null;
    }
  }
});