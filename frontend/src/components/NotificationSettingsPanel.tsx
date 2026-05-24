import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Bell, Loader2, CheckCircle2, AlertCircle, Send, Save } from "lucide-react";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { cn } from "@/lib/utils";

/**
 * Premium glassmorphic settings panel for notification channels and subscribed events.
 */
export default function NotificationSettingsPanel() {
  const { t } = useTranslation();
  const {
    settings,
    isLoading,
    error,
    success,
    testStatus,
    updateField,
    handleSave,
    handleTest,
  } = useNotificationSettings();

  const handleToggle = (key: keyof typeof settings) => {
    updateField(key, settings[key] === "true" ? "false" : "true");
  };

  const CHANNELS = [
    {
      id: "bark" as const,
      name: t("settings.barkChannel"),
      enabledKey: "feed_bark_enabled" as const,
      urlKey: "feed_bark_url" as const,
      placeholder: t("settings.barkUrlPlaceholder"),
    },
    {
      id: "feishu" as const,
      name: t("settings.feishuChannel"),
      enabledKey: "feed_feishu_enabled" as const,
      urlKey: "feed_feishu_webhook" as const,
      placeholder: t("settings.feishuWebhookPlaceholder"),
    },
  ];

  const EVENTS = [
    {
      key: "feed_notify_website_failure" as const,
      title: t("settings.websiteFailureLabel"),
      description: t("settings.websiteFailureDesc"),
    },
    {
      key: "feed_notify_dynamic_failure" as const,
      title: t("settings.dynamicFailureLabel"),
      description: t("settings.dynamicFailureDesc"),
    },
    {
      key: "feed_notify_npm_failure" as const,
      title: t("settings.npmFailureLabel"),
      description: t("settings.npmFailureDesc"),
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-tx-primary mb-1 flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent-primary" />
          {t("settings.notification")}
        </h3>
        <p className="text-sm text-tx-secondary mb-6">{t("settings.notificationDesc")}</p>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
          {t("settings.notifyChannels")}
        </h4>

        {CHANNELS.map((ch) => {
          const isEnabled = settings[ch.enabledKey] === "true";
          const currentTestStatus = testStatus[ch.id];
          return (
            <div
              key={ch.id}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-300",
                isEnabled
                  ? "bg-app-surface border-accent-primary/20 shadow-sm"
                  : "bg-app-surface/50 border-app-border hover:bg-app-hover"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-tx-primary text-sm">{ch.name}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(ch.enabledKey)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isEnabled ? "bg-accent-primary" : "bg-app-border"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isEnabled ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {isEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings[ch.urlKey]}
                      onChange={(e) => updateField(ch.urlKey, e.target.value)}
                      placeholder={ch.placeholder}
                      className="block w-full px-3 py-2 border border-app-border rounded-xl bg-app-bg text-tx-primary text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all font-mono"
                    />
                    <button
                      type="button"
                      disabled={currentTestStatus === "testing" || !settings[ch.urlKey]}
                      onClick={() => handleTest(ch.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98] border whitespace-nowrap shrink-0",
                        currentTestStatus === "success"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          : currentTestStatus === "failed"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                          : "bg-app-bg hover:bg-app-hover border-app-border text-tx-secondary"
                      )}
                    >
                      {currentTestStatus === "testing" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : currentTestStatus === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : currentTestStatus === "failed" ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {t("settings.testChannel")}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
          {t("settings.notifyEvents")}
        </h4>

        <div className="rounded-2xl border border-app-border bg-app-surface/30 divide-y divide-app-border overflow-hidden">
          {EVENTS.map((ev) => {
            const isSubscribed = settings[ev.key] === "true";
            return (
              <div key={ev.key} className="flex items-start justify-between p-4 gap-4 hover:bg-app-surface/50 transition-colors">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-tx-primary leading-tight">{ev.title}</div>
                  <div className="text-[11px] text-tx-secondary mt-1">{ev.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(ev.key)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-0.5",
                    isSubscribed ? "bg-accent-primary" : "bg-app-border"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isSubscribed ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-[11px] font-bold text-accent-danger">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={isLoading || success}
        onClick={handleSave}
        className={cn(
          "w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-md active:scale-[0.98] mt-6",
          success ? "bg-emerald-500 shadow-emerald-500/20" : "bg-accent-primary hover:bg-accent-primary/90 shadow-accent-primary/20"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : success ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5" />
            <span>{t("settings.saveSuccess")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            <span>{t("settings.saveSettings")}</span>
          </div>
        )}
      </button>
    </div>
  );
}
