import React, { useEffect, useState, useCallback } from "react";
import { X, Save, RefreshCw, Terminal, FileCode2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DynamicRoute, DynamicRouteCreate, DynamicRouteUpdate } from "@/types/feed";
import { dynamicRouteApi } from "@/lib/feed-api";
import ScriptEditor from "./ScriptEditor";
import RouteDebugDrawer from "./RouteDebugDrawer";

interface Props {
  route: DynamicRoute | null;
  onClose: () => void;
  onSave: () => void;
}

type Tab = "config" | "script" | "debug";

export default function DynamicRouteForm({ route, onClose, onSave }: Props) {
  const isNew = !route;
  const [tab, setTab] = useState<Tab>("config");
  const [isSaving, setIsSaving] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<DynamicRoute | null>(route);

  const [name, setName] = useState(route?.name ?? "");
  const [routePath, setRoutePath] = useState(route?.path ?? "/");
  const [description, setDescription] = useState(route?.description ?? "");
  const [refreshInterval, setRefreshInterval] = useState(route?.refreshInterval ?? 60);

  useEffect(() => {
    if (route) {
      setCurrentRoute(route);
      setName(route.name);
      setRoutePath(route.path);
      setDescription(route.description ?? "");
      setRefreshInterval(route.refreshInterval);
    }
  }, [route]);

  const handleSaveConfig = useCallback(async () => {
    if (!name.trim() || !routePath.trim()) return;
    setIsSaving(true);
    try {
      if (isNew) {
        const created = await dynamicRouteApi.create({
          name, path: routePath, method: "GET",
          params: [], script: { sourceType: "inline", folder: "", timeout: 30000 },
          description, refreshInterval,
        } as DynamicRouteCreate);
        setCurrentRoute(created);
        setTab("script");
      } else if (route) {
        const updated = await dynamicRouteApi.update(route.id, {
          name, path: routePath, description, refreshInterval,
        } as DynamicRouteUpdate);
        setCurrentRoute(updated);
        onSave();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [name, routePath, description, refreshInterval, isNew, route, onSave]);

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
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-app-surface border-l border-app-border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <div>
            <h3 className="text-sm font-semibold text-tx-primary">
              {isNew ? "新建动态路由" : `编辑 · ${route?.name}`}
            </h3>
            <p className="text-xs text-tx-tertiary mt-0.5">
              {isNew ? "创建并配置脚本后即可使用" : `路径: ${route?.path}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-app-border px-6">
          {([
            { key: "config", label: "基础配置", icon: <ChevronRight size={13} />, disabled: false },
            { key: "script", label: "脚本编辑", icon: <FileCode2 size={13} />, disabled: isNew && !currentRoute },
            { key: "debug", label: "调试运行", icon: <Terminal size={13} />, disabled: isNew && !currentRoute },
          ] as const).map((t) => (
            <button
              key={t.key}
              disabled={t.disabled}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-tx-tertiary hover:text-tx-primary"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === "config" && (
            <ConfigTab
              name={name} setName={setName}
              routePath={routePath} setRoutePath={setRoutePath}
              description={description} setDescription={setDescription}
              refreshInterval={refreshInterval} setRefreshInterval={setRefreshInterval}
            />
          )}
          {tab === "script" && currentRoute && (
            <ScriptEditor routeId={currentRoute.id} scriptFolder={currentRoute.script.folder} />
          )}
          {tab === "debug" && currentRoute && (
            <RouteDebugDrawer routeId={currentRoute.id} />
          )}
        </div>

        {/* Footer (only show on config tab) */}
        {tab === "config" && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app-border">
            <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleSaveConfig} disabled={isSaving} className="gap-1.5 min-w-20">
              {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              {isNew ? "创建并继续" : "保存"}
            </Button>
          </div>
        )}
      </motion.div>
    </>
  );
}

interface ConfigTabProps {
  name: string; setName: (v: string) => void;
  routePath: string; setRoutePath: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  refreshInterval: number; setRefreshInterval: (v: number) => void;
}

function ConfigTab({ name, setName, routePath, setRoutePath, description, setDescription, refreshInterval, setRefreshInterval }: ConfigTabProps) {
  return (
    <div className="p-6 space-y-5">
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
        <label className="text-xs font-medium text-tx-secondary">路由路径 *</label>
        <input
          value={routePath}
          onChange={(e) => setRoutePath(e.target.value)}
          placeholder="/github/trending"
          className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary font-mono focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
        <p className="text-[11px] text-tx-tertiary">路径必须以 / 开头，访问地址: /api/dynamic/sub{routePath}</p>
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
    </div>
  );
}
