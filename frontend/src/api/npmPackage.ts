import request from "@/utils/request";

export interface NpmPackage {
  id?: number;
  name: string;
  version: string;
  description: string;
  status: "installing" | "installed";
  installPath?: string;
  size?: number;
  dependencies?: string[];
  installedAt?: string;
  lastUsedAt?: string;
  usageCount?: number;
  isWhitelisted: boolean;
}

export interface PackageStats {
  totalPackages: number;
  installedPackages: number;
  totalSize: number;
  totalUsage: number;
}

export const npmPackageApi = {
  // 获取所有包
  getAllPackages: () => {
    return request.get<NpmPackage[]>("/api/npm-package");
  },

  // 获取已安装的包
  getInstalledPackages: () => {
    return request.get<NpmPackage[]>("/api/npm-package/installed");
  },

  // 安装包
  installPackage: (data: { packageName: string; version?: string }) => {
    return request.post("/api/npm-package/install", data, {
      showSuccessMessage: true,
      successMessage: `包 ${data.packageName} 安装成功！`,
    });
  },

  // 卸载包
  uninstallPackage: (packageName: string) => {
    return request.delete(`/api/npm-package/uninstall/${encodeURIComponent(packageName)}`, {
      showSuccessMessage: true,
      successMessage: `包 ${packageName} 卸载成功！`,
    });
  },

  // 获取安全白名单
  getWhitelist: () => {
    return request.get<string[]>("/api/npm-package/whitelist");
  },

  // 获取包统计信息
  getStats: () => {
    return request.get<PackageStats>("/api/npm-package/stats");
  },
};
