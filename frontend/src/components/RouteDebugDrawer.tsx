import React, { useState, useEffect, useCallback } from "react";
import { Play, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptResult, FeedItem, RouteParam } from "@/types/feed";
import { dynamicRouteApi } from "@/lib/feed-api";
import { cn, copyToClipboard } from "@/lib/utils";

interface Props {
  routeId: number;
  routeParams: RouteParam[];
}

export default function RouteDebugDrawer({ routeId, routeParams }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    routeParams.forEach((p) => {
      init[p.name] = p.defaultValue ?? "";
    });
    return init;
  });

  useEffect(() => {
    setParamValues((prev) => {
      const next = { ...prev };
      let changed = false;
      routeParams.forEach((p) => {
        if (!(p.name in next)) {
          next[p.name] = p.defaultValue ?? "";
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [routeParams]);

  const handleParamChange = useCallback((name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await dynamicRouteApi.debug(routeId, paramValues);
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
  }, [routeId, paramValues]);

  const toggleItem = useCallback((idx: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DebugParamsForm
        routeParams={routeParams}
        paramValues={paramValues}
        isRunning={isRunning}
        onParamChange={handleParamChange}
        onRun={handleRun}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {result ? (
          <DebugResultPanel result={result} expandedItems={expandedItems} onToggleItem={toggleItem} />
        ) : !isRunning ? (
          <div className="flex items-center justify-center h-32 text-xs text-tx-tertiary">
            点击"执行脚本"查看输出结果
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ParamsFormProps {
  routeParams: RouteParam[];
  paramValues: Record<string, string>;
  isRunning: boolean;
  onParamChange: (name: string, value: string) => void;
  onRun: () => void;
}

function DebugParamsForm({ routeParams, paramValues, isRunning, onParamChange, onRun }: ParamsFormProps) {
  return (
    <div className="p-4 border-b border-app-border space-y-3 shrink-0">
      <label className="text-xs font-medium text-tx-secondary">请求参数配置</label>
      {routeParams.length === 0 ? (
        <div className="py-3 text-center text-xs text-tx-tertiary bg-app-surface/50 rounded-lg border border-app-border/50">
          当前路由未配置请求参数
        </div>
      ) : (
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {routeParams.map((p) => (
            <ParamInputField key={p.name} param={p} value={paramValues[p.name] ?? ""} onChange={onParamChange} />
          ))}
        </div>
      )}
      <Button size="sm" onClick={onRun} disabled={isRunning} className="gap-1.5 w-full justify-center">
        {isRunning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
        {isRunning ? "运行中..." : "执行脚本"}
      </Button>
    </div>
  );
}

function ParamInputField({ param, value, onChange }: { param: RouteParam; value: string; onChange: (name: string, val: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <label className="font-medium text-tx-secondary flex items-center gap-1">
          {param.required && <span className="text-accent-danger font-bold">*</span>}
          <span className="font-mono text-tx-primary">{param.name}</span>
        </label>
        <span className="text-tx-tertiary text-[10px]">
          {param.type === "number" ? "数字" : param.type === "boolean" ? "布尔值" : "字符串"}
        </span>
      </div>
      {param.type === "boolean" ? (
        <select
          value={value || (param.defaultValue ?? "false")}
          onChange={(e) => onChange(param.name, e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          type={param.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(param.name, e.target.value)}
          placeholder={param.description ?? `输入 ${param.name}`}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary placeholder:text-tx-tertiary/60"
        />
      )}
    </div>
  );
}

function DebugResultPanel({ result, expandedItems, onToggleItem }: { result: ScriptResult; expandedItems: Set<number>; onToggleItem: (idx: number) => void }) {
  return (
    <>
      <DebugStatusHeader result={result} />
      {result.error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-mono">
          {result.error}
        </div>
      )}
      {result.logs && result.logs.length > 0 && (
        <DebugLogsPanel logs={result.logs} />
      )}
      {result.data?.items && result.data.items.length > 0 && (
        <DebugItemsList items={result.data.items} expandedItems={expandedItems} onToggleItem={onToggleItem} />
      )}
    </>
  );
}

function DebugStatusHeader({ result }: { result: ScriptResult }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl border",
      result.success
        ? "bg-green-500/5 border-green-500/20 text-green-500"
        : "bg-red-500/5 border-red-500/20 text-red-500"
    )}>
      <div className="flex items-center gap-2">
        {result.success ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
        <span className="text-xs font-medium">
          {result.success ? `成功 · ${result.data?.items.length ?? 0} 条` : "执行失败"}
        </span>
      </div>
      <span className="text-[11px] opacity-70">{result.executionTime}ms</span>
    </div>
  );
}

function DebugLogsPanel({ logs }: { logs: Array<{ level: string; message: string }> }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback((text: string, idx: number) => {
    copyToClipboard(text).then((success) => {
      if (success) {
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
    });
  }, []);

  return (
    <div className="space-y-1.5 shrink-0 overflow-hidden">
      <p className="text-[11px] font-medium text-tx-tertiary uppercase tracking-wider">日志（点击单行可复制）</p>
      <div className="bg-app-bg rounded-lg p-3 space-y-2 font-mono text-[11px] max-h-56 overflow-y-auto overflow-x-auto flex flex-col items-start">
        {logs.map((log, i) => {
          const isErr = log.level === "error";
          const isWarn = log.level === "warn";
          const isSuccess = log.message.includes("SUCCESS") || log.message.includes("成功");
          const isFlow = log.message.includes("[流程日志]");
          const isCopied = copiedIndex === i;

          return (
            <button
              key={i}
              onClick={() => handleCopy(log.message, i)}
              title="点击复制到剪贴板"
              className={cn(
                "whitespace-nowrap px-2.5 py-1.5 rounded border transition-all flex items-center justify-between gap-4 hover:brightness-110 active:scale-[0.99] cursor-pointer text-left max-w-none",
                isErr ? "text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20" :
                isWarn ? "text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" :
                isSuccess ? "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                isFlow ? "text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" :
                "text-tx-secondary bg-app-surface/50 border-app-border/60"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold shrink-0 opacity-80">[{log.level.toUpperCase()}]</span>
                <span>{log.message}</span>
              </div>
              {isCopied && (
                <span className="text-[10px] text-emerald-500 font-bold shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded animate-pulse border border-emerald-500/20">
                  已复制
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DebugItemsList({ items, expandedItems, onToggleItem }: { items: FeedItem[]; expandedItems: Set<number>; onToggleItem: (idx: number) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-tx-tertiary uppercase tracking-wider">
        返回条目（{items.length}）
      </p>
      <div className="space-y-2">
        {items.slice(0, 20).map((item, i) => (
          <FeedItemCard
            key={i}
            item={item}
            index={i}
            expanded={expandedItems.has(i)}
            onToggle={() => onToggleItem(i)}
          />
        ))}
        {items.length > 20 && (
          <p className="text-center text-[11px] text-tx-tertiary">
            还有 {items.length - 20} 条...
          </p>
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
