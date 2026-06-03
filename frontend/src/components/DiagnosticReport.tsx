import React, { useState } from "react";
import { Terminal, AlertTriangle, Info, Check, X, ChevronUp, ChevronDown, Cpu, Code, FileText, BarChart2 } from "lucide-react";
import { ScrapeDebugInfo, ScrapeItemDebug, ScrapeFieldDebug } from "@/types/feed";
import { cn } from "@/lib/utils";

interface Props {
  debugData: ScrapeDebugInfo;
  parsedCount: number;
  executionTime: number;
}

export default function DiagnosticReport({ debugData, parsedCount, executionTime }: Props) {
  return (
    <div className="space-y-6">
      {/* 1. Dashboard Grid */}
      <DashboardGrid
        debugData={debugData}
        parsedCount={parsedCount}
        executionTime={executionTime}
      />

      {/* 2. Container Diagnostic Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-accent-primary" />
          <h3 className="text-xs font-bold text-tx-primary uppercase tracking-wider">
            匹配容器逐一提取诊断 (前 {debugData.items.length} 个)
          </h3>
        </div>
        {debugData.items.length === 0 ? (
          <EmptyContainerAlert selector={debugData.logs[1] || ""} />
        ) : (
          <div className="space-y-4">
            {debugData.items.map((item, idx) => (
              <ContainerDiagnosticCard key={idx} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* 3. Terminal Style Logs */}
      <DiagnosticLogsLogs logs={debugData.logs} />

      {/* 4. Fetched HTML Source Preview */}
      {debugData.htmlSource && (
        <HtmlSourcePreview html={debugData.htmlSource} />
      )}
    </div>
  );
}

// ─── 子组件: 总览看板 ────────────────────────────────────────────────────────

function DashboardGrid({ debugData, parsedCount, executionTime }: Props) {
  const passRate = debugData.containerCount > 0
    ? Math.round((parsedCount / debugData.containerCount) * 100)
    : 0;

  const stats = [
    { title: "列表容器匹配数", value: debugData.containerCount, icon: Code, color: "text-blue-500", desc: "符合容器选择器的元素个数" },
    { title: "成功提取条目数", value: parsedCount, icon: Check, color: "text-green-500", desc: "解析出有效 Title 且通过的条目" },
    { title: "整体抓取通过率", value: `${passRate}%`, icon: Cpu, color: passRate > 50 ? "text-green-500" : "text-amber-500", desc: "数据有效度与规则匹配率" },
    { title: "抓取及解析耗时", value: `${executionTime} ms`, icon: FileText, color: "text-purple-500", desc: "原始请求和数据诊断分析整体耗时" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="p-4 rounded-xl border border-app-border bg-app-surface/40 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-tx-tertiary uppercase tracking-wider">{stat.title}</span>
              <Icon size={14} className={stat.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-tx-primary tracking-tight">{stat.value}</p>
              <p className="text-[10px] text-tx-tertiary mt-1 leading-normal">{stat.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyContainerAlert({ selector }: { selector: string }) {
  return (
    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex gap-3">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-bold">未匹配到任何容器节点</p>
        <p className="mt-1 opacity-90 leading-relaxed">
          这说明您的 “列表容器选择器” 编写不正确。浏览器中看到的内容可能是通过 JS 动态渲染的（可以切换为“动态渲染”模式重试），或者是选择器语法有误。
        </p>
        {selector && (
          <div className="mt-2 p-2 rounded bg-red-950/20 text-[10px] font-mono border border-red-500/10 truncate max-w-lg">
            诊断上下文: {selector}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 子组件: 容器诊断卡片 ───────────────────────────────────────────────────

function ContainerDiagnosticCard({ item }: { item: ScrapeItemDebug }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  return (
    <div className={cn(
      "rounded-xl border shadow-sm overflow-hidden transition-all",
      item.passed 
        ? "border-app-border bg-app-surface/20" 
        : "border-amber-500/20 bg-amber-500/5"
    )}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-app-hover/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold font-mono text-tx-secondary">#{item.index + 1}</span>
          <span className={cn(
            "px-2 py-0.5 text-[10px] rounded-full font-bold",
            item.passed ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
          )}>
            {item.passed ? "解析通过" : "已跳过"}
          </span>
          {!item.passed && (
            <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
              <AlertTriangle size={12} />
              {item.reason}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} className="text-tx-tertiary" /> : <ChevronDown size={14} className="text-tx-tertiary" />}
      </div>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-app-border/60 bg-app-surface/10 pt-3 space-y-4">
          {/* HTML Snippet View */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-tx-tertiary font-bold flex items-center gap-1">
                <Code size={11} /> 容器 HTML 缩略片段
              </span>
              <button 
                onClick={() => setShowHtml(!showHtml)}
                className="text-[10px] text-accent-primary hover:underline"
              >
                {showHtml ? "隐藏" : "展开显示"}
              </button>
            </div>
            {showHtml && (
              <pre className="p-3 rounded-lg bg-app-bg text-[11px] text-tx-secondary font-mono overflow-x-auto whitespace-pre-wrap border border-app-border leading-relaxed max-h-40 overflow-y-auto">
                {item.containerHtmlSnippet}
              </pre>
            )}
          </div>

          {/* Fields Extraction Table */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-tx-tertiary font-bold flex items-center gap-1">
              <Info size={11} /> 字段提取执行痕迹
            </span>
            <div className="rounded-lg border border-app-border overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-app-surface/60 border-b border-app-border text-tx-secondary font-semibold">
                    <th className="px-3 py-2">字段</th>
                    <th className="px-3 py-2">提取规则与类型</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">提取细节值 (原始 ➜ 最终)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/40">
                  {item.fields.map((f, fIdx) => (
                    <FieldDiagnosticRow key={fIdx} field={f} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldDiagnosticRow({ field }: { field: ScrapeFieldDebug }) {
  const isRequired = field.name === "title";
  const displayMatched = field.matched && field.finalValue;

  return (
    <tr className="hover:bg-app-hover/10 transition-colors">
      <td className="px-3 py-2 font-medium text-tx-primary">
        {field.name} {isRequired && <span className="text-red-400">*</span>}
      </td>
      <td className="px-3 py-2 text-tx-secondary font-mono text-[10px]">
        {field.selector ? (
          <span>{field.selector} <span className="text-tx-tertiary">({field.extractType})</span></span>
        ) : (
          <span className="text-tx-tertiary italic">未配置规则</span>
        )}
      </td>
      <td className="px-3 py-2">
        {displayMatched ? (
          <span className="inline-flex items-center gap-1 text-green-500 font-semibold">
            <Check size={11} /> 成功
          </span>
        ) : (
          <span className={cn(
            "inline-flex items-center gap-1 font-semibold",
            isRequired ? "text-red-500" : "text-tx-tertiary"
          )}>
            <X size={11} /> 缺失
          </span>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-[10px] text-tx-secondary truncate max-w-xs" title={field.finalValue || field.error}>
        {field.matched ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 bg-app-bg rounded border border-app-border text-tx-tertiary" title="原始提取值">
              {field.rawValue || <span className="italic opacity-50">空值</span>}
            </span>
            <span>➜</span>
            <span className="px-1.5 py-0.5 bg-accent-primary/5 rounded border border-accent-primary/10 text-accent-primary" title="正则处理后最终值">
              {field.finalValue || <span className="italic opacity-50">空值</span>}
            </span>
          </div>
        ) : (
          <span className="text-red-400 italic">{field.error || "跳过提取"}</span>
        )}
      </td>
    </tr>
  );
}

// ─── 子组件: 诊断控制台日志 ──────────────────────────────────────────────────

function DiagnosticLogsLogs({ logs }: { logs: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-accent-primary animate-pulse" />
        <h4 className="text-xs font-bold text-tx-primary uppercase tracking-wider">诊断核心调试日志</h4>
      </div>
      <div className="p-4 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 text-[11px] font-mono leading-relaxed space-y-1.5 shadow-inner max-h-60 overflow-y-auto">
        {logs.map((log, idx) => {
          const isError = log.includes("错误") || log.includes("失败");
          const isSuccess = log.includes("成功") || log.includes("通过");
          return (
            <p key={idx} className={cn(
              isError ? "text-red-400 font-semibold" : isSuccess ? "text-green-400" : "text-slate-300"
            )}>
              {log}
            </p>
          );
        })}
      </div>
    </div>
  );
}

// ─── 子组件: 网页原始 HTML 预览 ──────────────────────────────────────────────

function HtmlSourcePreview({ html }: { html: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2 border border-app-border rounded-xl bg-app-surface/20 overflow-hidden">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-app-hover/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code size={14} className="text-accent-primary" />
          <h4 className="text-xs font-bold text-tx-primary uppercase tracking-wider">抓取网页原始 HTML 源码 ({html.length} 字符)</h4>
        </div>
        <div className="flex items-center gap-3">
          {isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="text-[10px] px-2 py-0.5 rounded border border-app-border bg-app-bg text-tx-secondary hover:text-tx-primary hover:bg-app-hover transition-colors"
            >
              {copied ? "已复制" : "复制全部"}
            </button>
          )}
          {isOpen ? <ChevronUp size={14} className="text-tx-tertiary" /> : <ChevronDown size={14} className="text-tx-tertiary" />}
        </div>
      </div>
      {isOpen && (
        <div className="p-4 border-t border-app-border/60 bg-app-bg">
          <pre className="text-[11px] font-mono text-tx-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto p-3 bg-app-surface rounded-lg border border-app-border">
            {html}
          </pre>
        </div>
      )}
    </div>
  );
}
