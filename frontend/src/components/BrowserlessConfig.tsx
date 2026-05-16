import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface BrowserlessSwitchProps {
  readonly enabled: boolean;
  readonly isSaving: boolean;
  readonly onToggle: () => void;
}

interface BrowserlessInputsProps {
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

interface BrowserlessTestResultProps {
  readonly result: TestResultData | null;
}

interface BrowserlessSaveActionsProps {
  readonly isSaving: boolean;
  readonly saveSuccess: boolean;
  readonly saveError: string | null;
  readonly onSave: () => void;
}

interface BrowserlessConfigProps {
  readonly onStateChange: () => void;
}

/**
 * Switch button row for turning Browserless on/off
 */
const BrowserlessSwitch: React.FC<BrowserlessSwitchProps> = ({ enabled, isSaving, onToggle }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-app-bg border border-app-border gap-4 shadow-sm">
    <div className="space-y-0.5">
      <span className="text-xs font-bold text-tx-primary">激活云端 Browserless 渲染代理</span>
      <p className="text-[11px] text-tx-tertiary leading-relaxed">
        开启后，将通过高效的分布式无头 Chrome 容器快速提取现代单页应用的渲染后数据。
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
 * Input fields for endpoint URL and optional authorization security token
 */
const BrowserlessInputs: React.FC<BrowserlessInputsProps> = ({
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
        Browserless 物理端点
      </label>
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-xs text-tx-primary outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all font-mono"
        placeholder="http://localhost:3000"
      />
    </div>

    <div className="space-y-2">
      <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
        专属安全授权 Token
      </label>
      <div className="flex gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          className="flex-1 px-4 py-3 bg-app-bg border border-app-border rounded-xl text-xs text-tx-primary outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all font-mono"
          placeholder="如容器服务未配置 TOKEN 锁，请留空"
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
 * Connection diagnostics status view for Browserless
 */
const BrowserlessTestResult: React.FC<BrowserlessTestResultProps> = ({ result }) => {
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
        {result.success ? "Browserless 握手成功" : "Browserless 握手失败"}
      </div>
      <span className="text-[11px] opacity-90">{result.message}</span>
    </div>
  );
};

/**
 * Core save controls for Browserless server settings
 */
const BrowserlessSaveActions: React.FC<BrowserlessSaveActionsProps> = ({ isSaving, saveSuccess, saveError, onSave }) => (
  <div className="flex items-center gap-3 pt-1">
    <button
      onClick={onSave}
      disabled={isSaving}
      className="px-6 py-2.5 bg-accent-primary hover:bg-accent-primary/95 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-accent-primary/10"
    >
      {isSaving ? "热更中..." : "保存微服务配置"}
    </button>
    {saveSuccess && (
      <span className="text-xs text-emerald-500 font-bold animate-pulse">
        端点配置已热更新！
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
 * Browserless Config Panel
 */
export const BrowserlessConfig: React.FC<BrowserlessConfigProps> = ({ onStateChange }) => {
  const [enabled, setEnabled] = useState(false);
  const [browserlessUrl, setBrowserlessUrl] = useState("http://localhost:3000");
  const [browserlessToken, setBrowserlessToken] = useState("");
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
        setEnabled(data.browserless_fetching_enabled === "1");
        setBrowserlessUrl(data.browserless_url || "http://localhost:3000");
        setBrowserlessToken(data.browserless_token || "");
      })
      .catch((err) => {
        console.error("Failed to load browserless settings", err);
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
        browserless_fetching_enabled: nextEnabled ? "1" : "0",
        browserless_url: browserlessUrl,
        browserless_token: browserlessToken,
      });
      setEnabled(nextEnabled);
      setSaveSuccess(true);
      onStateChange();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.testBrowserlessConnection({
        browserless_url: browserlessUrl,
        browserless_token: browserlessToken,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
        <span className="text-xs text-tx-tertiary">同步远程配置中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BrowserlessSwitch enabled={enabled} isSaving={isSaving} onToggle={() => handleSave(!enabled)} />
      <BrowserlessInputs
        url={browserlessUrl}
        token={browserlessToken}
        testLoading={testLoading}
        onUrlChange={setBrowserlessUrl}
        onTokenChange={setBrowserlessToken}
        onTest={handleTest}
      />
      <BrowserlessTestResult result={testResult} />
      <BrowserlessSaveActions isSaving={isSaving} saveSuccess={saveSuccess} saveError={saveError} onSave={() => handleSave(enabled)} />
    </div>
  );
};
