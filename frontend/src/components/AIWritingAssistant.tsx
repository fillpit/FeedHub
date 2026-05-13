import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, PenLine, RefreshCw, Shrink, Expand, Languages,
  FileText, HelpCircle, Wrench, Copy, Check, X,
  ArrowRight, Replace, Code2, LetterText, MessageSquarePlus, Send
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

type AIAction = "continue" | "rewrite" | "polish" | "shorten" | "expand" | "translate_en" | "translate_zh" | "summarize" | "explain" | "fix_grammar" | "format_markdown" | "format_code" | "custom";

interface AIWritingAssistantProps {
  selectedText: string;
  fullText: string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export default function AIWritingAssistant({
  selectedText,
  fullText,
  onInsert,
  onReplace,
  onClose,
  position,
}: AIWritingAssistantProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLTextAreaElement>(null);

  const actions: { id: AIAction; icon: React.ElementType; label: string; group: string }[] = [
    { id: "continue", icon: ArrowRight, label: t("ai.actionContinue"), group: "write" },
    { id: "rewrite", icon: PenLine, label: t("ai.actionRewrite"), group: "write" },
    { id: "polish", icon: Sparkles, label: t("ai.actionPolish"), group: "write" },
    { id: "shorten", icon: Shrink, label: t("ai.actionShorten"), group: "edit" },
    { id: "expand", icon: Expand, label: t("ai.actionExpand"), group: "edit" },
    { id: "fix_grammar", icon: Wrench, label: t("ai.actionFixGrammar"), group: "edit" },
    { id: "translate_zh", icon: Languages, label: t("ai.actionTranslateZh"), group: "translate" },
    { id: "translate_en", icon: Languages, label: t("ai.actionTranslateEn"), group: "translate" },
    { id: "summarize", icon: FileText, label: t("ai.actionSummarize"), group: "other" },
    { id: "explain", icon: HelpCircle, label: t("ai.actionExplain"), group: "other" },
    { id: "format_markdown", icon: LetterText, label: t("ai.actionFormatMarkdown"), group: "format" },
    { id: "format_code", icon: Code2, label: t("ai.actionFormatCode"), group: "format" },
  ];

  const handleAction = useCallback(async (action: AIAction, prompt?: string) => {
    setCurrentAction(action);
    setResult("");
    setError("");
    setIsLoading(true);
    setShowCustomInput(false);

    try {
      await api.aiChat(
        action,
        selectedText,
        fullText.slice(0, 2000),
        (chunk) => {
          setResult(prev => prev + chunk);
        },
        action === "custom" ? prompt : undefined
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || t("ai.requestFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [selectedText, fullText, t]);

  const handleCustomSubmit = useCallback(() => {
    if (!customPrompt.trim()) return;
    handleAction("custom", customPrompt.trim());
  }, [customPrompt, handleAction]);

  // 自动滚动到底部
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInsert = () => {
    onInsert(result);
    onClose();
  };

  const handleReplace = () => {
    onReplace(result);
    onClose();
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[60] w-[400px] max-h-[480px] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
      style={position ? { top: position.top, left: position.left } : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-accent-primary" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{t("ai.assistant")}</span>
          {currentAction && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              · {actions.find(a => a.id === currentAction)?.label}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* 选中文本预览 */}
      {selectedText && !result && !isLoading && (
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">{t("ai.selectedText")}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">{selectedText}</p>
        </div>
      )}

      {/* 动作按钮网格 */}
      {!result && !isLoading && !error && !showCustomInput && (
        <div className="p-2">
          <div className="grid grid-cols-2 gap-1">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-accent-primary transition-colors text-left"
                >
                  <Icon size={13} className="shrink-0" />
                  {action.label}
                </button>
              );
            })}
          </div>
          {/* 自定义指令入口 */}
          <div className="mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => { setShowCustomInput(true); setTimeout(() => customInputRef.current?.focus(), 50); }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-left"
            >
              <MessageSquarePlus size={13} className="shrink-0" />
              {t("ai.customAction")}
            </button>
          </div>
        </div>
      )}

      {/* 自定义指令输入框 */}
      {showCustomInput && !result && !isLoading && !error && (
        <div className="p-3">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-2">{t("ai.customHint")}</p>
          <textarea
            ref={customInputRef}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCustomSubmit();
              }
              if (e.key === "Escape") {
                setShowCustomInput(false);
                setCustomPrompt("");
              }
            }}
            placeholder={t("ai.customPlaceholder")}
            className="w-full h-20 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-accent-primary/50 focus:border-accent-primary/50 placeholder:text-zinc-400"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCustomSubmit}
              disabled={!customPrompt.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Send size={12} />
              {t("ai.customSend")}
            </button>
            <button
              onClick={() => { setShowCustomInput(false); setCustomPrompt(""); }}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 / 结果展示 */}
      {(isLoading || result) && (
        <div ref={resultRef} className="flex-1 overflow-auto px-3 py-3 min-h-[100px] max-h-[280px]">
          <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {result}
            {isLoading && (
              <span className="inline-block w-1.5 h-4 bg-accent-primary/60 animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
            <X size={13} />
            {error}
          </div>
        </div>
      )}

      {/* 底部操作栏 */}
      {(result && !isLoading) && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <button
            onClick={handleReplace}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Replace size={12} />
            {t("ai.replace")}
          </button>
          <button
            onClick={handleInsert}
            className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:border-accent-primary/50 hover:text-accent-primary transition-colors"
          >
            <ArrowRight size={12} />
            {t("ai.insertAfter")}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:border-accent-primary/50 hover:text-accent-primary transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? t("ai.copied") : t("ai.copy")}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { setResult(""); setError(""); setCurrentAction(null); setShowCustomInput(false); setCustomPrompt(""); }}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 transition-colors"
            title={t("ai.retry")}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
