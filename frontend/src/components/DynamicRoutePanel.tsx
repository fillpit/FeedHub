import React, { useEffect, useState, useCallback } from "react";
import { Rss, Plus, Trash2, Edit2, Play, Copy, Check, RefreshCw, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DynamicRoute } from "@/types/feed";
import { dynamicRouteApi, getDynamicFeedUrl } from "@/lib/feed-api";
import { cn } from "@/lib/utils";
import DynamicRouteForm from "./DynamicRouteForm";

export default function DynamicRoutePanel() {
  const [routes, setRoutes] = useState<DynamicRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<DynamicRoute | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadRoutes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dynamicRouteApi.list();
      setRoutes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此路由？此操作不可恢复。")) return;
    try {
      await dynamicRouteApi.delete(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleCopyUrl = (route: DynamicRoute) => {
    const url = getDynamicFeedUrl(route.path);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(route.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleEdit = (route: DynamicRoute) => {
    setEditingRoute(route);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingRoute(null);
    setFormOpen(true);
  };

  const handleFormSave = () => {
    setFormOpen(false);
    loadRoutes();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <Rss size={16} className="text-accent-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-tx-primary">动态路由</h2>
            <p className="text-xs text-tx-tertiary">通过自定义脚本生成 RSS / JSON Feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadRoutes} className="text-tx-secondary hover:text-tx-primary">
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={handleNew} className="gap-1.5">
            <Plus size={14} />
            新建路由
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-accent-danger/10 text-accent-danger text-sm border border-accent-danger/20">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : routes.length === 0 ? (
          <EmptyState onNew={handleNew} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isCopied={copiedId === route.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCopyUrl={handleCopyUrl}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Form Drawer */}
      <AnimatePresence>
        {formOpen && (
          <DynamicRouteForm
            route={editingRoute}
            onClose={() => setFormOpen(false)}
            onSave={handleFormSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface RouteCardProps {
  route: DynamicRoute;
  isCopied: boolean;
  onEdit: (route: DynamicRoute) => void;
  onDelete: (id: number) => void;
  onCopyUrl: (route: DynamicRoute) => void;
}

function RouteCard({ route, isCopied, onEdit, onDelete, onCopyUrl }: RouteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group p-4 rounded-xl border border-app-border bg-app-surface hover:border-accent-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-tx-primary truncate">{route.name}</span>
            <Badge variant="secondary" className="text-xs shrink-0">{route.method}</Badge>
            <StatusBadge status={route.lastRunStatus} />
          </div>
          <p className="text-xs text-tx-tertiary font-mono truncate">{route.path}</p>
          {route.description && (
            <p className="text-xs text-tx-secondary mt-1 line-clamp-1">{route.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-tx-tertiary">
              刷新间隔: {route.refreshInterval}min
            </span>
            {route.lastRunAt && (
              <span className="text-[11px] text-tx-tertiary">
                上次执行: {new Date(route.lastRunAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-tx-tertiary hover:text-tx-primary"
            onClick={() => onCopyUrl(route)}
            title="复制 Feed URL"
          >
            {isCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-tx-tertiary hover:text-tx-primary"
            onClick={() => onEdit(route)}
            title="编辑路由"
          >
            <Code size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-tx-tertiary hover:text-accent-primary"
            onClick={() => onEdit(route)}
            title="编辑配置"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-tx-tertiary hover:text-accent-danger"
            onClick={() => onDelete(route.id)}
            title="删除路由"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border shrink-0",
      status === "success"
        ? "bg-green-500/10 text-green-500 border-green-500/20"
        : "bg-red-500/10 text-red-500 border-red-500/20"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "success" ? "bg-green-500" : "bg-red-500")} />
      {status === "success" ? "正常" : "失败"}
    </span>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-4">
        <Rss size={22} className="text-accent-primary" />
      </div>
      <h3 className="text-sm font-semibold text-tx-primary mb-1">还没有动态路由</h3>
      <p className="text-xs text-tx-tertiary mb-4">通过 JS 脚本生成自定义 RSS Feed</p>
      <Button size="sm" onClick={onNew} className="gap-1.5">
        <Plus size={14} />
        创建第一个路由
      </Button>
    </div>
  );
}
