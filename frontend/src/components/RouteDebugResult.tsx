import React, { useState, useCallback } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ScriptResult, FeedItem } from "@/types/feed";
import { cn, copyToClipboard } from "@/lib/utils";

interface ResultPanelProps {
  readonly result: ScriptResult;
  readonly expandedItems: Set<number>;
  readonly onToggleItem: (idx: number) => void;
}

export function DebugResultPanel({ result, expandedItems, onToggleItem }: ResultPanelProps) {
  return (
    <>
      <DebugStatusHeader result={result} />
      {result.error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto max-w-full">
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

function DebugStatusHeader({ result }: { readonly result: ScriptResult }) {
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

interface LogItem {
  readonly level: string;
  readonly message: string;
}

interface LogButtonProps {
  readonly log: LogItem;
  readonly index: number;
  readonly isCopied: boolean;
  readonly onCopy: (text: string, idx: number) => void;
}

function LogButton({ log, index, isCopied, onCopy }: LogButtonProps) {
  const isErr = log.level === "error";
  const isWarn = log.level === "warn";
  const isSuccess = log.message.includes("SUCCESS") || log.message.includes("成功");
  const isFlow = log.message.includes("[流程日志]");

  return (
    <button
      onClick={() => onCopy(log.message, index)}
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
}

function DebugLogsPanel({ logs }: { readonly logs: readonly LogItem[] }) {
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
        {logs.map((log, i) => (
          <LogButton
            key={i}
            log={log}
            index={i}
            isCopied={copiedIndex === i}
            onCopy={handleCopy}
          />
        ))}
      </div>
    </div>
  );
}

function DebugItemsList({ items, expandedItems, onToggleItem }: { readonly items: readonly FeedItem[]; readonly expandedItems: Set<number>; readonly onToggleItem: (idx: number) => void }) {
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
  readonly item: FeedItem; readonly index: number; readonly expanded: boolean; readonly onToggle: () => void;
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
