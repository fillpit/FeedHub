import React from "react";
import { Package, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { NpmPackage } from "@/lib/feed-api";
import { cn } from "@/lib/utils";

interface NpmPackageCardProps {
  readonly pkg: NpmPackage;
  readonly isRetrying: boolean;
  readonly onDelete: (name: string) => Promise<void>;
  readonly onRetry: (name: string) => Promise<void>;
}

export default function NpmPackageCard({
  pkg,
  isRetrying,
  onDelete,
  onRetry,
}: NpmPackageCardProps) {
  const handleDeleteClick = () => {
    onDelete(pkg.name);
  };

  const handleRetryClick = () => {
    onRetry(pkg.name);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-app-surface border border-app-border rounded-2xl p-4 hover:shadow-md transition-all group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Package size={16} className="text-tx-secondary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-tx-primary break-all">{pkg.name}</div>
              <div className="text-[10px] text-tx-tertiary">v{pkg.version}</div>
            </div>
          </div>
          <button
            onClick={handleDeleteClick}
            type="button"
            className="p-1.5 rounded-lg text-tx-tertiary hover:text-accent-danger hover:bg-accent-danger/10 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
            title={`卸载 ${pkg.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {pkg.error && (
          <div className="mt-3 p-2 rounded-lg bg-rose-500/5 text-[10px] text-rose-500 break-all border border-rose-500/10 max-h-20 overflow-y-auto font-mono leading-relaxed">
            {pkg.error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-app-border/50">
        <div className="flex items-center gap-2">
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

          {pkg.status === 'error' && (
            <button
              onClick={handleRetryClick}
              disabled={isRetrying}
              type="button"
              className={cn(
                "h-5 px-2 text-[10px] gap-1 text-accent-primary hover:text-tx-inverse hover:bg-accent-primary border border-accent-primary/20 bg-transparent font-medium inline-flex items-center justify-center whitespace-nowrap rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary disabled:pointer-events-none disabled:opacity-50 transition-all active:scale-95",
                isRetrying && "cursor-not-allowed"
              )}
            >
              {isRetrying ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <RefreshCw size={10} className="transition-transform group-hover:rotate-180 duration-500" />
              )}
              重试
            </button>
          )}
        </div>
        
        <div className="text-[10px] text-tx-tertiary font-medium">
          {new Date(pkg.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </motion.div>
  );
}
