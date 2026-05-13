import React, { useState, useEffect } from "react";
import { X, Save, RefreshCw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { WebsiteRssConfig, WebsiteRssCreate, WebsiteRssSelector, SelectorField, AuthCredential } from "@/types/feed";
import { websiteRssApi, authCredentialApi } from "@/lib/feed-api";
import SelectorDebugger from "./SelectorDebugger";

interface Props {
  config: WebsiteRssConfig | null;
  onClose: () => void;
  onSave: () => void;
}

const defaultSelector = (): WebsiteRssSelector => ({
  selectorType: "css",
  container: "",
  title: { selector: "", extractType: "text" },
  content: { selector: "", extractType: "html" },
  link: { selector: "a", extractType: "attr", attrName: "href" },
});

export default function WebsiteRssForm({ config, onClose, onSave }: Props) {
  const isNew = !config;
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(config?.title ?? "");
  const [url, setUrl] = useState(config?.url ?? "");
  const [key, setKey] = useState(config?.key ?? "");
  const [rssDescription, setRssDescription] = useState(config?.rssDescription ?? "");
  const [fetchInterval, setFetchInterval] = useState(config?.fetchInterval ?? 60);
  const [authCredentialId, setAuthCredentialId] = useState<number | undefined>(config?.authCredentialId);
  const [selector, setSelector] = useState<WebsiteRssSelector>(config?.selector ?? defaultSelector());
  const [credentials, setCredentials] = useState<AuthCredential[]>([]);
  const [debuggerOpen, setDebuggerOpen] = useState(false);
  const [favicon, setFavicon] = useState(config?.favicon ?? "");
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  useEffect(() => {
    authCredentialApi.list()
      .then(setCredentials)
      .catch((err) => console.error("加载授权凭证失败", err));
  }, []);

  useEffect(() => {
    if (config) {
      setTitle(config.title); setUrl(config.url); setKey(config.key);
      setRssDescription(config.rssDescription ?? ""); setFetchInterval(config.fetchInterval);
      setSelector(config.selector); setAuthCredentialId(config.authCredentialId);
      setFavicon(config.favicon ?? "");
    }
  }, [config]);

  const handleFetchMeta = async () => {
    if (!url.trim()) return;
    setIsFetchingMeta(true);
    try {
      const res = await websiteRssApi.fetchMeta(url);
      if (res.success && res.data) {
        if (res.data.title) setTitle(res.data.title);
        if (res.data.description) setRssDescription(res.data.description);
        if (res.data.favicon) setFavicon(res.data.favicon);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "获取网站信息失败");
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const updateSelector = (updates: Partial<WebsiteRssSelector>) => {
    setSelector((prev) => ({ ...prev, ...updates }));
  };

  const updateSelectorField = (field: keyof WebsiteRssSelector, updates: Partial<SelectorField>) => {
    setSelector((prev) => ({
      ...prev,
      [field]: { ...(prev[field] as SelectorField), ...updates },
    }));
  };

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) return;
    setIsSaving(true);
    try {
      const data: WebsiteRssCreate = { key, title, url, selector, renderMode: "static", fetchInterval, rssDescription, authCredentialId, favicon };
      if (isNew) {
        await websiteRssApi.create(data);
      } else if (config) {
        await websiteRssApi.update(config.id, data);
      }
      onSave();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-app-surface border-l border-app-border shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <h3 className="text-sm font-semibold text-tx-primary">
            {isNew ? "新建网页监控" : `编辑 · ${config?.title}`}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={16} /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 网站 URL */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <InputField label="网站 URL *" value={url} onChange={setUrl} placeholder="https://news.ycombinator.com" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFetchMeta}
              disabled={isFetchingMeta || !url.trim()}
              className="h-9 mb-[1px] text-xs border-app-border bg-app-bg hover:bg-app-surface"
            >
              {isFetchingMeta ? (
                <RefreshCw size={13} className="animate-spin mr-1.5" />
              ) : (
                <Sparkles size={13} className="mr-1.5 text-accent-primary" />
              )}
              智能获取
            </Button>
          </div>

          {/* 网站名称 */}
          <InputField label="网站名称 *" value={title} onChange={setTitle} placeholder="例：Hacker News" />

          {/* 网站图标 URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-tx-secondary">网站图标 URL</label>
              {favicon && (
                <div className="flex items-center gap-1.5">
                  <img
                    src={favicon}
                    className="w-4 h-4 rounded object-contain border border-app-border"
                    alt="Favicon"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setFavicon("")}
                    className="text-[10px] text-accent-danger hover:underline"
                  >
                    清除
                  </button>
                </div>
              )}
            </div>
            <input
              value={favicon}
              onChange={(e) => setFavicon(e.target.value)}
              placeholder="https://example.com/favicon.ico"
              className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>


          {/* Feed 描述 */}
          <InputField label="Feed 描述" value={rssDescription} onChange={setRssDescription} placeholder="该 Feed 的描述..." />
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="刷新间隔（分钟）" value={fetchInterval} onChange={setFetchInterval} min={1} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-tx-secondary">授权凭证（可选）</label>
              <select
                value={authCredentialId ?? ""}
                onChange={(e) => setAuthCredentialId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              >
                <option value="">无</option>
                {credentials.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-app-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-tx-primary">解析规则配置</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDebuggerOpen(true)}
                className="text-[11px] text-accent-primary border-accent-primary/20 hover:bg-accent-primary/10"
              >
                在线调试选择器
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-tx-secondary">解析方式</label>
                <select
                  value={selector.selectorType || "css"}
                  onChange={(e) => updateSelector({ selectorType: e.target.value as "css" | "xpath" })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                >
                  <option value="css">CSS 选择器</option>
                  <option value="xpath">XPath 表达式</option>
                </select>
              </div>

              <InputField
                label={selector.selectorType === "xpath" ? "列表容器（XPath）" : "列表容器（container）"}
                value={selector.container}
                onChange={(v) => updateSelector({ container: v })}
                placeholder={selector.selectorType === "xpath" ? "例: //ul/li" : ".article-list li"}
              />

              <SelectorFieldEditor
                label="标题" field={selector.title}
                selectorType={selector.selectorType || "css"}
                onChange={(updates) => updateSelectorField("title", updates)}
              />
              <SelectorFieldEditor
                label="链接（可选）" field={selector.link ?? { selector: "a", extractType: "attr", attrName: "href" }}
                selectorType={selector.selectorType || "css"}
                onChange={(updates) => updateSelectorField("link", updates)}
              />
              <SelectorFieldEditor
                label="发布时间（可选）" field={selector.date ?? { selector: "", extractType: "text" }}
                selectorType={selector.selectorType || "css"}
                onChange={(updates) => updateSelectorField("date", updates)}
              />
              <SelectorFieldEditor
                label="内容" field={selector.content}
                selectorType={selector.selectorType || "css"}
                onChange={(updates) => updateSelectorField("content", updates)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app-border">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 min-w-16">
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            保存
          </Button>
        </div>
      </motion.div>

      {/* Selector Debugger Overlay */}
      <AnimatePresence>
        {debuggerOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-app-bg"
          >
            <SelectorDebugger
              initialUrl={url}
              initialSelector={selector}
              initialAuthId={authCredentialId}
              onApply={(newSelector, newAuthId) => {
                setSelector(newSelector);
                setAuthCredentialId(newAuthId);
              }}
              onClose={() => setDebuggerOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-tx-secondary">{label}</label>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />
    </div>
  );
}

function NumberField({ label, value, onChange, min }: {
  label: string; value: number; onChange: (v: number) => void; min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-tx-secondary">{label}</label>
      <input
        type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={min}
        className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />
    </div>
  );
}

function SelectorFieldEditor({ label, field, selectorType, onChange }: {
  label: string; field: SelectorField; selectorType: "css" | "xpath"; onChange: (updates: Partial<SelectorField>) => void;
}) {
  const [showRegex, setShowRegex] = useState(!!field.regexPattern);

  return (
    <div className="space-y-2 p-3 rounded-lg border border-app-border bg-app-bg/50">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-tx-tertiary uppercase tracking-wider">{label}</p>
        <button
          type="button"
          onClick={() => setShowRegex(!showRegex)}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            showRegex
              ? "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
              : "text-tx-tertiary border-app-border hover:bg-app-hover"
          }`}
        >
          {showRegex ? "收起正则" : "正则过滤"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-tx-tertiary">
            {selectorType === "xpath" ? "XPath 表达式" : "CSS 选择器"}
          </label>
          <input
            value={field.selector} onChange={(e) => onChange({ selector: e.target.value })}
            placeholder={selectorType === "xpath" ? "./h2/a" : ".item-title"}
            className="w-full px-2 py-1 text-xs font-mono rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
        <div>
          <label className="text-[10px] text-tx-tertiary">提取类型</label>
          <select
            value={field.extractType} onChange={(e) => onChange({ extractType: e.target.value as SelectorField["extractType"] })}
            className="w-full px-2 py-1 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none"
          >
            <option value="text">文本</option>
            <option value="attr">属性</option>
            <option value="html">HTML</option>
          </select>
        </div>
      </div>
      {field.extractType === "attr" && (
        <div>
          <label className="text-[10px] text-tx-tertiary">属性名</label>
          <input
            value={field.attrName ?? ""} onChange={(e) => onChange({ attrName: e.target.value })}
            placeholder="href"
            className="w-full px-2 py-1 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      )}

      {showRegex && (
        <div className="space-y-2 border-t border-app-border/40 pt-2 mt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-tx-tertiary">正则匹配模式 (Pattern)</label>
              <input
                value={field.regexPattern ?? ""}
                onChange={(e) => onChange({ regexPattern: e.target.value || undefined })}
                placeholder="例: (\\d+)分钟前"
                className="w-full px-2 py-1 text-xs font-mono rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] text-tx-tertiary">修饰符</label>
                <input
                  value={field.regexFlags ?? ""}
                  onChange={(e) => onChange({ regexFlags: e.target.value || undefined })}
                  placeholder="g, i"
                  className="w-full px-1.5 py-1 text-xs font-mono rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-tx-tertiary">捕获组</label>
                <input
                  type="number"
                  value={field.regexGroup ?? ""}
                  onChange={(e) => onChange({ regexGroup: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="1"
                  min={0}
                  className="w-full px-1.5 py-1 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
