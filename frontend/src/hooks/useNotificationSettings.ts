import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface NotificationSettings {
  feed_bark_enabled: string;
  feed_bark_url: string;
  feed_feishu_enabled: string;
  feed_feishu_webhook: string;
  feed_notify_website_failure: string;
  feed_notify_dynamic_failure: string;
  feed_notify_npm_failure: string;
  [key: string]: string;
}

const DEFAULTS: NotificationSettings = {
  feed_bark_enabled: "false",
  feed_bark_url: "",
  feed_feishu_enabled: "false",
  feed_feishu_webhook: "",
  feed_notify_website_failure: "false",
  feed_notify_dynamic_failure: "false",
  feed_notify_npm_failure: "false",
};

/**
 * Hook to manage notification settings state and API interactions.
 */
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, "idle" | "testing" | "success" | "failed">>({
    bark: "idle",
    feishu: "idle",
  });

  useEffect(() => {
    api.getFeedSettings()
      .then((data) => {
        setSettings({
          feed_bark_enabled: data.feed_bark_enabled ?? "false",
          feed_bark_url: data.feed_bark_url ?? "",
          feed_feishu_enabled: data.feed_feishu_enabled ?? "false",
          feed_feishu_webhook: data.feed_feishu_webhook ?? "",
          feed_notify_website_failure: data.feed_notify_website_failure ?? "false",
          feed_notify_dynamic_failure: data.feed_notify_dynamic_failure ?? "false",
          feed_notify_npm_failure: data.feed_notify_npm_failure ?? "false",
        });
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "获取设置失败");
        setIsLoading(false);
      });
  }, []);

  const updateField = useCallback((key: keyof NotificationSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setSuccess(false);
    try {
      const data = await api.updateFeedSettings(settings);
      setSettings({
        feed_bark_enabled: data.feed_bark_enabled ?? "false",
        feed_bark_url: data.feed_bark_url ?? "",
        feed_feishu_enabled: data.feed_feishu_enabled ?? "false",
        feed_feishu_webhook: data.feed_feishu_webhook ?? "",
        feed_notify_website_failure: data.feed_notify_website_failure ?? "false",
        feed_notify_dynamic_failure: data.feed_notify_dynamic_failure ?? "false",
        feed_notify_npm_failure: data.feed_notify_npm_failure ?? "false",
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存设置失败");
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const handleTest = useCallback(async (type: "bark" | "feishu") => {
    setTestStatus((prev) => ({ ...prev, [type]: "testing" }));
    try {
      const res = await api.testPushNotification(type, settings);
      if (res.success) {
        setTestStatus((prev) => ({ ...prev, [type]: "success" }));
      } else {
        setTestStatus((prev) => ({ ...prev, [type]: "failed" }));
      }
    } catch {
      setTestStatus((prev) => ({ ...prev, [type]: "failed" }));
    }
    setTimeout(() => {
      setTestStatus((prev) => ({ ...prev, [type]: "idle" }));
    }, 3000);
  }, [settings]);

  return {
    settings,
    isLoading,
    error,
    success,
    testStatus,
    updateField,
    handleSave,
    handleTest,
  };
}
