import { defineStore } from "pinia";
import { BookRssConfig, BookRssStore } from "@feedhub/shared/src/types/bookRss";
import * as bookRssApi from "../api/bookRss";

export const useBookRssStore = defineStore("bookRss", {
  state: (): BookRssStore => ({
    configs: [],
    currentConfig: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchConfigs() {
      this.loading = true;
      this.error = null;
      try {
        const response = await bookRssApi.getAllConfigs();
        this.configs = response.data || [];
      } catch (error: any) {
        this.error = error.message || "获取图书RSS配置失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchConfigById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await bookRssApi.getConfigById(id);
        this.currentConfig = response.data || null;
        return this.currentConfig;
      } catch (error: any) {
        this.error = error.message || "获取图书RSS配置失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addConfig(config: Omit<BookRssConfig, "id" | "lastUpdateTime" | "lastBooks">) {
      this.loading = true;
      this.error = null;
      try {
        const response = await bookRssApi.addConfig(config);
        this.configs.push(response.data!);
        return response.data;
      } catch (error: any) {
        this.error = error.message || "添加图书RSS配置失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateConfig(id: number, config: Partial<BookRssConfig>) {
      this.loading = true;
      this.error = null;
      try {
        const response = await bookRssApi.updateConfig(id, config);
        const index = this.configs.findIndex((c) => c.id === id);
        if (index !== -1) {
          this.configs[index] = response.data!;
        }
        if (this.currentConfig?.id === id) {
          this.currentConfig = response.data!;
        }
        return response.data;
      } catch (error: any) {
        this.error = error.message || "更新图书RSS配置失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteConfig(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await bookRssApi.deleteConfig(id);
        this.configs = this.configs.filter((c) => c.id !== id);
        if (this.currentConfig?.id === id) {
          this.currentConfig = null;
        }
      } catch (error: any) {
        this.error = error.message || "删除图书RSS配置失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async refreshConfig(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await bookRssApi.refreshConfig(id);
        const index = this.configs.findIndex((c) => c.id === id);
        if (index !== -1) {
          this.configs[index] = response.data!;
        }
        if (this.currentConfig?.id === id) {
          this.currentConfig = response.data!;
        }
        return response.data;
      } catch (error: any) {
        this.error = error.message || "刷新图书RSS配置失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    setCurrentConfig(config: BookRssConfig | null) {
      this.currentConfig = config;
    },

    clearError() {
      this.error = null;
    },
  },

  getters: {
    getConfigById: (state) => (id: number) => {
      return state.configs.find((config) => config.id === id);
    },

    getConfigByKey: (state) => (key: string) => {
      return state.configs.find((config) => config.key === key);
    },

    hasConfigs: (state) => state.configs.length > 0,

    configsCount: (state) => state.configs.length,
  },
});