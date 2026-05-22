import React, { useState, useCallback } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptResult, RouteParam } from "@/types/feed";
import { dynamicRouteApi } from "@/lib/feed-api";
import { DebugResultPanel } from "./RouteDebugResult";

interface Props {
  readonly routeId: number;
  readonly routeParams: readonly RouteParam[];
  readonly routePath: string;
}

function extractPathPlaceholders(path: string): string[] {
  if (!path) return [];
  return path
    .split("/")
    .filter((seg) => seg.startsWith(":"))
    .map((seg) => seg.endsWith("?") ? seg.slice(1, -1) : seg.slice(1));
}

function useParamsState(routeParams: readonly RouteParam[], routePath: string) {
  const [queryValues, setQueryValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    routeParams.forEach((p) => {
      init[p.name] = p.defaultValue ?? "";
    });
    return init;
  });

  const [pathValues, setPathValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    extractPathPlaceholders(routePath).forEach((p) => {
      init[p] = "";
    });
    return init;
  });

  const onQueryChange = useCallback((name: string, value: string) => {
    setQueryValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onPathChange = useCallback((name: string, value: string) => {
    setPathValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  return { queryValues, pathValues, onQueryChange, onPathChange };
}

function useScriptExecution(routeId: number, queryValues: Record<string, string>, pathValues: Record<string, string>) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const onRun = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await dynamicRouteApi.debug(routeId, queryValues, pathValues);
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
  }, [routeId, queryValues, pathValues]);

  const onToggle = useCallback((idx: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  return { isRunning, result, expandedItems, onRun, onToggle };
}

function useRouteDebug(props: Props) {
  const paramState = useParamsState(props.routeParams, props.routePath);
  const execState = useScriptExecution(props.routeId, paramState.queryValues, paramState.pathValues);
  return {
    routeParams: props.routeParams,
    pathPlaceholders: extractPathPlaceholders(props.routePath),
    ...paramState,
    ...execState,
  };
}

interface PathInputFieldProps {
  readonly name: string;
  readonly value: string;
  readonly onChange: (name: string, val: string) => void;
}

function PathInputField({ name, value, onChange }: PathInputFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <label className="font-medium text-tx-secondary flex items-center gap-1 font-mono text-tx-primary">
          <span className="text-accent-danger font-bold">*</span>
          {name}
        </label>
        <span className="text-tx-tertiary text-[10px]">路径参数</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={`占位符 :${name}`}
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary placeholder:text-tx-tertiary/60"
      />
    </div>
  );
}

interface ParamInputProps {
  readonly param: RouteParam;
  readonly value: string;
  readonly onChange: (name: string, val: string) => void;
}

function ParamInputField({ param, value, onChange }: ParamInputProps) {
  const isBool = param.type === "boolean";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <label className="font-medium text-tx-secondary flex items-center gap-1 font-mono text-tx-primary">
          {param.required && <span className="text-accent-danger">*</span>}
          {param.name}
        </label>
        <span className="text-tx-tertiary text-[10px]">
          {isBool ? "布尔值" : param.type === "number" ? "数字" : "字符串"}
        </span>
      </div>
      {isBool ? (
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

interface PathSectionProps {
  readonly placeholders: readonly string[];
  readonly values: Record<string, string>;
  readonly onChange: (name: string, val: string) => void;
}

function PathParamsSection({ placeholders, values, onChange }: PathSectionProps) {
  if (placeholders.length === 0) return null;
  return (
    <div className="space-y-2 pb-2">
      <label className="text-xs font-semibold text-tx-secondary block border-l-2 border-accent-primary pl-1.5">路径参数</label>
      <div className="space-y-2">
        {placeholders.map((name) => (
          <PathInputField
            key={name}
            name={name}
            value={values[name] ?? ""}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

interface QuerySectionProps {
  readonly routeParams: readonly RouteParam[];
  readonly values: Record<string, string>;
  readonly onChange: (name: string, val: string) => void;
}

function QueryParamsSection({ routeParams, values, onChange }: QuerySectionProps) {
  if (routeParams.length === 0) return null;
  return (
    <div className="space-y-2 pt-2 border-t border-app-border/30">
      <label className="text-xs font-semibold text-tx-secondary block border-l-2 border-accent-primary pl-1.5">查询参数</label>
      <div className="space-y-2">
        {routeParams.map((p) => (
          <ParamInputField
            key={p.name}
            param={p}
            value={values[p.name] ?? ""}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

interface ParamsFormProps {
  readonly routeParams: readonly RouteParam[];
  readonly queryValues: Record<string, string>;
  readonly pathPlaceholders: readonly string[];
  readonly pathValues: Record<string, string>;
  readonly isRunning: boolean;
  readonly onQueryChange: (name: string, value: string) => void;
  readonly onPathChange: (name: string, value: string) => void;
  readonly onRun: () => void;
}

function DebugParamsForm({
  routeParams,
  queryValues,
  pathPlaceholders,
  pathValues,
  isRunning,
  onQueryChange,
  onPathChange,
  onRun,
}: ParamsFormProps) {
  const hasParams = pathPlaceholders.length > 0 || routeParams.length > 0;
  return (
    <div className="p-4 border-b border-app-border space-y-3 shrink-0 overflow-y-auto max-h-[360px]">
      <PathParamsSection placeholders={pathPlaceholders} values={pathValues} onChange={onPathChange} />
      <QueryParamsSection routeParams={routeParams} values={queryValues} onChange={onQueryChange} />
      {!hasParams && (
        <div className="py-3 text-center text-xs text-tx-tertiary bg-app-surface/50 rounded-lg border border-app-border/50">
          无需配置参数
        </div>
      )}
      <Button size="sm" onClick={onRun} disabled={isRunning} className="gap-1.5 w-full justify-center mt-3 shrink-0">
        {isRunning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
        {isRunning ? "运行中..." : "执行脚本"}
      </Button>
    </div>
  );
}

interface ResultContainerProps {
  readonly isRunning: boolean;
  readonly result: ScriptResult | null;
  readonly expandedItems: Set<number>;
  readonly onToggle: (idx: number) => void;
}

function DebugResultContainer({ isRunning, result, expandedItems, onToggle }: ResultContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {result ? (
        <DebugResultPanel result={result} expandedItems={expandedItems} onToggleItem={onToggle} />
      ) : !isRunning ? (
        <div className="flex items-center justify-center h-32 text-xs text-tx-tertiary">
          点击"执行脚本"查看输出结果
        </div>
      ) : null}
    </div>
  );
}

export default function RouteDebugDrawer(props: Props) {
  const debugProps = useRouteDebug(props);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DebugParamsForm {...debugProps} />
      <DebugResultContainer
        isRunning={debugProps.isRunning}
        result={debugProps.result}
        expandedItems={debugProps.expandedItems}
        onToggle={debugProps.onToggle}
      />
    </div>
  );
}
