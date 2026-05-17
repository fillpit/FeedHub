import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface RedisSwitchProps {
  readonly enabled: boolean;
  readonly isSaving: boolean;
  readonly onToggle: () => void;
}

interface RedisInputsProps {
  readonly url: string;
  readonly testLoading: boolean;
  readonly onUrlChange: (val: string) => void;
  readonly onTest: () => void;
}

interface TestResultData {
  readonly success: boolean;
  readonly message: string;
}

interface RedisTestResultProps {
  readonly result: TestResultData | null;
}

interface RedisSaveActionsProps {
  readonly isSaving: boolean;
  readonly saveSuccess: boolean;
  readonly saveError: string | null;
  readonly onSave: () => void;
}

interface RedisConfigProps {
  readonly onStateChange: () => void;
}

/**
 * Switch button row for turning Redis on/off
 */
const RedisSwitch: React.FC<RedisSwitchProps> = ({ enabled, isSaving, onToggle }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-app-bg border border-app-border gap-4 shadow-sm">
    <div className="space-y-0.5">
      <span className="text-xs font-bold text-tx-primary">激活 Redis 缓存支持</span>
      <p className="text-[11px] text-tx-tertiary leading-relaxed">
        开启后，将使用 Redis 缓存网页内容，提高抓取速度并减少对源站的请求。
      </p>
    </div>
    <button
      onClick={onToggle}
      disabled={isSaving}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner",
        enabled ? "bg-accent-primary" : "bg-app-hover"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  </div>
);

/**
 * Input fields for Redis URL
 */
const RedisInputs: React.FC<RedisInputsProps> = ({
  url,
  testLoading,
  onUrlChange,
  onTest,
}) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
      Redis 连接地址
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        className="flex-1 px-4 py-3 bg-app-bg border border-app-border rounded-xl text-xs text-tx-primary outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all font-mono"
        placeholder="redis://localhost:6379"
      />
      <button
        onClick={onTest}
        disabled={testLoading}
        className="px-4 py-3 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-bold text-tx-secondary hover:text-tx-primary transition-all disabled:opacity-50 shadow-sm shrink-0"
      >
        {testLoading ? "连接中..." : "测试连接"}
      </button>
    </div>
  </div>
);

/**
 * Connection diagnostics status view for Redis
 */
const RedisTestResult: React.FC<RedisTestResultProps> = ({ result }) => {
  if (!result) return null;
  return (
    <div
      className={cn(
        "p-4 rounded-xl text-xs leading-relaxed border transition-all duration-300 animate-in zoom-in-95",
        result.success
          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10"
          : "bg-rose-500/5 text-rose-500 border-rose-500/10"
      )}
    >
      <div className="font-bold flex items-center gap-1.5 mb-1">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            result.success ? "bg-emerald-500" : "bg-rose-500"
          )}
        />
        {result.success ? "Redis 连接成功" : "Redis 连接失败"}
      </div>
      <span className="text-[11px] opacity-90">{result.message}</span>
    </div>
  );
};

/**
 * Core save controls for Redis settings
 */
const RedisSaveActions: React.FC<RedisSaveActionsProps> = ({ isSaving, saveSuccess, saveError, onSave }) => (
  <div className="flex items-center gap-3 pt-1">
    <button
      onClick={onSave}
      disabled={isSaving}
      className="px-6 py-2.5 bg-accent-primary hover:bg-accent-primary/95 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-accent-primary/10"
    >
      {isSaving ? "保存中..." : "保存配置"}
    </button>
    {saveSuccess && (
      <span className="text-xs text-emerald-500 font-bold animate-pulse">
        配置已保存！
      </span>
    )}
    {saveError && (
      <span className="text-xs text-rose-500 font-bold">
        保存失败: {saveError}
      </span>
    )}
  </div>
);

/**
 * Redis Config Panel
 */
export const RedisConfig: React.FC<RedisConfigProps> = ({ onStateChange }) => {
  const [enabled, setEnabled] = useState(false);
  const [redisUrl, setRedisUrl] = useState("redis://localhost:6379");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResultData | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.getSiteSettings()
      .then((data) => {
        setEnabled(data.redis_enabled === "1");
        setRedisUrl(data.redis_url || "redis://localhost:6379");
      })
      .catch((err) => {
        console.error("Failed to load redis settings", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (nextEnabled: boolean) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await api.updateSiteSettings({
        redis_enabled: nextEnabled ? "1" : "0",
        redis_url: redisUrl,
      });
      setEnabled(nextEnabled);
      setSaveSuccess(true);
      onStateChange();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.testRedisConnection({
        redis_url: redisUrl,
      });
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : "测试失败" });
    } finally {
      setTestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
        <span className="text-xs text-tx-tertiary">加载配置中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <RedisSwitch enabled={enabled} isSaving={isSaving} onToggle={() => handleSave(!enabled)} />
      <RedisInputs
        url={redisUrl}
        testLoading={testLoading}
        onUrlChange={setRedisUrl}
        onTest={handleTest}
      />
      <RedisTestResult result={testResult} />
      <RedisSaveActions isSaving={isSaving} saveSuccess={saveSuccess} saveError={saveError} onSave={() => handleSave(enabled)} />
    </div>
  );
};
