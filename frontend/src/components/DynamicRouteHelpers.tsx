import React from "react";
import { Rss, Trash2, Edit2, Copy, Check, Code, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DynamicRoute } from "@/types/feed";

interface RouteCardProps {
  route: DynamicRoute;
  isCopied: boolean;
  isExportMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onEditConfig: (route: DynamicRoute) => void;
  onEditScript: (route: DynamicRoute) => void;
  onDelete: (id: number) => void;
  onCopyUrl: (route: DynamicRoute) => void;
}

export function RouteCard({
  route, isCopied, isExportMode, isSelected, onToggleSelect,
  onEditConfig, onEditScript, onDelete, onCopyUrl
}: RouteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        "group p-4 rounded-xl border transition-all flex items-start gap-3",
        isSelected ? "border-accent-primary bg-accent-primary/5" : "border-app-border bg-app-surface hover:border-accent-primary/30 hover:shadow-sm"
      )}
    >
      {isExportMode && (
        <input
          type="checkbox"
          checked={!!isSelected}
          onChange={() => onToggleSelect?.(route.id)}
          className="mt-1 w-4 h-4 rounded border-app-border text-accent-primary focus:ring-accent-primary cursor-pointer shrink-0"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 min-w-0">
          <span className="text-sm font-semibold text-tx-primary truncate">{route.name}</span>
          <Badge variant="secondary" className="text-xs shrink-0">{route.method}</Badge>
          <StatusBadge status={route.lastRunStatus} />
        </div>
        <p className="text-xs text-tx-tertiary font-mono truncate">{route.path}</p>
        {route.description && (
          <p className="text-xs text-tx-secondary mt-1 line-clamp-1">{route.description}</p>
        )}
        {route.params && route.params.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {route.params.map((param, index) => (
              <Badge key={index} variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-tx-tertiary border-app-border bg-app-surface/50">
                {param.name}
                {param.required && <span className="text-accent-danger ml-0.5">*</span>}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-tx-tertiary">刷新间隔: {route.refreshInterval}min</span>
          <span className="text-[11px] text-tx-tertiary">最后抓取时间: {route.lastRunAt ? new Date(route.lastRunAt).toLocaleString() : "暂无"}</span>
          <span className="text-[11px] text-tx-tertiary">最后抓取状态: {route.lastRunStatus ? (route.lastRunStatus === "success" ? "成功" : "失败") : "暂无"}</span>
        </div>
      </div>

      {!isExportMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-tx-primary" onClick={() => onCopyUrl(route)} title="复制 Feed URL">
            {isCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-tx-primary" onClick={() => onEditScript(route)} title="编辑脚本">
            <Code size={13} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-accent-primary" onClick={() => onEditConfig(route)} title="编辑配置">
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-accent-danger" onClick={() => onDelete(route.id)} title="删除路由">
            <Trash2 size={13} />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
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

export function EmptyState({ onNew }: { onNew: () => void }) {
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
