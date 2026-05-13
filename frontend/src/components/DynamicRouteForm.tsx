import React, { useEffect, useState, useCallback } from "react";
import { X, Save, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DynamicRoute, DynamicRouteCreate, DynamicRouteUpdate, RouteParam, AuthCredential } from "@/types/feed";
import { dynamicRouteApi, authCredentialApi } from "@/lib/feed-api";
import RouteParamEditor from "./RouteParamEditor";

interface Props {
  route: DynamicRoute | null;
  onClose: () => void;
  onSave: (route: DynamicRoute) => void;
}

export default function DynamicRouteForm({ route, onClose, onSave }: Props) {
  const isNew = !route;
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(route?.name ?? "");
  const [routePath, setRoutePath] = useState(route?.path ?? "/");
  const [description, setDescription] = useState(route?.description ?? "");
  const [refreshInterval, setRefreshInterval] = useState(route?.refreshInterval ?? 60);
  const [authCredentialId, setAuthCredentialId] = useState<number | undefined>(route?.authCredentialId);
  const [params, setParams] = useState<RouteParam[]>(route?.params ?? []);
  const [credentials, setCredentials] = useState<AuthCredential[]>([]);

  // Load available credentials list
  useEffect(() => {
    authCredentialApi.list()
      .then(setCredentials)
      .catch((err) => console.error("加载授权凭证失败", err));
  }, []);

  useEffect(() => {
    if (route) {
      setName(route.name);
      setRoutePath(route.path);
      setDescription(route.description ?? "");
      setRefreshInterval(route.refreshInterval);
      setParams(route.params ?? []);
      setAuthCredentialId(route.authCredentialId);
    }
  }, [route]);

  const handleSaveConfig = useCallback(async () => {
    if (!name.trim() || !routePath.trim()) return;
    
    // Validate that parameter names are not empty
    const hasEmptyParam = params.some((p) => !p.name.trim());
    if (hasEmptyParam) {
      alert("所有配置的参数名均不能为空！");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await dynamicRouteApi.create({
          name,
          path: routePath,
          method: "GET",
          params,
          script: { sourceType: "inline", folder: "", timeout: 30000 },
          description,
          refreshInterval,
          authCredentialId: authCredentialId || null,
        } as DynamicRouteCreate);
        onSave(created);
      } else if (route) {
        const updated = await dynamicRouteApi.update(route.id, {
          name,
          path: routePath,
          params,
          description,
          refreshInterval,
          authCredentialId: authCredentialId || null,
        } as DynamicRouteUpdate);
        onSave(updated);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [name, routePath, params, description, refreshInterval, authCredentialId, isNew, route, onSave]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-app-surface border-l border-app-border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <div>
            <h3 className="text-sm font-semibold text-tx-primary">
              {isNew ? "新建动态路由" : `编辑 · ${route?.name}`}
            </h3>
            <p className="text-xs text-tx-tertiary mt-0.5">
              {isNew ? "配置基础参数，保存后可开始编辑脚本" : `路径: ${route?.path}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-tx-secondary">路由名称 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：GitHub Trending"
              className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-tx-secondary flex items-center gap-1">
              <span className="text-accent-danger font-bold">*</span>
              路由路径
            </label>
            <div className="flex rounded-lg border border-app-border overflow-hidden bg-app-bg focus-within:ring-1 focus-within:ring-accent-primary transition-all">
              <span className="flex items-center justify-center px-3.5 bg-app-surface border-r border-app-border text-xs text-tx-tertiary font-mono select-none">
                /dynamic
              </span>
              <input
                value={routePath}
                onChange={(e) => setRoutePath(e.target.value)}
                placeholder="/guokr/science"
                className="flex-1 px-3 py-2 text-sm bg-transparent text-tx-primary placeholder:text-tx-tertiary font-mono outline-none"
              />
            </div>
            <p className="text-[11px] text-tx-tertiary leading-relaxed">
              路由路径格式说明： 路径以 / 开头，支持动态参数（如 :uid、:id），动态参数会自动传递给脚本的 routeParams 变量。访问地址: /api/dynamic/sub{routePath}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-tx-secondary">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个路由的用途说明..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-tx-secondary">刷新间隔（分钟）</label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                min={1}
                max={10080}
                className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-tx-secondary">授权凭证（可选）</label>
              <select
                value={authCredentialId ?? ""}
                onChange={(e) => setAuthCredentialId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              >
                <option value="">无</option>
                {credentials.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-app-border" />

          {/* Route Params Editor */}
          <RouteParamEditor params={params} onChange={setParams} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app-border">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSaveConfig} disabled={isSaving} className="gap-1.5 min-w-20">
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {isNew ? "创建并继续" : "保存"}
          </Button>
        </div>
      </motion.div>
    </>
  );
}
