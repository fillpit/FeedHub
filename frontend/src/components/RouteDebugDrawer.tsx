import React, { useState, useCallback } from "react";
import { Play, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptResult, FeedItem } from "@/types/feed";
import { dynamicRouteApi } from "@/lib/feed-api";
import { cn } from "@/lib/utils";

interface Props {
  routeId: number;
}

export default function RouteDebugDrawer({ routeId }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [params, setParams] = useState("{}");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const parsed = JSON.parse(params) as Record<string, string>;
      const res = await dynamicRouteApi.debug(routeId, parsed);
      setResult(res);
    } catch (e) {
      setResult({
        success: false,
        error: e instanceof Error ? e.message : "执行失败",
        executionTime: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [routeId, params]);

  const toggleItem = (idx: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Params */}
      <div className="p-4 border-b border-app-border space-y-2">
        <label className="text-xs font-medium text-tx-secondary">请求参数（JSON 格式）</label>
        <textarea
          value={params}
          onChange={(e) => setParams(e.target.value)}
          rows={3}
          spellCheck={false}
          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-app-border bg-app-bg text-tx-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
        <Button size="sm" onClick={handleRun} disabled={isRunning} className="gap-1.5 w-full justify-center">
          {isRunning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
          {isRunning ? "运行中..." : "执行脚本"}
        </Button>
      </div>

      {/* Result */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {result && (
          <>
            {/* Status */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border",
              result.success
                ? "bg-green-500/5 border-green-500/20 text-green-500"
                : "bg-red-500/5 border-red-500/20 text-red-500"
            )}>
              <div className="flex items-center gap-2">
                {result.success
                  ? <CheckCircle2 size={15} />
                  : <XCircle size={15} />
                }
                <span className="text-xs font-medium">
                  {result.success ? `成功 · ${result.data?.items.length ?? 0} 条` : "执行失败"}
                </span>
              </div>
              <span className="text-[11px] opacity-70">{result.executionTime}ms</span>
            </div>

            {/* Error */}
            {result.error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-mono">
                {result.error}
              </div>
            )}

            {/* Logs */}
            {result.logs && result.logs.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-tx-tertiary uppercase tracking-wider">日志</p>
                <div className="bg-app-bg rounded-lg p-3 space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
                  {result.logs.map((log, i) => (
                    <div key={i} className={cn(
                      "text-tx-secondary",
                      log.level === "error" && "text-red-400",
                      log.level === "warn" && "text-amber-400",
                    )}>
                      [{log.level}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            {result.data?.items && result.data.items.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-tx-tertiary uppercase tracking-wider">
                  返回条目（{result.data.items.length}）
                </p>
                <div className="space-y-2">
                  {result.data.items.slice(0, 20).map((item, i) => (
                    <FeedItemCard
                      key={i}
                      item={item}
                      index={i}
                      expanded={expandedItems.has(i)}
                      onToggle={() => toggleItem(i)}
                    />
                  ))}
                  {result.data.items.length > 20 && (
                    <p className="text-center text-[11px] text-tx-tertiary">
                      还有 {result.data.items.length - 20} 条...
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {!result && !isRunning && (
          <div className="flex items-center justify-center h-32 text-xs text-tx-tertiary">
            点击"执行脚本"查看输出结果
          </div>
        )}
      </div>
    </div>
  );
}

function FeedItemCard({ item, index, expanded, onToggle }: {
  item: FeedItem; index: number; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-app-border bg-app-bg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between p-3 text-left hover:bg-app-hover transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-tx-primary line-clamp-1">{index + 1}. {item.title}</p>
          <p className="text-[11px] text-tx-tertiary truncate">{item.link}</p>
        </div>
        {expanded ? <ChevronUp size={12} className="shrink-0 ml-2 text-tx-tertiary mt-0.5" /> : <ChevronDown size={12} className="shrink-0 ml-2 text-tx-tertiary mt-0.5" />}
      </button>
      {expanded && item.content && (
        <div className="px-3 pb-3 text-xs text-tx-secondary border-t border-app-border pt-2 bg-app-surface/50 line-clamp-4" dangerouslySetInnerHTML={{ __html: item.content }} />
      )}
    </div>
  );
}
