import React, { useEffect, useState, useCallback, useRef } from "react";
import { Globe, Plus, Trash2, Edit2, Copy, Check, RefreshCw, Download, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { WebsiteRssConfig, WebsiteRssCreate } from "@/types/feed";
import { websiteRssApi, getWebsiteFeedUrl } from "@/lib/feed-api";
import { cn, copyToClipboard } from "@/lib/utils";
import WebsiteRssForm from "./WebsiteRssForm";

function downloadExportBlob(exportData: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; document.body.appendChild(a);
  a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function WebsiteRssPanel() {
  const [configs, setConfigs] = useState<WebsiteRssConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WebsiteRssConfig | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { setConfigs(await websiteRssApi.list()); }
    catch (e) { setError(e instanceof Error ? e.message : "加载失败"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此监控配置？")) return;
    try {
      await websiteRssApi.delete(id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch (e) { alert(e instanceof Error ? e.message : "删除失败"); }
  };

  const handleRefresh = async (id: number) => {
    setRefreshingId(id);
    try {
      const res = await websiteRssApi.refresh(id);
      if (res.success) await loadConfigs();
      else alert(`刷新失败: ${res.error}`);
    } catch (e) { alert(e instanceof Error ? e.message : "刷新失败"); }
    finally { setRefreshingId(null); }
  };

  const handleCopyUrl = (config: WebsiteRssConfig) => {
    copyToClipboard(getWebsiteFeedUrl(config.key)).then((success) => {
      if (success) {
        setCopiedId(config.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    });
  };

  const handleToggleSelect = (id: number) => {
    setSelectedExportIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setSelectedExportIds(selectedExportIds.length === configs.length ? [] : configs.map((c) => c.id));
  };

  const handleConfirmExport = async () => {
    if (selectedExportIds.length === 0) return alert("请至少勾选一个监控项");
    setIsExporting(true);
    try {
      const selectedConfigs = configs.filter((c) => selectedExportIds.includes(c.id));
      const exportData = {
        version: 1, exportAt: new Date().toISOString(),
        configs: selectedConfigs.map((c) => ({
          title: c.title, rssDescription: c.rssDescription, url: c.url, key: c.key,
          renderMode: c.renderMode, fetchInterval: c.fetchInterval, favicon: c.favicon,
          selector: c.selector, authCredentialId: c.authCredentialId,
        })),
      };
      downloadExportBlob(exportData, "feedhub-websites-export.json");
      setIsExportMode(false); setSelectedExportIds([]);
    } catch (err) { alert("导出失败: " + (err instanceof Error ? err.message : String(err))); }
    finally { setIsExporting(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsImporting(true);
    try {
      const data = JSON.parse(await file.text()) as { configs?: Array<WebsiteRssCreate> };
      if (!data.configs || !Array.isArray(data.configs)) throw new Error("缺少 configs 数组");
      let successCount = 0; let failCount = 0;
      for (const item of data.configs) {
        try { await websiteRssApi.create(item); successCount++; } catch (_err) { failCount++; }
      }
      setImportSuccess(true);
      alert(`成功导入 ${successCount} 个配置` + (failCount > 0 ? ` (${failCount} 个跳过)` : ""));
      await loadConfigs(); setTimeout(() => setImportSuccess(false), 2000);
    } catch (err) { alert("导入失败: " + (err instanceof Error ? err.message : String(err))); }
    finally { setIsImporting(false); if (e.target) e.target.value = ""; }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative">
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
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting || isExportMode} className="gap-1.5 h-8 text-xs border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover">
            {importSuccess ? <Check size={13} className="text-emerald-500" /> : <Upload size={13} />}
            {isImporting ? "导入中..." : importSuccess ? "导入成功" : "导入配置包"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setIsExportMode(true); setSelectedExportIds([]); }} disabled={configs.length === 0 || isExportMode} className="gap-1.5 h-8 text-xs border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover">
            <Download size={13} />
            {isExportMode ? "请勾选下方列表" : "导出配置包"}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadConfigs}>
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => { setEditingConfig(null); setFormOpen(true); }} className="gap-1.5">
            <Plus size={14} />新建监控
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && <div className="mb-4 px-4 py-3 rounded-xl bg-accent-danger/10 text-accent-danger text-sm border border-accent-danger/20">{error}</div>}
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : configs.length === 0 ? (
          <EmptyState onNew={() => { setEditingConfig(null); setFormOpen(true); }} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {configs.map((config) => (
                <WebsiteCard
                  key={config.id} config={config} isCopied={copiedId === config.id} isRefreshing={refreshingId === config.id}
                  isExportMode={isExportMode} isSelected={selectedExportIds.includes(config.id)} onToggleSelect={handleToggleSelect}
                  onEdit={() => { setEditingConfig(config); setFormOpen(true); }} onDelete={handleDelete} onCopyUrl={handleCopyUrl} onRefresh={handleRefresh}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExportMode && (
          <div className="fixed bottom-8 left-0 right-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-full border border-app-border bg-app-surface/90 backdrop-blur-md shadow-2xl shadow-black/20"
            >
              <span className="text-xs font-semibold text-tx-primary px-2">已选 {selectedExportIds.length} 项</span>
              <div className="w-px h-4 bg-app-border" />
              <Button size="sm" variant="outline" onClick={handleSelectAll} className="h-8 text-xs rounded-full border-app-border bg-app-surface hover:bg-app-hover">
                {selectedExportIds.length === configs.length ? "取消全选" : "全选"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsExportMode(false)} className="h-8 text-xs rounded-full border-app-border bg-app-surface hover:bg-app-hover">
                取消
              </Button>
              <Button size="sm" onClick={handleConfirmExport} disabled={isExporting || selectedExportIds.length === 0} className="h-8 text-xs rounded-full gap-1.5 shadow-md px-4">
                <Download size={13} />{isExporting ? "导出中..." : "确认导出"}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formOpen && <WebsiteRssForm config={editingConfig} onClose={() => setFormOpen(false)} onSave={() => { setFormOpen(false); loadConfigs(); }} />}
      </AnimatePresence>
    </div>
  );
}

const formatLastFetchTime = (timeStr?: string): string => {
  if (!timeStr) return "暂无";
  const safeTimeStr = timeStr.includes(" ") && !timeStr.includes("T")
    ? timeStr.replace(" ", "T") + "Z"
    : timeStr;
  const date = new Date(safeTimeStr);
  return isNaN(date.getTime()) ? "暂无" : date.toLocaleString();
};

function WebsiteCard({
  config, isCopied, isRefreshing, isExportMode, isSelected,
  onToggleSelect, onEdit, onDelete, onCopyUrl, onRefresh
}: {
  config: WebsiteRssConfig; isCopied: boolean; isRefreshing: boolean;
  isExportMode?: boolean; isSelected?: boolean; onToggleSelect?: (id: number) => void;
  onEdit: () => void; onDelete: (id: number) => void; onCopyUrl: (c: WebsiteRssConfig) => void; onRefresh: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className={cn("group p-4 rounded-xl border transition-all flex items-start gap-3", isSelected ? "border-accent-primary bg-accent-primary/5" : "border-app-border bg-app-surface hover:border-accent-primary/30 hover:shadow-sm")}
    >
      {isExportMode && (
        <input type="checkbox" checked={!!isSelected} onChange={() => onToggleSelect?.(config.id)} className="mt-1 w-4 h-4 rounded border-app-border text-accent-primary focus:ring-accent-primary cursor-pointer shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 min-w-0">
          {config.favicon && <img src={config.favicon} className="w-4 h-4 rounded shrink-0" alt="" />}
          <span className="text-sm font-semibold text-tx-primary truncate flex-1 min-w-0" title={config.title}>{config.title}</span>
          {config.lastFetchStatus && (
            <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border shrink-0", config.lastFetchStatus === "success" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
              <span className={cn("w-1.5 h-1.5 rounded-full", config.lastFetchStatus === "success" ? "bg-green-500" : "bg-red-500")} />
              {config.lastFetchStatus === "success" ? "正常" : "失败"}
            </span>
          )}
        </div>
        <p className="text-xs text-tx-tertiary truncate">{config.url}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-tx-tertiary font-mono">key: {config.key}</span>
          <span className="text-[11px] text-tx-tertiary">每 {config.fetchInterval}min 刷新</span>
          <span className="text-[11px] text-tx-tertiary">最近执行时间: {formatLastFetchTime(config.lastFetchTime)}</span>
          <span className="text-[11px] text-tx-tertiary">最近执行状态: {config.lastFetchStatus ? (config.lastFetchStatus === "success" ? "成功" : "失败") : "暂无"}</span>
        </div>
      </div>
      {!isExportMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-tx-primary" onClick={() => onCopyUrl(config)} title="复制 Feed URL">
            {isCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-accent-primary" onClick={() => onRefresh(config.id)} disabled={isRefreshing} title="立即刷新">
            <RefreshCw size={13} className={cn(isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-tx-primary" onClick={onEdit} title="编辑配置"><Edit2 size={13} /></Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-accent-danger" onClick={() => onDelete(config.id)} title="删除"><Trash2 size={13} /></Button>
        </div>
      )}
    </motion.div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-4"><Globe size={22} className="text-accent-primary" /></div>
      <h3 className="text-sm font-semibold text-tx-primary mb-1">还没有网页监控</h3>
      <p className="text-xs text-tx-tertiary mb-4">配置 CSS 选择器，自动抓取任意网页</p>
      <Button size="sm" onClick={onNew} className="gap-1.5"><Plus size={14} />创建监控</Button>
    </div>
  );
}
