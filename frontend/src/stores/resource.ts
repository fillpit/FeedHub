import { defineStore } from "pinia";
import type {
  Resource,
  ShareInfoResponse,
  ShareInfo,
} from "@/types";
import { ElMessage } from "element-plus";

interface StorageListObject {
  list: Resource[];
  lastUpdateTime?: string;
}

const lastResource = (
  localStorage.getItem("last_resource_list")
    ? JSON.parse(localStorage.getItem("last_resource_list") as string)
    : { list: [] }
) as StorageListObject;

export const useResourceStore = defineStore("resource", {
  state: () => ({
    tagColor: {
      baiduPan: "primary",
      weiyun: "info",
      aliyun: "warning",
      pan115: "danger",
      quark: "success",
    },
    keyword: "",
    resources: lastResource.list,
    lastUpdateTime: lastResource.lastUpdateTime || "",
    shareInfo: {} as ShareInfoResponse,
    resourceSelect: [] as ShareInfo[],
    loading: false,
    backupPlan: false,
    loadTree: false,
  }),

  actions: {
    setLoadTree(loadTree: boolean) {
      this.loadTree = loadTree;
    },

    // 设置选择资源
    async setSelectedResource(resourceSelect: ShareInfo[]) {
      this.resourceSelect = resourceSelect;
    },

    // 统一错误处理
    handleError(message: string, error: unknown): void {
      console.error(message, error);
      ElMessage.error(error instanceof Error ? error.message : message);
    },
  },
});