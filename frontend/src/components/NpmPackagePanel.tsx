import React, { useEffect, useState, useCallback } from "react";
import { Package, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { npmPackageApi, NpmPackage } from "@/lib/feed-api";
import { cn } from "@/lib/utils";

import NpmPackageSearchDialog from "./NpmPackageSearchDialog";

export default function NpmPackagePanel() {
  const [packages, setPackages] = useState<NpmPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVersion, setNewVersion] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const loadPackages = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await npmPackageApi.list();
      setPackages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    const hasPending = packages.some(pkg => pkg.status === 'installing' || pkg.status === 'pending');
    if (!hasPending) return;

    const timer = setInterval(() => {
      loadPackages(true); // 使用 silent 模式轮询
    }, 3000);
    return () => clearInterval(timer);
  }, [loadPackages, packages]);

  const handleSelectPackage = (name: string, version: string) => {
    setNewName(name);
    setNewVersion(version);
    setSearchDialogOpen(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await npmPackageApi.add(newName.trim(), newVersion.trim() || undefined);
      setNewName("");
      setNewVersion("");
      await loadPackages();
    } catch (e) {
      alert(e instanceof Error ? e.message : "添加失败");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要卸载包 ${name} 吗？`)) return;
    try {
      await npmPackageApi.delete(name);
      await loadPackages();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <Package size={16} className="text-accent-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-tx-primary">NPM 包管理</h2>
            <p className="text-xs text-tx-tertiary">安装外部包供动态路由脚本使用</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSearchDialogOpen(true)} className="gap-1.5 h-8 text-xs border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover">
            <Search size={13} />
            搜索软件包
          </Button>
          <Button variant="ghost" size="sm" onClick={() => loadPackages()} className="text-tx-secondary hover:text-tx-primary">
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 手动安装 */}
        <div className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-tx-tertiary uppercase tracking-widest">手动安装软件包</h3>
            <span className="text-[10px] text-tx-tertiary italic">提示：可使用上方的搜索功能快速选择</span>
          </div>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="包名 (例如: lodash)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-app-bg border border-app-border text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
              />
            </div>
            <div className="w-32">
              <input
                type="text"
                placeholder="版本 (可选)"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-app-bg border border-app-border text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
              />
            </div>
            <Button type="submit" disabled={isAdding || !newName.trim()} className="h-10 px-6 gap-2">
              {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              安装
            </Button>
          </form>
          <p className="mt-3 text-[10px] text-tx-tertiary">
            提示：安装成功后，可以在动态路由脚本中使用 <code>const pkg = require('{newName || 'package'}')</code> 引用。
          </p>
        </div>

        {/* 包列表 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-tx-tertiary uppercase tracking-widest px-2">已安装的包</h3>
          {error && (
            <div className="px-4 py-3 rounded-xl bg-accent-danger/10 text-accent-danger text-sm border border-accent-danger/20">
              {error}
            </div>
          )}
          
          {isLoading && packages.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 bg-app-surface/30 border border-dashed border-app-border rounded-2xl text-tx-tertiary">
              <Package size={40} className="mb-4 opacity-20" />
              <p className="text-sm">暂未安装任何 NPM 包</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {packages.map((pkg) => (
                  <motion.div
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-app-surface border border-app-border rounded-2xl p-4 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <Package size={16} className="text-tx-secondary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-tx-primary">{pkg.name}</div>
                          <div className="text-[10px] text-tx-tertiary">v{pkg.version}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(pkg.name)}
                        className="p-1.5 rounded-lg text-tx-tertiary hover:text-accent-danger hover:bg-accent-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-app-border/50">
                      <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full",
                        pkg.status === 'installed' ? "text-emerald-500 bg-emerald-500/10" :
                        pkg.status === 'installing' ? "text-blue-500 bg-blue-500/10" :
                        pkg.status === 'error' ? "text-rose-500 bg-rose-500/10" :
                        "text-zinc-500 bg-zinc-500/10"
                      )}>
                        {pkg.status === 'installed' && <CheckCircle2 size={10} />}
                        {pkg.status === 'installing' && <Loader2 size={10} className="animate-spin" />}
                        {pkg.status === 'error' && <AlertCircle size={10} />}
                        {pkg.status === 'pending' && <Clock size={10} />}
                        {pkg.status === 'installed' ? "已安装" :
                         pkg.status === 'installing' ? "正在安装..." :
                         pkg.status === 'error' ? "安装失败" : "等待中"}
                      </div>
                      <div className="text-[10px] text-tx-tertiary">
                        {new Date(pkg.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {pkg.error && (
                      <div className="mt-3 p-2 rounded-lg bg-rose-500/5 text-[10px] text-rose-500 break-all border border-rose-500/10 max-h-20 overflow-y-auto">
                        {pkg.error}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {searchDialogOpen && (
          <NpmPackageSearchDialog 
            onClose={() => setSearchDialogOpen(false)} 
            onSelect={handleSelectPackage} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
