import React, { useEffect, useState, useCallback } from "react";
import { Globe, Plus, Trash2, Edit2, Copy, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteRssConfig } from "@/types/feed";
import { websiteRssApi, getWebsiteFeedUrl } from "@/lib/feed-api";
import { cn } from "@/lib/utils";
import WebsiteRssForm from "./WebsiteRssForm";

export default function WebsiteRssPanel() {
  const [configs, setConfigs] = useState<WebsiteRssConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WebsiteRssConfig | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await websiteRssApi.list();
      setConfigs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此监控配置？")) return;
    try {
      await websiteRssApi.delete(id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleRefresh = async (id: number) => {
    setRefreshingId(id);
    try {
      const res = await websiteRssApi.refresh(id);
      if (res.success) {
        await loadConfigs();
      } else {
        alert(`刷新失败: ${res.error}`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "刷新失败");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleCopyUrl = (config: WebsiteRssConfig) => {
    navigator.clipboard.writeText(getWebsiteFeedUrl(config.key)).then(() => {
      setCopiedId(config.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <Globe size={16} className="text-accent-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-tx-primary">网页监控</h2>
            <p className="text-xs text-tx-tertiary">通过 CSS/XPath 选择器抓取网页生成 Feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadConfigs}>
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => { setEditingConfig(null); setFormOpen(true); }} className="gap-1.5">
            <Plus size={14} />
            新建监控
          </Button>
        </div>
      </div>

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
        ) : configs.length === 0 ? (
          <EmptyState onNew={() => { setEditingConfig(null); setFormOpen(true); }} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {configs.map((config) => (
                <WebsiteCard
                  key={config.id}
                  config={config}
                  isCopied={copiedId === config.id}
                  isRefreshing={refreshingId === config.id}
                  onEdit={() => { setEditingConfig(config); setFormOpen(true); }}
                  onDelete={handleDelete}
                  onCopyUrl={handleCopyUrl}
                  onRefresh={handleRefresh}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {formOpen && (
          <WebsiteRssForm
            config={editingConfig}
            onClose={() => setFormOpen(false)}
            onSave={() => { setFormOpen(false); loadConfigs(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WebsiteCard({ config, isCopied, isRefreshing, onEdit, onDelete, onCopyUrl, onRefresh }: {
  config: WebsiteRssConfig;
  isCopied: boolean;
  isRefreshing: boolean;
  onEdit: () => void;
  onDelete: (id: number) => void;
  onCopyUrl: (c: WebsiteRssConfig) => void;
  onRefresh: (id: number) => void;
}) {
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
            {config.favicon && <img src={config.favicon} className="w-4 h-4 rounded" alt="" />}
            <span className="text-sm font-semibold text-tx-primary truncate">{config.title}</span>
            <Badge variant="secondary" className="text-xs shrink-0">{config.renderMode}</Badge>
            {config.lastFetchStatus && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border shrink-0",
                config.lastFetchStatus === "success"
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-red-500/10 text-red-500 border-red-500/20"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full",
                  config.lastFetchStatus === "success" ? "bg-green-500" : "bg-red-500")} />
                {config.lastFetchStatus === "success" ? "正常" : "失败"}
              </span>
            )}
          </div>
          <p className="text-xs text-tx-tertiary truncate">{config.url}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-tx-tertiary font-mono">key: {config.key}</span>
            <span className="text-[11px] text-tx-tertiary">每 {config.fetchInterval}min 刷新</span>
            {config.lastFetchTime && (
              <span className="text-[11px] text-tx-tertiary">
                上次: {new Date(config.lastFetchTime).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-tx-primary"
            onClick={() => onCopyUrl(config)} title="复制 Feed URL">
            {isCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-accent-primary"
            onClick={() => onRefresh(config.id)} disabled={isRefreshing} title="立即刷新">
            <RefreshCw size={13} className={cn(isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-tx-primary"
            onClick={onEdit} title="编辑配置">
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-accent-danger"
            onClick={() => onDelete(config.id)} title="删除">
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-4">
        <Globe size={22} className="text-accent-primary" />
      </div>
      <h3 className="text-sm font-semibold text-tx-primary mb-1">还没有网页监控</h3>
      <p className="text-xs text-tx-tertiary mb-4">配置 CSS 选择器，自动抓取任意网页</p>
      <Button size="sm" onClick={onNew} className="gap-1.5">
        <Plus size={14} />
        创建第一个监控
      </Button>
    </div>
  );
}
