import React, { useState, useEffect, useCallback } from "react";
import { Play, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp, KeyRound, Globe, Save, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteRssSelector, SelectorField, ScrapeResult, AuthCredential, FeedItem } from "@/types/feed";
import { websiteRssApi, authCredentialApi } from "@/lib/feed-api";
import { cn } from "@/lib/utils";

interface Props {
  initialUrl: string;
  initialSelector: WebsiteRssSelector;
  initialAuthId?: number;
  onApply?: (selector: WebsiteRssSelector, authId?: number) => void;
  onClose: () => void;
}

const defaultSelector = (): WebsiteRssSelector => ({
  selectorType: "css",
  container: "",
  title: { selector: "", extractType: "text" },
  content: { selector: "", extractType: "html" },
  link: { selector: "a", extractType: "attr", attrName: "href" },
});

export default function SelectorDebugger({ initialUrl, initialSelector, initialAuthId, onApply, onClose }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [selector, setSelector] = useState<WebsiteRssSelector>({ ...defaultSelector(), ...initialSelector });
  const [authId, setAuthId] = useState<number | undefined>(initialAuthId);
  const [credentials, setCredentials] = useState<AuthCredential[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // 加载凭证列表
  useEffect(() => {
    authCredentialApi.list()
      .then(setCredentials)
      .catch((err) => console.error("加载授权凭证失败", err));
  }, []);

  const updateSelector = (updates: Partial<WebsiteRssSelector>) => {
    setSelector((prev) => ({ ...prev, ...updates }));
  };

  const updateSelectorField = (field: keyof WebsiteRssSelector, updates: Partial<SelectorField>) => {
    setSelector((prev) => ({
      ...prev,
      [field]: { ...(prev[field] as SelectorField), ...updates },
    }));
  };

  const handleTest = useCallback(async () => {
    if (!url.trim()) {
      setError("请输入目标网页的 URL");
      return;
    }
    if (!selector.container.trim()) {
      setError("请输入列表容器选择器");
      return;
    }
    if (!selector.title.selector.trim()) {
      setError("请输入标题选择器");
      return;
    }

    setIsRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await websiteRssApi.debugAdHoc({
        url,
        selector,
        authCredentialId: authId,
      });
      setResult(res);
      if (res.error) {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "抓取调试失败");
    } finally {
      setIsRunning(false);
    }
  }, [url, selector, authId]);

  const toggleItem = (idx: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleApply = () => {
    if (onApply) {
      onApply(selector, authId);
    }
    onClose();
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-app-bg text-tx-primary">
      {/* Configuration Side */}
      <div className="w-[320px] border-r border-app-border flex flex-col h-full bg-app-surface/40">
        <div className="p-4 border-b border-app-border bg-app-surface/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-accent-primary animate-pulse" />
            <span className="text-xs font-semibold">调试配置</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-tx-tertiary hover:text-tx-primary text-xs">
            关闭
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Target URL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-tx-secondary uppercase tracking-wider">目标网址</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/news"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-app-border bg-app-bg focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>

          {/* Credential Select */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-tx-secondary uppercase tracking-wider flex items-center gap-1">
              <KeyRound size={11} />
              授权凭证（可选）
            </label>
            <select
              value={authId ?? ""}
              onChange={(e) => setAuthId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="">无需凭证</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.authType})</option>
              ))}
            </select>
          </div>

          <hr className="border-app-border" />

          {/* Selectors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-tx-primary uppercase tracking-wider">解析规则设置</label>
              <span className="inline-flex" title="每个选择器需配合抓取出的容器节点进行解析">
                <HelpCircle size={12} className="text-tx-tertiary hover:text-tx-secondary cursor-pointer" />
              </span>
            </div>

            {/* Selector Type Selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-tx-secondary">解析方式</span>
              <select
                value={selector.selectorType || "css"}
                onChange={(e) => updateSelector({ selectorType: e.target.value as "css" | "xpath" })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              >
                <option value="css">CSS 选择器</option>
                <option value="xpath">XPath 表达式</option>
              </select>
            </div>

            {/* Container Selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-tx-secondary">
                1. 列表容器选择器 ({selector.selectorType === "xpath" ? "XPath" : "CSS"}) (必填)
              </span>
              <input
                value={selector.container}
                onChange={(e) => updateSelector({ container: e.target.value })}
                placeholder={selector.selectorType === "xpath" ? "例: //ul/li" : "例: .news-list > li, article"}
                className="w-full px-2 py-1.5 text-xs font-mono rounded-md border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>

            {/* Title Selector */}
            <SelectorFieldEditor
              title="2. 标题 (Title)"
              field={selector.title}
              selectorType={selector.selectorType || "css"}
              onChange={(updates) => updateSelectorField("title", updates)}
              placeholder={selector.selectorType === "xpath" ? "例: ./h2/a" : "例: h2.title, a.headline"}
            />

            {/* Link Selector */}
            <SelectorFieldEditor
              title="3. 链接 (Link)"
              field={selector.link ?? { selector: "a", extractType: "attr", attrName: "href" }}
              selectorType={selector.selectorType || "css"}
              onChange={(updates) => updateSelectorField("link", updates)}
              placeholder={selector.selectorType === "xpath" ? "例: ./a/@href" : "例: a, .title-link"}
            />

            {/* Content Selector */}
            <SelectorFieldEditor
              title="4. 内容 (Content)"
              field={selector.content}
              selectorType={selector.selectorType || "css"}
              onChange={(updates) => updateSelectorField("content", updates)}
              placeholder={selector.selectorType === "xpath" ? "例: ./div[@class='desc']" : "例: .summary, .description"}
            />
          </div>
        </div>

        <div className="p-4 border-t border-app-border bg-app-surface/60 space-y-2">
          <Button
            size="sm"
            onClick={handleTest}
            disabled={isRunning}
            className="w-full gap-1.5 justify-center bg-accent-primary text-white hover:bg-accent-primary/90"
          >
            {isRunning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            {isRunning ? "测试抓取中..." : "运行测试"}
          </Button>

          {onApply && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleApply}
              disabled={isRunning || !result?.success}
              className="w-full gap-1.5 justify-center"
            >
              <Save size={13} />
              保存并套用配置
            </Button>
          )}
        </div>
      </div>

      {/* Preview Side */}
      <div className="flex-1 flex flex-col h-full bg-app-bg">
        <div className="p-4 border-b border-app-border bg-app-surface/30 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-tx-secondary">抓取结果实时预览</span>
          {result && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                抓取耗时: {result.executionTime}ms
              </Badge>
              {result.success ? (
                <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  正常解析 ({result.items?.length ?? 0} 条)
                </span>
              ) : (
                <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <XCircle size={13} />
                  解析失败
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-mono whitespace-pre-wrap">
              <strong>错误提示:</strong>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {result?.success && result.items && result.items.length > 0 ? (
            <div className="space-y-3">
              {result.items.map((item, idx) => (
                <PreviewItemCard
                  key={idx}
                  item={item}
                  index={idx}
                  isExpanded={expandedItems.has(idx)}
                  onToggle={() => toggleItem(idx)}
                />
              ))}
            </div>
          ) : !isRunning && !result ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-3">
                <Play size={20} className="text-accent-primary" />
              </div>
              <p className="text-sm font-semibold text-tx-primary">等待开始抓取</p>
              <p className="text-xs text-tx-tertiary max-w-[280px] mt-1">在左侧填入您想要调试的目标网页 URL 及其对应的 CSS 提取规则进行抓取性能测试。</p>
            </div>
          ) : isRunning ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <RefreshCw size={24} className="text-accent-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-tx-primary">正在抓取及渲染网页中...</p>
              <p className="text-xs text-tx-tertiary mt-1">这通常取决于目标网页的响应速度和网络连通性。</p>
            </div>
          ) : result?.success && (!result.items || result.items.length === 0) ? (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs text-center">
              网页请求成功，但未能解析出任何条目。请检查“列表容器选择器”和“内部提取选择器”是否正确。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface FieldEditorProps {
  title: string;
  field: SelectorField;
  selectorType: "css" | "xpath";
  placeholder?: string;
  onChange: (updates: Partial<SelectorField>) => void;
}

function SelectorFieldEditor({ title, field, selectorType, placeholder, onChange }: FieldEditorProps) {
  return (
    <div className="p-2.5 rounded-lg border border-app-border bg-app-bg/60 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-tx-secondary">{title}</span>
      </div>
      <div className="space-y-1.5">
        <div>
          <span className="text-[9px] text-tx-tertiary">
            {selectorType === "xpath" ? "XPath 表达式" : "CSS 选择器"}
          </span>
          <input
            value={field.selector}
            onChange={(e) => onChange({ selector: e.target.value })}
            placeholder={placeholder}
            className="w-full px-2 py-1 text-xs font-mono rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <span className="text-[9px] text-tx-tertiary">提取类型</span>
            <select
              value={field.extractType}
              onChange={(e) => onChange({ extractType: e.target.value as SelectorField["extractType"] })}
              className="w-full px-1.5 py-0.5 text-[11px] rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none"
            >
              <option value="text">提取文本</option>
              <option value="attr">提取属性</option>
              <option value="html">保留 HTML</option>
            </select>
          </div>
          {field.extractType === "attr" && (
            <div>
              <span className="text-[9px] text-tx-tertiary">属性名</span>
              <input
                value={field.attrName ?? ""}
                onChange={(e) => onChange({ attrName: e.target.value })}
                placeholder="href"
                className="w-full px-1.5 py-0.5 text-[11px] font-mono rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PreviewItemCardProps {
  item: FeedItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function PreviewItemCard({ item, index, isExpanded, onToggle }: PreviewItemCardProps) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface shadow-sm overflow-hidden transition-all hover:border-accent-primary/20 hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between p-4 text-left hover:bg-app-hover/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-accent-primary font-bold font-mono">#{index + 1}</span>
            <h4 className="text-xs font-semibold text-tx-primary truncate">
              {item.title || <span className="text-red-400 italic">空标题 (未匹配)</span>}
            </h4>
          </div>
          <p className="text-[11px] text-tx-tertiary truncate font-mono">
            {item.link || <span className="text-red-400 italic">空链接</span>}
          </p>
        </div>
        <div>
          {isExpanded ? (
            <ChevronUp size={14} className="text-tx-tertiary shrink-0 ml-2" />
          ) : (
            <ChevronDown size={14} className="text-tx-tertiary shrink-0 ml-2" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-app-border bg-app-surface/30 pt-3">
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-tx-tertiary uppercase tracking-wider font-semibold">标题 (Title)</span>
              <p className="text-xs text-tx-primary font-medium mt-0.5">{item.title || "—"}</p>
            </div>
            <div>
              <span className="text-[10px] text-tx-tertiary uppercase tracking-wider font-semibold">完整链接 (Link)</span>
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline block truncate mt-0.5 font-mono">
                  {item.link}
                </a>
              ) : (
                <p className="text-xs text-tx-tertiary mt-0.5">—</p>
              )}
            </div>
            {item.content && (
              <div>
                <span className="text-[10px] text-tx-tertiary uppercase tracking-wider font-semibold">提取内容 (Content)</span>
                <div
                  className="mt-1 p-3 rounded-lg bg-app-bg text-xs text-tx-secondary overflow-x-auto leading-relaxed border border-app-border max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
