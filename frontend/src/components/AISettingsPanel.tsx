import React, { useState, useEffect, useCallback } from "react";
import { Bot, Loader2, Check, AlertCircle, RefreshCw, Eye, EyeOff, Zap, CircleCheck, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AISettingsState {
  ai_provider: string;
  ai_api_url: string;
  ai_api_key: string;
  ai_model: string;

  ai_chat_provider: string;
  ai_chat_api_url: string;
  ai_chat_api_key: string;
  ai_chat_model: string;

  ai_api_key_set: boolean;
}

interface ProviderPreset {
  id: string;
  name: string;
  desc: string;
  models: string;
  url: string;
  defaultModel: string;
  needsKey: boolean;
  color: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "qwen",
    name: "通义千问",
    desc: "ai.qwenDesc",
    models: "Qwen-Turbo / Qwen-Plus / Qwen-Max",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    needsKey: true,
    color: "from-violet-500 to-blue-500",
  },
  {
    id: "openai",
    name: "OpenAI",
    desc: "ai.openaiDesc",
    models: "GPT-4o / GPT-4o-mini",
    url: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    needsKey: true,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    desc: "ai.geminiDesc",
    models: "gemini-2.0-flash / gemini-2.5-pro-preview",
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    needsKey: true,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    desc: "ai.deepseekDesc",
    models: "DeepSeek-V3 / DeepSeek-R1",
    url: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    needsKey: true,
    color: "from-sky-500 to-indigo-500",
  },
  {
    id: "doubao",
    name: "豆包（火山引擎）",
    desc: "ai.doubaoDesc",
    models: "Doubao-1.5-lite / Doubao-1.5-pro",
    url: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModel: "doubao-1.5-pro-32k",
    needsKey: true,
    color: "from-orange-500 to-pink-500",
  },
  {
    id: "ollama",
    name: "Custom / Ollama",
    desc: "ai.ollamaCustomDesc",
    models: "OpenAI 兼容接口 · Docker 自动连接",
    url: "http://localhost:11434/v1",
    defaultModel: "qwen2.5:7b",
    needsKey: false,
    color: "from-zinc-500 to-zinc-600",
  },
];

// --- Sub-components (Moved outside to prevent remounting/jitter) ---

const ActionArea = ({
  scenario,
  isSaving,
  isTesting,
  testResults,
  saveMsgs,
  handleSave,
  handleTest
}: {
  scenario: string;
  isSaving: Record<string, boolean>;
  isTesting: Record<string, boolean>;
  testResults: Record<string, { success: boolean; message: string } | null>;
  saveMsgs: Record<string, string>;
  handleSave: (scenario: string) => void;
  handleTest: (scenario: string) => void;
}) => {
  const loading = isSaving[scenario] || isTesting[scenario];
  const result = testResults[scenario];
  const msg = saveMsgs[scenario];

  return (
    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(scenario)}
            disabled={loading}
            type="button"
            className="flex items-center justify-center gap-2 w-28 h-8 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 shrink-0 relative overflow-hidden"
          >
            <div className="w-3 h-3 flex items-center justify-center shrink-0 relative">
              <Loader2 size={12} className={cn("animate-spin absolute transition-all duration-300", isSaving[scenario] ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
              <Check size={12} className={cn("absolute transition-all duration-300", !isSaving[scenario] ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
            </div>
            <span>保存配置</span>
          </button>

          <button
            onClick={() => handleTest(scenario)}
            disabled={loading}
            type="button"
            className="flex items-center justify-center gap-2 w-28 h-8 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:border-accent-primary/50 transition-all disabled:opacity-40 bg-white dark:bg-zinc-900 shadow-sm shrink-0 relative overflow-hidden"
          >
            <div className="w-3 h-3 flex items-center justify-center shrink-0 relative">
              <Loader2 size={12} className={cn("animate-spin absolute transition-all duration-300", isTesting[scenario] ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
              <RefreshCw size={12} className={cn("absolute transition-all duration-300", !isTesting[scenario] ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
            </div>
            <span>测试连接</span>
          </button>
        </div>

        <div className="h-8 flex items-center gap-3 min-w-[200px] relative">
          <span className={cn(
            "text-[10px] font-bold transition-all duration-500 absolute",
            msg ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none",
            msg?.includes("成功") ? "text-emerald-500" : "text-red-500"
          )}>
            {msg || "保存成功"}
          </span>
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-bold text-emerald-500 transition-all duration-500 absolute left-[80px]",
            (result && result.success) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
          )}>
            <CircleCheck size={12} />
            连接成功
          </span>
        </div>
      </div>

      <div className="h-[30px] flex items-center overflow-hidden">
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20",
          (result && !result.success) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}>
          <AlertCircle size={12} />
          <span className="truncate max-w-[400px]">{result?.message || "连接失败，请检查配置"}</span>
        </div>
      </div>
    </div>
  );
};

const ScenarioConfig = ({
  prefix,
  title,
  icon,
  color,
  settings,
  setSettings,
  editingScenarios,
  setEditingScenarios,
  getPreset,
  children,
  actionArea
}: {
  prefix: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  settings: AISettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AISettingsState>>;
  editingScenarios: Record<string, boolean>;
  setEditingScenarios: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  getPreset: (id: string) => ProviderPreset | undefined;
  children?: React.ReactNode;
  actionArea: React.ReactNode;
}) => {
  const settingsRecord = settings as unknown as Record<string, string | boolean>;
  const isEditing = !!editingScenarios[prefix];
  const isCustom = !!settingsRecord[`ai_${prefix}_provider`];
  const scenarioProvider = (settingsRecord[`ai_${prefix}_provider`] as string) || settings.ai_provider;
  const scenarioPreset = getPreset(scenarioProvider);

  return (
    <div className={cn(
      "space-y-4 p-5 rounded-2xl transition-[background-color,border-color,box-shadow,ring] duration-300 shadow-sm border",
      isEditing
        ? "bg-white dark:bg-zinc-900 border-accent-primary/30 ring-4 ring-accent-primary/5"
        : "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shadow-sm", color)}>
            {icon}
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</div>
            {!isEditing && (
              <div className="text-[10px] text-zinc-500 font-medium">
                {isCustom ? `自定义: ${scenarioPreset?.name || "未知"}` : "继承全局配置"}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              onClick={() => setEditingScenarios(prev => ({ ...prev, [prefix]: false }))}
              className="px-3 py-1 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            >
              取消
            </button>
          ) : (
            <button
              onClick={() => setEditingScenarios(prev => ({ ...prev, [prefix]: true }))}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white transition-all"
            >
              <Settings size={10} />
              设置
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500">启用独立服务商配置</span>
            <button
              onClick={() => {
                const isNowCustom = !isCustom;
                setSettings(prev => ({
                  ...prev,
                  [`ai_${prefix}_provider`]: isNowCustom ? settings.ai_provider : "",
                  [`ai_${prefix}_api_url`]: isNowCustom ? settings.ai_api_url : "",
                  [`ai_${prefix}_model`]: isNowCustom ? settings.ai_model : "",
                }));
              }}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors outline-none",
                isCustom ? "bg-accent-primary" : "bg-zinc-300 dark:bg-zinc-600"
              )}
            >
              <span className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                isCustom ? "translate-x-5" : "translate-x-1"
              )} />
            </button>
          </div>

          {isCustom && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PROVIDER_PRESETS.map(p => {
                  const isSel = settingsRecord[`ai_${prefix}_provider`] === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        [`ai_${prefix}_provider`]: p.id,
                        [`ai_${prefix}_api_url`]: p.url,
                        [`ai_${prefix}_model`]: p.defaultModel
                      }))}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-left group relative overflow-hidden",
                        isSel
                          ? "border-accent-primary bg-accent-primary/5"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br text-[8px] text-white transition-transform group-hover:scale-110", p.color)}>
                        <Zap size={10} />
                      </div>
                      <span className="text-[10px] font-bold truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={`ai-${prefix}-api-url`} className="text-[10px] font-bold text-zinc-500 uppercase">API 端点</label>
                  <input
                    id={`ai-${prefix}-api-url`}
                    name={`ai_${prefix}_api_url`}
                    type="text"
                    value={settingsRecord[`ai_${prefix}_api_url`] as string || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, [`ai_${prefix}_api_url`]: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`ai-${prefix}-api-key`} className="text-[10px] font-bold text-zinc-500 uppercase">API Key</label>
                  <input
                    id={`ai-${prefix}-api-key`}
                    name={`ai_${prefix}_api_key`}
                    type="password"
                    value={settingsRecord[`ai_${prefix}_api_key`] as string || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, [`ai_${prefix}_api_key`]: e.target.value }))}
                    placeholder="留空则不更新"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`ai-${prefix}-model`} className="text-[10px] font-bold text-zinc-500 uppercase">选用模型</label>
                <input
                  id={`ai-${prefix}-model`}
                  name={`ai_${prefix}_model`}
                  type="text"
                  value={settingsRecord[`ai_${prefix}_model`] as string || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, [`ai_${prefix}_model`]: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {children}
          {actionArea}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-1">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">模型</div>
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {settingsRecord[`ai_${prefix}_model`] as string || settings.ai_model || "未设置"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AISettingsPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AISettingsState>({
    ai_provider: "openai", ai_api_url: "", ai_api_key: "", ai_model: "",
    ai_chat_provider: "", ai_chat_api_url: "", ai_chat_api_key: "", ai_chat_model: "",
    ai_api_key_set: false,
  });
  const [localKey, setLocalKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [saveMsgs, setSaveMsgs] = useState<Record<string, string>>({});
  const [editingScenarios, setEditingScenarios] = useState<Record<string, boolean>>({});
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getAISettings() as AISettingsState;
      setSettings(data);
      setLocalKey(data.ai_api_key_set ? data.ai_api_key : "");
      setIsConfigured(!!data.ai_api_url && (data.ai_api_key_set || !getPreset(data.ai_provider)?.needsKey));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function getPreset(providerId: string): ProviderPreset | undefined {
    return PROVIDER_PRESETS.find(p => p.id === providerId);
  }

  const handleProviderChange = (provider: string) => {
    const preset = getPreset(provider);
    if (!preset) return;
    setSettings(prev => ({
      ...prev,
      ai_provider: provider,
      ai_api_url: preset.url,
      ai_model: preset.defaultModel,
    }));
    if (!preset.needsKey) setLocalKey("");
    setTestResults(prev => ({ ...prev, global: null }));
  };

  const handleSave = async (scenario: string) => {
    setIsSaving(prev => ({ ...prev, [scenario]: true }));
    setSaveMsgs(prev => ({ ...prev, [scenario]: "" }));
    setTestResults(prev => ({ ...prev, [scenario]: null }));
    try {
      const payload: Record<string, unknown> = {};
      if (scenario === "global") {
        payload.ai_provider = settings.ai_provider;
        payload.ai_api_url = settings.ai_api_url;
        payload.ai_api_key = localKey;
        payload.ai_model = settings.ai_model;
      } else if (scenario === "chat") {
        payload.ai_chat_provider = settings.ai_chat_provider;
        payload.ai_chat_api_url = settings.ai_chat_api_url;
        payload.ai_chat_api_key = settings.ai_chat_api_key;
        payload.ai_chat_model = settings.ai_chat_model;
      }

      for (const k in payload) {
        if (k.includes("api_key") && (payload[k] as string)?.includes("****")) {
          delete payload[k];
        }
      }

      const data = await api.updateAISettings(payload) as AISettingsState;
      setSettings(data);
      if (scenario === "global") setIsConfigured(true);
      setSaveMsgs(prev => ({ ...prev, [scenario]: t("ai.saveSuccess") }));
      setTimeout(() => setSaveMsgs(prev => ({ ...prev, [scenario]: "" })), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSaveMsgs(prev => ({ ...prev, [scenario]: message || t("ai.saveFailed") }));
    } finally {
      setIsSaving(prev => ({ ...prev, [scenario]: false }));
    }
  };

  const handleTest = async (scenario: string) => {
    setIsTesting(prev => ({ ...prev, [scenario]: true }));
    setTestResults(prev => ({ ...prev, [scenario]: null }));
    try {
      await handleSave(scenario);
      const result = await api.testAIConnection();
      setTestResults(prev => ({ ...prev, [scenario]: { success: result.success, message: result.message || result.error || "" } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResults(prev => ({ ...prev, [scenario]: { success: false, message: message || t("ai.testFailed") } }));
    } finally {
      setIsTesting(prev => ({ ...prev, [scenario]: false }));
    }
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const payload: Record<string, unknown> = {
        ai_provider: settings.ai_provider,
        ai_api_url: settings.ai_api_url,
        ai_model: settings.ai_model,
      };
      if (localKey && !localKey.includes("****")) payload.ai_api_key = localKey;
      await api.updateAISettings(payload);
      const data = await api.getAIModels();
      setModels(data.models || []);
      if (data.models?.length) setModelDropdownOpen(true);
    } catch { /* ignore */ }
    setLoadingModels(false);
  };

  const currentPreset = getPreset(settings.ai_provider);
  const needsKey = currentPreset?.needsKey ?? true;

  const commonActionAreaProps = {
    isSaving,
    isTesting,
    testResults,
    saveMsgs,
    handleSave,
    handleTest
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">{t("ai.title")}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("ai.description")}</p>
        </div>
        {isConfigured && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">
            <CircleCheck size={14} />
            {t("ai.configured")}
          </span>
        )}
      </div>

      {/* 全局默认配置卡片 */}
      <div className={cn(
        "space-y-4 p-5 rounded-2xl transition-[background-color,border-color,box-shadow,ring] duration-300 shadow-sm border",
        editingScenarios.global
          ? "bg-white dark:bg-zinc-900 border-accent-primary/30 ring-4 ring-accent-primary/5"
          : "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shadow-sm from-blue-600 to-indigo-700")}>
              <Bot size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">全局默认配置</div>
              {!editingScenarios.global && (
                <div className="text-[10px] text-zinc-500 font-medium">服务商: {currentPreset?.name || "自定义"}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditingScenarios(prev => ({ ...prev, global: !prev.global }))}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all",
              editingScenarios.global
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                : "bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white"
            )}
          >
            {editingScenarios.global ? "取消" : (
              <>
                <Settings size={10} />
                设置
              </>
            )}
          </button>
        </div>

        {editingScenarios.global ? (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PROVIDER_PRESETS.map(p => {
                const isSel = settings.ai_provider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProviderChange(p.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-left group relative overflow-hidden",
                      isSel
                        ? "border-accent-primary bg-accent-primary/5"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br text-[8px] text-white transition-transform group-hover:scale-110", p.color)}>
                      <Zap size={10} />
                    </div>
                    <span className="text-[10px] font-bold truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="ai-global-api-url" className="text-[10px] font-bold text-zinc-500 uppercase">{t("ai.apiUrl")}</label>
                <input
                  id="ai-global-api-url"
                  name="ai_api_url"
                  type="text"
                  value={settings.ai_api_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, ai_api_url: e.target.value }))}
                  placeholder={currentPreset?.url || "https://api.openai.com/v1"}
                  className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all"
                />
              </div>
              {needsKey && (
                <div className="space-y-1">
                  <label htmlFor="ai-global-api-key" className="text-[10px] font-bold text-zinc-500 uppercase">{t("ai.apiKey")}</label>
                  <div className="relative">
                    <input
                      id="ai-global-api-key"
                      name="ai_api_key"
                      type={showKey ? "text" : "password"}
                      value={localKey}
                      onChange={(e) => setLocalKey(e.target.value)}
                      placeholder={settings.ai_api_key_set ? t("ai.apiKeySet") : "sk-..."}
                      className="w-full px-3 py-1.5 pr-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="ai-global-model" className="text-[10px] font-bold text-zinc-500 uppercase">{t("ai.model")}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="ai-global-model"
                    name="ai_model"
                    type="text"
                    value={settings.ai_model}
                    onChange={(e) => setSettings(prev => ({ ...prev, ai_model: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all"
                  />
                  {modelDropdownOpen && models.length > 0 && (
                    <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl">
                      {models.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setSettings(prev => ({ ...prev, ai_model: m.id })); setModelDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 text-[11px] hover:bg-accent-primary/5 transition-colors"
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchModels}
                  disabled={loadingModels || !settings.ai_api_url}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-bold text-zinc-600 hover:text-accent-primary transition-all disabled:opacity-40"
                >
                  {loadingModels ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                </button>
              </div>
            </div>
            <ActionArea scenario="global" {...commonActionAreaProps} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">端点</div>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">{settings.ai_api_url || "未设置"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">默认模型</div>
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{settings.ai_model || "未设置"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">API Key</div>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{settings.ai_api_key_set ? "********" : "未配置"}</div>
            </div>
          </div>
        )}
      </div>

      <ScenarioConfig
        prefix="chat"
        title="侧边栏助手"
        icon={<Bot size={16} />}
        color="from-sky-500 to-blue-600"
        settings={settings}
        setSettings={setSettings}
        editingScenarios={editingScenarios}
        setEditingScenarios={setEditingScenarios}
        getPreset={getPreset}
        actionArea={<ActionArea scenario="chat" {...commonActionAreaProps} />}
      />
    </div>
  );
}
