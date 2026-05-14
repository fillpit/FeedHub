import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Activity, CheckCircle2, XCircle, RefreshCw,
  Github, ExternalLink, Code2, Server, Database, Cpu
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { getServerUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const FRONTEND_VERSION = "v0.0.1";
const REPO_URL = "https://github.com/fillpit/FeedHub";
const DOCS_URL = "https://github.com/fillpit/FeedHub#readme";

interface SystemHealth {
  status: string;
  version: string;
}

export default function AboutPanel() {
  const { siteConfig } = useSiteSettings();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    const serverUrl = getServerUrl();
    const baseUrl = serverUrl ? `${serverUrl}/api` : "/api";
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ status: "error", version: "未知" });
      }
    } catch {
      setHealth({ status: "offline", version: "连接失败" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <HeaderBanner title={siteConfig.title} favicon={siteConfig.favicon} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatusSection health={health} loading={loading} onRefresh={fetchHealth} />
        <LinksSection />
      </div>
      <TechStackSection />
      <FooterSection />
    </div>
  );
}

function HeaderBanner({ title, favicon }: { title: string; favicon: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-accent-primary/10 via-indigo-500/10 to-purple-500/10 border border-app-border p-8 shadow-sm">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-6 relative z-10">
        <div className="w-16 h-16 rounded-3xl bg-app-surface border border-app-border flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
          {favicon ? (
            <img src={favicon} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Sparkles className="w-8 h-8 text-accent-primary" />
          )}
        </div>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-tx-primary truncate">{title}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20 text-xs font-bold shrink-0">
              {FRONTEND_VERSION}
            </span>
          </div>
          <p className="text-sm text-tx-secondary">现代化多源信息聚合与自动化流程管理平台</p>
        </div>
      </div>
    </div>
  );
}

function StatusSection({
  health,
  loading,
  onRefresh
}: {
  health: SystemHealth | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const isOk = health?.status === "ok";

  return (
    <div className="bg-app-surface rounded-3xl border border-app-border p-6 shadow-sm space-y-6 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-tx-primary">系统运行状态</h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-app-hover text-tx-tertiary hover:text-tx-primary transition-colors disabled:opacity-50"
          title="刷新状态"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-app-bg border border-app-border space-y-2">
          <span className="text-[11px] font-bold text-tx-tertiary uppercase tracking-wider">前端应用</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm font-bold text-tx-primary truncate">{FRONTEND_VERSION}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-app-bg border border-app-border space-y-2">
          <span className="text-[11px] font-bold text-tx-tertiary uppercase tracking-wider">核心服务 (API)</span>
          <div className="flex items-center gap-2">
            {loading ? (
              <RefreshCw className="w-4 h-4 text-tx-tertiary animate-spin shrink-0" />
            ) : isOk ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="text-sm font-bold text-tx-primary truncate">
              {loading ? "检测中" : health?.version || "未连接"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-tx-tertiary px-1">
        <span className={cn("w-2 h-2 rounded-full shrink-0", isOk ? "bg-emerald-500" : "bg-rose-500")} />
        <span className="truncate">{isOk ? "各项系统服务正常运行中" : "后端服务连接异常，请检查网络或后端进程"}</span>
      </div>
    </div>
  );
}

function LinksSection() {
  return (
    <div className="bg-app-surface rounded-3xl border border-app-border p-6 shadow-sm space-y-6 flex flex-col justify-between">
      <div className="flex items-center gap-2.5">
        <Github className="w-5 h-5 text-purple-500" />
        <h2 className="text-base font-bold text-tx-primary">项目资源与支持</h2>
      </div>
      <p className="text-xs text-tx-secondary leading-relaxed">
        本项目开源发布，欢迎查看源码、提出问题或贡献代码。查阅帮助文档获取完整配置指南。
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-app-bg hover:bg-app-hover border border-app-border text-tx-primary font-bold text-xs transition-all shadow-sm"
        >
          <Github className="w-4 h-4" />
          GitHub 仓库
        </a>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-accent-primary hover:bg-accent-primary/90 text-white font-bold text-xs transition-all shadow-sm shadow-accent-primary/20"
        >
          <ExternalLink className="w-4 h-4" />
          查看文档
        </a>
      </div>
    </div>
  );
}

function TechStackSection() {
  const stack = [
    { name: "React 18", desc: "前端视图层框架", icon: <Code2 className="w-5 h-5 text-cyan-500" /> },
    { name: "Vite", desc: "下一代极速构建工具", icon: <Cpu className="w-5 h-5 text-purple-500" /> },
    { name: "Hono", desc: "超高性能 Web 框架", icon: <Server className="w-5 h-5 text-orange-500" /> },
    { name: "SQLite", desc: "轻量级可靠数据库", icon: <Database className="w-5 h-5 text-blue-500" /> },
    { name: "Tailwind CSS", desc: "原子化样式引擎", icon: <Code2 className="w-5 h-5 text-teal-500" /> },
    { name: "Lucide", desc: "精美图标集", icon: <Sparkles className="w-5 h-5 text-indigo-500" /> },
  ];

  return (
    <div className="bg-app-surface rounded-3xl border border-app-border p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2.5">
        <Cpu className="w-5 h-5 text-teal-500" />
        <h2 className="text-base font-bold text-tx-primary">技术架构与生态</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stack.map((item) => (
          <div key={item.name} className="flex items-center gap-4 p-4 rounded-2xl bg-app-bg border border-app-border hover:border-tx-tertiary transition-all">
            <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center shrink-0 shadow-sm">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-tx-primary truncate">{item.name}</p>
              <p className="text-xs text-tx-tertiary truncate mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterSection() {
  return (
    <div className="text-center space-y-2 pt-4">
      <p className="text-xs text-tx-tertiary">
        Released under the MIT License · Copyright &copy; {new Date().getFullYear()} FeedHub Team
      </p>
    </div>
  );
}
