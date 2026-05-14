import React, { useState, useRef } from "react";
import { X, FileCode2, Play, BookOpen, Download, Upload, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DynamicRoute } from "@/types/feed";
import ScriptEditor from "./ScriptEditor";
import RouteDebugDrawer from "./RouteDebugDrawer";
import RouteScriptHelp from "./RouteScriptHelp";
import { dynamicRouteApi } from "@/lib/feed-api";

interface Props {
  route: DynamicRoute;
  onClose: () => void;
  onSave?: () => void;
}

function downloadExportBlob(exportData: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DynamicRouteScriptDialog({ route, onClose, onSave }: Props) {
  const [currentRoute, setCurrentRoute] = useState<DynamicRoute>(route);
  const [activeTab, setActiveTab] = useState<"debug" | "help">("debug");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScriptInit = (folder: string) => {
    setCurrentRoute((prev) => ({
      ...prev,
      script: { ...prev.script, folder },
    }));
    if (onSave) onSave();
  };

  const handleExport = async () => {
    if (!currentRoute.script.folder) {
      alert("脚本尚未初始化，无法导出");
      return;
    }
    setIsExporting(true);
    try {
      const files = await dynamicRouteApi.listFiles(currentRoute.id);
      const fileContents = await Promise.all(
        files.filter(f => f.type === "file").map(async (f) => {
          const { content } = await dynamicRouteApi.getFileContent(currentRoute.id, f.path);
          return { path: f.path, content };
        })
      );

      const exportData = {
        version: 1,
        exportAt: new Date().toISOString(),
        route: {
          name: currentRoute.name,
          path: currentRoute.path,
          method: currentRoute.method,
          description: currentRoute.description,
          refreshInterval: currentRoute.refreshInterval,
          params: currentRoute.params,
        },
        files: fileContents,
      };

      downloadExportBlob(exportData, `feedhub-script-${currentRoute.name || "export"}.json`);
    } catch (err) {
      alert("导出失败: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { files?: Array<{ path: string; content: string }> };

      if (!data.files || !Array.isArray(data.files)) {
        throw new Error("无效的脚本包格式: 缺少 files 描述");
      }

      if (!currentRoute.script.folder) {
        const res = await dynamicRouteApi.initScript(currentRoute.id);
        setCurrentRoute(prev => ({ ...prev, script: { ...prev.script, folder: res.folder } }));
      }

      for (const f of data.files) {
        await dynamicRouteApi.saveFileContent(currentRoute.id, f.path, f.content);
      }

      setImportSuccess(true);
      setRefreshKey(prev => prev + 1);
      setTimeout(() => setImportSuccess(false), 2000);
      if (onSave) onSave();
    } catch (err) {
      alert("导入失败: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const isScriptInitialized = !!currentRoute.script.folder;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          className="w-full max-w-6xl h-[85vh] max-h-[850px] bg-app-elevated border border-app-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0">
                <FileCode2 size={16} className="text-accent-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-tx-primary truncate">
                    脚本编辑与调试 · {currentRoute.name}
                  </h3>
                </div>
                <p className="text-[11px] text-tx-tertiary font-mono truncate mt-0.5">
                  路径: {currentRoute.path}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleImportClick}
                disabled={isImporting}
                className="gap-1.5 h-8 text-xs border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover"
              >
                {importSuccess ? <Check size={13} className="text-emerald-500" /> : <Upload size={13} />}
                {isImporting ? "导入中..." : importSuccess ? "导入成功" : "导入脚本包"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                disabled={isExporting || !isScriptInitialized}
                className="gap-1.5 h-8 text-xs border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover"
              >
                <Download size={13} />
                {isExporting ? "导出中..." : "导出脚本包"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 ml-2 text-tx-tertiary hover:text-tx-primary hover:bg-app-hover rounded-lg transition-colors"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Body with Side-by-Side dual column */}
          <div className="flex-1 flex overflow-hidden divide-x divide-app-border">
            {/* Left Column: Script Editor */}
            <div className="flex-1 h-full overflow-hidden">
              <ScriptEditor
                key={refreshKey}
                routeId={currentRoute.id}
                scriptFolder={currentRoute.script.folder}
                onInit={handleScriptInit}
              />
            </div>

            {/* Right Column: Route Debugger / Writing Help */}
            {isScriptInitialized && (
              <div className="w-[380px] h-full shrink-0 overflow-hidden flex flex-col bg-app-surface/10">
                {/* Tabs Header */}
                <div className="flex border-b border-app-border bg-app-surface/30 select-none shrink-0">
                  <button
                    onClick={() => setActiveTab("debug")}
                    className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                      activeTab === "debug"
                        ? "border-accent-primary text-accent-primary bg-app-surface/10"
                        : "border-transparent text-tx-tertiary hover:text-tx-secondary hover:bg-app-hover/30"
                    }`}
                  >
                    <Play size={13} />
                    在线调试
                  </button>
                  <button
                    onClick={() => setActiveTab("help")}
                    className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                      activeTab === "help"
                        ? "border-accent-primary text-accent-primary bg-app-surface/10"
                        : "border-transparent text-tx-tertiary hover:text-tx-secondary hover:bg-app-hover/30"
                    }`}
                  >
                    <BookOpen size={13} />
                    编写说明
                  </button>
                </div>

                {/* Tabs Body */}
                <div className="flex-1 overflow-hidden flex flex-col relative">
                  <div className={activeTab !== "debug" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
                    <RouteDebugDrawer routeId={currentRoute.id} routeParams={currentRoute.params ?? []} />
                  </div>
                  <div className={activeTab !== "help" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
                    <RouteScriptHelp />
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
