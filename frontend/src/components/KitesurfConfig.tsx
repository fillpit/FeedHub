import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface KitesurfSwitchProps {
  readonly enabled: boolean;
  readonly isSaving: boolean;
  readonly onToggle: () => void;
}

interface KitesurfInputsProps {
  readonly url: string;
  readonly token: string;
  readonly testLoading: boolean;
  readonly onUrlChange: (val: string) => void;
  readonly onTokenChange: (val: string) => void;
  readonly onTest: () => void;
}

interface TestResultData {
  readonly success: boolean;
  readonly message: string;
}

interface KitesurfTestResultProps {
  readonly result: TestResultData | null;
}

interface KitesurfSaveActionsProps {
  readonly isSaving: boolean;
  readonly saveSuccess: boolean;
  readonly saveError: string | null;
  readonly onSave: () => void;
}

interface KitesurfConfigProps {
  readonly onStateChange: () => void;
}

/**
 * Switch button row for turning Kitesurf on/off
 */
const KitesurfSwitch: React.FC<KitesurfSwitchProps> = ({ enabled, isSaving, onToggle }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-app-bg border border-app-border gap-4 shadow-sm">
    <div className="space-y-0.5">
      <span className="text-xs font-bold text-tx-primary">激活 Cloudflare Kitesurf (Browser Run) 渲染引擎</span>
      <p className="text-[11px] text-tx-tertiary leading-relaxed">
        开启后，将通过运行在 Cloudflare Workers 上的无状态、高度可扩展 Web 浏览器快速渲染并提取网页。
      </p>
    </div>
    <button
      onClick={onToggle}
      disabled={isSaving}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner",
        enabled ? "bg-sky-500" : "bg-app-hover"
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
 * Input fields for Kitesurf WebSocket CDP Endpoint and API Token
 */
const KitesurfInputs: React.FC<KitesurfInputsProps> = ({
  url,
  token,
  testLoading,
  onUrlChange,
  onTokenChange,
  onTest,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
        Kitesurf CDP WebSocket Endpoint
      </label>
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-xs text-tx-primary outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
        placeholder="wss://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/browser-rendering/devtools/browser"
      />
    </div>

    <div className="space-y-2">
      <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
        Cloudflare API Token (Bearer)
      </label>
      <div className="flex gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          className="flex-1 px-4 py-3 bg-app-bg border border-app-border rounded-xl text-xs text-tx-primary outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
          placeholder="cfat_..."
        />
        <button
          onClick={onTest}
          disabled={testLoading}
          className="px-4 py-3 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-bold text-tx-secondary hover:text-tx-primary transition-all disabled:opacity-50 shadow-sm shrink-0"
        >
          {testLoading ? "握手中..." : "物理连接测试"}
        </button>
      </div>
    </div>
  </div>
);

/**
 * Diagnostics status view for Kitesurf
 */
const KitesurfTestResult: React.FC<KitesurfTestResultProps> = ({ result }) => {
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
        {result.success ? "Kitesurf 握手成功" : "Kitesurf 握手失败"}
      </div>
      <span className="text-[11px] opacity-90">{result.message}</span>
    </div>
  );
};

/**
 * Save actions for Kitesurf settings
 */
const KitesurfSaveActions: React.FC<KitesurfSaveActionsProps> = ({ isSaving, saveSuccess, saveError, onSave }) => (
  <div className="flex items-center gap-3 pt-1">
    <button
      onClick={onSave}
      disabled={isSaving}
      className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-sky-500/10"
    >
      {isSaving ? "热更中..." : "保存 Kitesurf 配置"}
    </button>
    {saveSuccess && (
      <span className="text-xs text-emerald-500 font-bold animate-pulse">
        Kitesurf 端点配置已保存！
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
 * Cloudflare Kitesurf Config Component
 */
export const KitesurfConfig: React.FC<KitesurfConfigProps> = ({ onStateChange }) => {
  const [enabled, setEnabled] = useState(false);
  const [kitesurfUrl, setKitesurfUrl] = useState("");
  const [kitesurfToken, setKitesurfToken] = useState("");
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
        setEnabled(data.kitesurf_enabled === "1");
        setKitesurfUrl(data.kitesurf_url || "");
        setKitesurfToken(data.kitesurf_token || "");
      })
      .catch((err) => {
        console.error("Failed to load kitesurf settings", err);
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
        kitesurf_enabled: nextEnabled ? "1" : "0",
        kitesurf_url: kitesurfUrl,
        kitesurf_token: kitesurfToken,
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
      const res = await api.testKitesurfConnection({
        kitesurf_url: kitesurfUrl,
        kitesurf_token: kitesurfToken,
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
        <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
        <span className="text-xs text-tx-tertiary">同步远程配置中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <KitesurfSwitch enabled={enabled} isSaving={isSaving} onToggle={() => handleSave(!enabled)} />
      <KitesurfInputs
        url={kitesurfUrl}
        token={kitesurfToken}
        testLoading={testLoading}
        onUrlChange={setKitesurfUrl}
        onTokenChange={setKitesurfToken}
        onTest={handleTest}
      />
      <KitesurfTestResult result={testResult} />
      <KitesurfSaveActions isSaving={isSaving} saveSuccess={saveSuccess} saveError={saveError} onSave={() => handleSave(enabled)} />
    </div>
  );
};
