import React, { useEffect, useState, useCallback, useRef } from "react";
import { Rss, Plus, Check, RefreshCw, Download, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DynamicRoute } from "@/types/feed";
import { dynamicRouteApi, getDynamicFeedUrl } from "@/lib/feed-api";
import { cn } from "@/lib/utils";
import DynamicRouteForm from "./DynamicRouteForm";
import DynamicRouteScriptDialog from "./DynamicRouteScriptDialog";
import { RouteCard, EmptyState } from "./DynamicRouteHelpers";
import { downloadExportBlob, fetchRouteFiles, importSingleRoute } from "./DynamicRouteUtils";

export default function DynamicRoutePanel() {
  const [routes, setRoutes] = useState<DynamicRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<DynamicRoute | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [scriptRoute, setScriptRoute] = useState<DynamicRoute | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRoutes = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { setRoutes(await dynamicRouteApi.list()); }
    catch (e) { setError(e instanceof Error ? e.message : "加载失败"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此路由？")) return;
    try {
      await dynamicRouteApi.delete(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { alert(e instanceof Error ? e.message : "删除失败"); }
  };

  const handleCopyUrl = (route: DynamicRoute) => {
    navigator.clipboard.writeText(getDynamicFeedUrl(route.path)).then(() => {
      setCopiedId(route.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleFormSave = (savedRoute: DynamicRoute) => {
    setFormOpen(false); loadRoutes();
    if (!editingRoute) { setScriptRoute(savedRoute); setScriptDialogOpen(true); }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedExportIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setSelectedExportIds(selectedExportIds.length === routes.length ? [] : routes.map((r) => r.id));
  };

  const handleConfirmExport = async () => {
    if (selectedExportIds.length === 0) return alert("请至少勾选一个路由");
    setIsExporting(true);
    try {
      const selectedRoutes = routes.filter((r) => selectedExportIds.includes(r.id));
      const routesWithFiles = await Promise.all(selectedRoutes.map(async (r) => ({
        name: r.name, path: r.path, method: r.method, description: r.description,
        refreshInterval: r.refreshInterval, params: r.params, authCredentialId: r.authCredentialId,
        files: await fetchRouteFiles(r),
      })));
      downloadExportBlob({ version: 1, exportAt: new Date().toISOString(), routes: routesWithFiles }, "feedhub-routes-export.json");
      setIsExportMode(false); setSelectedExportIds([]);
    } catch (err) { alert("导出失败: " + (err instanceof Error ? err.message : String(err))); }
    finally { setIsExporting(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsImporting(true);
    try {
      const data = JSON.parse(await file.text()) as { routes?: Array<Record<string, unknown>> };
      if (!data.routes || !Array.isArray(data.routes)) throw new Error("缺少 routes 数组");
      let successCount = 0; let failCount = 0;
      for (const item of data.routes) {
        try { await importSingleRoute(item); successCount++; } catch (_err) { failCount++; }
      }
      setImportSuccess(true);
      alert(`成功导入 ${successCount} 个路由` + (failCount > 0 ? ` (${failCount} 个跳过)` : ""));
      await loadRoutes(); setTimeout(() => setImportSuccess(false), 2000);
    } catch (err) { alert("导入失败: " + (err instanceof Error ? err.message : String(err))); }
    finally { setIsImporting(false); if (e.target) e.target.value = ""; }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative">
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
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting || isExportMode} className="gap-1.5 h-8 text-xs border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover">
            {importSuccess ? <Check size={13} className="text-emerald-500" /> : <Upload size={13} />}
            {isImporting ? "导入中..." : importSuccess ? "导入成功" : "导入路由包"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setIsExportMode(true); setSelectedExportIds([]); }} disabled={routes.length === 0 || isExportMode} className="gap-1.5 h-8 text-xs border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover">
            <Download size={13} />
            {isExportMode ? "请勾选下方列表" : "导出路由包"}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadRoutes} className="text-tx-secondary hover:text-tx-primary">
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => { setEditingRoute(null); setFormOpen(true); }} className="gap-1.5">
            <Plus size={14} />新建路由
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && <div className="mb-4 px-4 py-3 rounded-xl bg-accent-danger/10 text-accent-danger text-sm border border-accent-danger/20">{error}</div>}
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : routes.length === 0 ? (
          <EmptyState onNew={() => { setEditingRoute(null); setFormOpen(true); }} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {routes.map((route) => (
                <RouteCard
                  key={route.id} route={route} isCopied={copiedId === route.id} isExportMode={isExportMode}
                  isSelected={selectedExportIds.includes(route.id)} onToggleSelect={handleToggleSelect}
                  onEditConfig={(r) => { setEditingRoute(r); setFormOpen(true); }}
                  onEditScript={(r) => { setScriptRoute(r); setScriptDialogOpen(true); }}
                  onDelete={handleDelete} onCopyUrl={handleCopyUrl}
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
                {selectedExportIds.length === routes.length ? "取消全选" : "全选"}
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
        {formOpen && <DynamicRouteForm route={editingRoute} onClose={() => setFormOpen(false)} onSave={handleFormSave} />}
      </AnimatePresence>

      <AnimatePresence>
        {scriptDialogOpen && scriptRoute && <DynamicRouteScriptDialog route={scriptRoute} onClose={() => { setScriptDialogOpen(false); loadRoutes(); }} onSave={loadRoutes} />}
      </AnimatePresence>
    </div>
  );
}
