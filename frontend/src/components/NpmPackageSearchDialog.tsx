import React, { useState } from "react";
import { X, Search, Loader2, Package, ChevronRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { npmPackageApi } from "@/lib/feed-api";

interface Props {
  onClose: () => void;
  onSelect: (name: string, version: string) => void;
}

export default function NpmPackageSearchDialog({ onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; version: string; description: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<{ name: string; description: string } | null>(null);
  const [versions, setVersions] = useState<string[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const data = await npmPackageApi.search(query.trim());
      setResults(data);
      setSelectedPkg(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPackage = async (pkg: { name: string; description: string }) => {
    setSelectedPkg(pkg);
    setIsLoadingVersions(true);
    try {
      const data = await npmPackageApi.getVersions(pkg.name);
      setVersions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-app-elevated border border-app-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <Search size={16} className="text-accent-primary" />
              </div>
              <h3 className="text-sm font-semibold text-tx-primary">搜索 NPM 软件包</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 rounded-lg">
              <X size={16} />
            </Button>
          </div>

          {/* Search Input */}
          <div className="p-6 border-b border-app-border bg-app-surface/20">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-tertiary" size={14} />
                <input
                  autoFocus
                  type="text"
                  placeholder="输入包名搜索，例如: lodash, cheerio..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl bg-app-bg border border-app-border text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
                />
              </div>
              <Button type="submit" disabled={isSearching} className="px-6 h-10">
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : "搜索"}
              </Button>
            </form>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden divide-x divide-app-border">
            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {results.length === 0 && !isSearching && (
                <div className="flex flex-col items-center justify-center h-40 text-tx-tertiary">
                  <Package size={32} className="mb-2 opacity-20" />
                  <p className="text-xs">等待搜索...</p>
                </div>
              )}
              {results.map((pkg) => (
                <button
                  key={pkg.name}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`w-full flex flex-col items-start p-3 rounded-xl text-left transition-all ${
                    selectedPkg?.name === pkg.name
                      ? "bg-accent-primary/10 border border-accent-primary/20"
                      : "hover:bg-app-hover border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold text-tx-primary">{pkg.name}</span>
                    <ChevronRight size={14} className="text-tx-tertiary" />
                  </div>
                  <p className="text-[10px] text-tx-tertiary line-clamp-1 mt-0.5">{pkg.description}</p>
                </button>
              ))}
            </div>

            {/* Versions List */}
            <div className="w-56 overflow-y-auto bg-app-surface/10 p-2 space-y-1">
              {!selectedPkg ? (
                <div className="flex flex-col items-center justify-center h-full text-tx-tertiary opacity-40">
                  <p className="text-[10px]">选择一个包以查看版本</p>
                </div>
              ) : isLoadingVersions ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={16} className="animate-spin text-accent-primary" />
                </div>
              ) : (
                <>
                  <div className="px-2 py-2 mb-1 border-b border-app-border/50">
                    <span className="text-[10px] font-bold text-tx-tertiary uppercase tracking-wider">选择版本</span>
                  </div>
                  {versions.map((v) => (
                    <button
                      key={v}
                      onClick={() => onSelect(selectedPkg.name, v)}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-tx-secondary hover:text-tx-primary hover:bg-app-hover rounded-lg transition-colors flex items-center justify-between group"
                    >
                      <span>{v}</span>
                      <Plus size={12} className="opacity-0 group-hover:opacity-100 text-accent-primary" />
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
