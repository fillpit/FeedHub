import React, { useState, useEffect } from "react";
import { Loader2, Database, Check, RefreshCw, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function IntegrationsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [redisUrl, setRedisUrl] = useState("redis://localhost:6379");
  const [cdpEnabled, setCdpEnabled] = useState(false);
  const [cdpUrl, setCdpUrl] = useState("http://localhost:9222");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  
  const [cdpTestResult, setCdpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cdpTestLoading, setCdpTestLoading] = useState(false);
  
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.getSiteSettings()
      .then((data) => {
        setEnabled(data.redis_enabled === "1");
        setRedisUrl(data.redis_url || "redis://localhost:6379");
        setCdpEnabled(data.cdp_enabled === "1");
        setCdpUrl(data.cdp_url || "http://localhost:9222");
      })
      .catch((err) => {
        console.error("Failed to load settings", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSaveRedis = async (nextEnabled: boolean) => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await api.updateSiteSettings({
        redis_enabled: nextEnabled ? "1" : "0",
        redis_url: redisUrl,
      });
      setEnabled(nextEnabled);
      setSaveMessage({ type: 'success', text: "Redis 配置已保存！" });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: "保存失败: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCdp = async (nextEnabled: boolean) => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await api.updateSiteSettings({
        cdp_enabled: nextEnabled ? "1" : "0",
        cdp_url: cdpUrl,
      });
      setCdpEnabled(nextEnabled);
      setSaveMessage({ type: 'success', text: "CDP 配置已保存！" });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: "保存失败: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestRedis = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.testRedisConnection({ redis_url: redisUrl });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestCdp = async () => {
    setCdpTestLoading(true);
    setCdpTestResult(null);
    try {
      const res = await api.testCdpConnection({ cdp_url: cdpUrl });
      setCdpTestResult(res);
    } catch (err: any) {
      setCdpTestResult({ success: false, message: err.message });
    } finally {
      setCdpTestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center">
        <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
        <span className="text-sm text-tx-tertiary">加载配置中...</span>
      </div>
    );
  }

  return (
    <div className="bg-app-surface rounded-3xl border border-app-border p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
          <Database size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-tx-primary">集成服务</h3>
          <p className="text-xs text-tx-secondary mt-1">配置第三方服务以增强系统功能。</p>
        </div>
      </div>

      {/* Redis 配置卡片 */}
      <div className="p-6 rounded-2xl bg-app-bg border border-app-border space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-sm font-bold text-tx-primary">Redis 缓存支持</span>
            <p className="text-xs text-tx-tertiary leading-relaxed">
              开启后，系统将使用 Redis 缓存网页监控和动态路由的抓取结果，防止频繁请求。
            </p>
          </div>
          <button
            onClick={() => handleSaveRedis(!enabled)}
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

        <div className="space-y-2">
          <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
            Redis 连接地址
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={redisUrl}
              onChange={(e) => setRedisUrl(e.target.value)}
              className="flex-1 px-4 py-3 bg-app-surface border border-app-border rounded-xl text-xs text-tx-primary outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all font-mono"
              placeholder="redis://localhost:6379"
            />
            <button
              onClick={handleTestRedis}
              disabled={testLoading}
              className="px-4 py-3 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-bold text-tx-secondary hover:text-tx-primary transition-all disabled:opacity-50 shadow-sm shrink-0 flex items-center gap-2"
            >
              {testLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              验证连接
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={cn(
              "p-4 rounded-xl text-xs leading-relaxed border transition-all duration-300 animate-in zoom-in-95",
              testResult.success
                ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10"
                : "bg-rose-500/5 text-rose-500 border-rose-500/10"
            )}
          >
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  testResult.success ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                )}
              />
              {testResult.success ? "连接成功" : "连接失败"}
            </div>
            <span className="text-[11px] opacity-90">{testResult.message}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => handleSaveRedis(enabled)}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-accent-primary/20"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            保存配置
          </button>
          {saveMessage && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-left-2",
              saveMessage.type === 'success' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
            )}>
              {saveMessage.type === 'success' ? <Check size={14} /> : <RefreshCw size={14} className="animate-spin" />}
              {saveMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Chrome CDP 配置卡片 */}
      <div className="p-6 rounded-2xl bg-app-bg border border-app-border space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-sm font-bold text-tx-primary">Chrome CDP 支持</span>
            <p className="text-xs text-tx-tertiary leading-relaxed">
              开启后，系统将优先使用 Chrome CDP 进行网页抓取，适用于需要 JavaScript 渲染的页面。
            </p>
          </div>
          <button
            onClick={() => handleSaveCdp(!cdpEnabled)}
            disabled={isSaving}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner",
              cdpEnabled ? "bg-accent-primary" : "bg-app-hover"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out",
                cdpEnabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
            CDP 连接地址
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cdpUrl}
              onChange={(e) => setCdpUrl(e.target.value)}
              className="flex-1 px-4 py-3 bg-app-surface border border-app-border rounded-xl text-xs text-tx-primary outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all font-mono"
              placeholder="http://localhost:9222"
            />
            <button
              onClick={handleTestCdp}
              disabled={cdpTestLoading}
              className="px-4 py-3 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-bold text-tx-secondary hover:text-tx-primary transition-all disabled:opacity-50 shadow-sm shrink-0 flex items-center gap-2"
            >
              {cdpTestLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              验证连接
            </button>
          </div>
        </div>

        {cdpTestResult && (
          <div
            className={cn(
              "p-4 rounded-xl text-xs leading-relaxed border transition-all duration-300 animate-in zoom-in-95",
              cdpTestResult.success
                ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10"
                : "bg-rose-500/5 text-rose-500 border-rose-500/10"
            )}
          >
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  cdpTestResult.success ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                )}
              />
              {cdpTestResult.success ? "连接成功" : "连接失败"}
            </div>
            <span className="text-[11px] opacity-90">{cdpTestResult.message}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => handleSaveCdp(cdpEnabled)}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-accent-primary/20"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            保存配置
          </button>
          {saveMessage && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-left-2",
              saveMessage.type === 'success' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
            )}>
              {saveMessage.type === 'success' ? <Check size={14} /> : <RefreshCw size={14} className="animate-spin" />}
              {saveMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-6 rounded-2xl bg-app-bg/50 border border-app-border border-dashed space-y-3">
        <div className="flex items-start gap-3 text-xs text-tx-tertiary">
          <div className="mt-0.5 shrink-0 opacity-60"><Database size={14} /></div>
          <p>💡 <strong>提示：</strong> 请确保外部服务已启动并可从本系统访问。Redis 默认地址为 <code>redis://localhost:6379</code>，CDP 默认地址为 <code>http://localhost:9222</code>。</p>
        </div>
      </div>
    </div>
  );
}
