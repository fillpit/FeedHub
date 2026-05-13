import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, Trash2, Send, KeyRound, BellRing, Chrome, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { feedSettingsApi } from "@/lib/feed-api";
import { cn } from "@/lib/utils";

export default function FeedSettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [testingType, setTestingType] = useState<"bark" | "feishu" | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    feedSettingsApi.get()
      .then(setSettings)
      .catch((err) => showMsg(err.message, "error"))
      .finally(() => setIsLoading(false));
  }, []);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpdate = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await feedSettingsApi.save(settings);
      showMsg("保存设置成功");
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm("确认清除所有的缓存网页和动态 Feed 缓存？这将迫使下次获取时重新抓取。")) return;
    setIsClearingCache(true);
    try {
      await feedSettingsApi.clearCache();
      showMsg("已成功清空所有缓存！");
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "清空缓存出错", "error");
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleTestPush = async (type: "bark" | "feishu") => {
    setTestingType(type);
    try {
      const res = await feedSettingsApi.testPush(type, settings);
      if (res.success) {
        showMsg("测试推送已发出，请在对应的客户端查看是否收到！");
      } else {
        showMsg(`推送失败: ${res.error}`, "error");
      }
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "推送连通性出错", "error");
    } finally {
      setTestingType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app-bg">
        <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <Settings size={16} className="text-accent-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-tx-primary">全局设置</h2>
            <p className="text-xs text-tx-tertiary">配置 FeedHub 全局抓取、缓存及通知消息推送通道</p>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 min-w-20">
          {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          保存设置
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "px-4 py-3 rounded-xl text-xs border font-medium",
              message.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-500"
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}
          >
            {message.text}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Request & Cache Settings */}
          <div className="p-5 rounded-2xl border border-app-border bg-app-surface/40 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-app-border">
              <Chrome size={15} className="text-accent-primary" />
              <h3 className="text-xs font-semibold text-tx-primary">全局抓取与缓存</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-tx-secondary">
                全局默认缓存失效时间 (秒)
              </label>
              <input
                type="number"
                value={settings.feed_cache_ttl ?? "3600"}
                onChange={(e) => handleUpdate("feed_cache_ttl", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <p className="text-[10px] text-tx-tertiary">
                用于网页抓取及动态 Feed 抓取的默认缓存时间，避免高频度向源站发送并发抓取。
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-tx-secondary">
                全局网络抓取 User-Agent (浏览器伪装)
              </label>
              <textarea
                value={settings.feed_user_agent ?? ""}
                onChange={(e) => handleUpdate("feed_user_agent", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary resize-none font-mono focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <p className="text-[10px] text-tx-tertiary">
                请求第三方站点时使用的浏览器请求标头，留空使用内置默认标识。
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={isClearingCache}
                className="w-full border-red-500/20 hover:bg-red-500/10 text-red-500 gap-1.5"
              >
                {isClearingCache ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                清空全局缓存 (Clear Feed Caches)
              </Button>
            </div>
          </div>

          {/* Card 2: Notifications Integration */}
          <div className="p-5 rounded-2xl border border-app-border bg-app-surface/40 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-app-border">
              <BellRing size={15} className="text-accent-primary animate-pulse" />
              <h3 className="text-xs font-semibold text-tx-primary">通知消息接收配置</h3>
            </div>

            {/* Bark Notification */}
            <div className="space-y-3 p-3.5 rounded-xl border border-app-border/60 bg-app-bg/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-tx-primary">Bark 苹果消息通知</span>
                <input
                  type="checkbox"
                  checked={settings.feed_bark_enabled === "true"}
                  onChange={(e) => handleUpdate("feed_bark_enabled", e.target.checked ? "true" : "false")}
                  className="rounded border-app-border text-accent-primary focus:ring-0"
                />
              </div>
              {settings.feed_bark_enabled === "true" && (
                <div className="space-y-2 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-tx-tertiary">Bark 接口地址 (Server URL / Key)</span>
                    <input
                      value={settings.feed_bark_url ?? ""}
                      onChange={(e) => handleUpdate("feed_bark_url", e.target.value)}
                      placeholder="https://api.day.app/your-device-key"
                      className="w-full px-2 py-1.5 text-xs rounded border border-app-border bg-app-bg font-mono focus:outline-none"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={testingType === "bark"}
                    onClick={() => handleTestPush("bark")}
                    className="w-full text-accent-primary hover:bg-accent-primary/5 text-xs gap-1"
                  >
                    {testingType === "bark" ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                    发送 Bark 测试消息
                  </Button>
                </div>
              )}
            </div>

            {/* Feishu Robot Notification */}
            <div className="space-y-3 p-3.5 rounded-xl border border-app-border/60 bg-app-bg/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-tx-primary">飞书群机器人 (Webhook)</span>
                <input
                  type="checkbox"
                  checked={settings.feed_feishu_enabled === "true"}
                  onChange={(e) => handleUpdate("feed_feishu_enabled", e.target.checked ? "true" : "false")}
                  className="rounded border-app-border text-accent-primary focus:ring-0"
                />
              </div>
              {settings.feed_feishu_enabled === "true" && (
                <div className="space-y-2 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-tx-tertiary">飞书 Webhook 完整地址</span>
                    <input
                      value={settings.feed_feishu_webhook ?? ""}
                      onChange={(e) => handleUpdate("feed_feishu_webhook", e.target.value)}
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      className="w-full px-2 py-1.5 text-xs rounded border border-app-border bg-app-bg font-mono focus:outline-none"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={testingType === "feishu"}
                    onClick={() => handleTestPush("feishu")}
                    className="w-full text-accent-primary hover:bg-accent-primary/5 text-xs gap-1"
                  >
                    {testingType === "feishu" ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                    发送飞书测试消息
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
