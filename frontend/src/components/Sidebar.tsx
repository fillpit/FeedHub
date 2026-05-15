import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftClose, PanelLeft, Settings, LogOut, X, Bot, LayoutDashboard, User, Shield,
  Rss, Globe, KeyRound, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsModal from "@/components/SettingsModal";
import { useApp, useAppActions } from "@/store/AppContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ViewMode } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function Sidebar() {
  const { state } = useApp();
  const actions = useAppActions();
  const { siteConfig } = useSiteSettings();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const user = state.user;

  const rawNavItems: { icon: React.ReactNode; label: string; mode: ViewMode; active: boolean; badge?: string }[] = [
    { icon: <LayoutDashboard size={16} />, label: t('sidebar.dashboard', "仪表盘"), mode: "dashboard", active: state.viewMode === "dashboard" },
    { icon: <Bot size={16} />, label: "AI 秘书", mode: "ai-chat", active: state.viewMode === "ai-chat" },
  ];

  const feedNavItems: { icon: React.ReactNode; label: string; mode: ViewMode; active: boolean }[] = [
    { icon: <Globe size={16} />, label: "网页监控", mode: "feed-websites", active: state.viewMode === "feed-websites" },
    { icon: <Rss size={16} />, label: "动态路由", mode: "feed-routes", active: state.viewMode === "feed-routes" },
    { icon: <KeyRound size={16} />, label: "授权凭证", mode: "feed-credentials", active: state.viewMode === "feed-credentials" },
    { icon: <Package size={16} />, label: "NPM 包管理", mode: "feed-npm", active: state.viewMode === "feed-npm" },
  ];
  const navItems = rawNavItems;

  if (state.sidebarCollapsed) {
    return (
      <div className="hidden md:flex w-16 h-full bg-app-sidebar border-r border-app-border flex-col items-center py-4 gap-4 shrink-0 transition-all">
        {/* Toggle Button */}
        <div className="px-3 w-full">
          <Button variant="ghost" size="icon" onClick={actions.toggleSidebar} className="w-full text-tx-secondary hover:text-tx-primary hover:bg-app-hover">
            <PanelLeft size={18} />
          </Button>
        </div>

        <div className="w-8 h-px bg-app-border mx-auto" />

        {/* Navigation Icons */}
        <div className="flex-1 w-full px-2.5 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.mode}
              onClick={() => actions.setViewMode(item.mode)}
              title={item.label}
              className={cn(
                "flex items-center justify-center w-full aspect-square rounded-lg transition-colors",
                item.active
                  ? "bg-app-active text-tx-primary shadow-sm"
                  : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
              )}
            >
              {item.icon}
            </button>
          ))}
        </div>

        {/* Footer Icons */}
        <div className="w-full px-2.5 pb-2 space-y-2">
          <button
            onClick={() => setShowSettings(true)}
            title={t('sidebar.settings', "系统设置")}
            className="flex items-center justify-center w-full aspect-square rounded-lg text-tx-secondary hover:text-tx-primary hover:bg-app-hover transition-colors"
          >
            <Settings size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={user?.username || t('sidebar.user_menu', "用户菜单")}
              className="flex items-center justify-center w-full aspect-square rounded-xl border border-zinc-200/50 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-md hover:shadow-lg overflow-hidden"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-11 h-11 rounded-2xl object-cover shadow-xl ring-2 ring-white dark:ring-zinc-800 transition-all duration-300 group-hover:scale-105 group-hover:ring-accent-primary/50" />
              ) : (
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-accent-primary shadow-md group-hover:shadow-lg group-hover:border-accent-primary/30 transition-all">
                  <User size={24} />
                </div>
              )}
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 10 }}
                    className="absolute bottom-0 left-full ml-2 w-48 bg-app-sidebar border border-app-border rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-app-border bg-app-surface/50">
                      <p className="text-xs font-semibold text-tx-primary truncate">{user?.username}</p>
                      <p className="text-[10px] text-tx-tertiary truncate">{user?.email}</p>
                    </div>
                    <div className="p-1.5 border-b border-app-border space-y-1">
                      {user?.username === 'admin' && (
                        <button
                          onClick={() => {
                            actions.setViewMode('admin');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-tx-primary hover:bg-app-hover transition-colors"
                        >
                          <Shield size={14} className="text-rose-400" />
                          <span>{t('sidebar.controlPanel', "控制面板")}</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          localStorage.removeItem("nowen-token");
                          window.location.reload();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors"
                      >
                        <LogOut size={14} />
                        <span>{t('sidebar.logout', "退出登录")}</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full bg-app-sidebar border-r border-app-border flex flex-col shrink-0 transition-colors"
      style={{ width: undefined }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}>
        <h1 className="text-sm font-semibold text-tx-primary tracking-wide">{siteConfig.title}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={actions.toggleSidebar}>
            <PanelLeftClose size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => actions.setMobileSidebar(false)}>
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-2 mb-2">
          <span className="text-[10px] font-bold text-tx-tertiary uppercase tracking-widest opacity-60">
            主导航
          </span>
        </div>
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => {
              actions.setViewMode(item.mode);
              actions.setMobileSidebar(false);
            }}
            className={cn(
              "group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
              item.active
                ? "bg-app-active text-accent-primary shadow-sm"
                : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
            )}
          >
            {item.active && (
              <motion.div
                layoutId="nav-active"
                className="absolute left-0 w-1 h-5 bg-accent-primary rounded-r-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
            <div className={cn(
              "flex items-center justify-center transition-transform group-hover:scale-110",
              item.active ? "text-accent-primary" : "text-tx-tertiary group-hover:text-tx-primary"
            )}>
              {item.icon}
            </div>
            {item.label}
          </button>
        ))}

        {/* FeedHub 导航分组 */}
        <div className="px-2 mt-4 mb-2">
          <span className="text-[10px] font-bold text-tx-tertiary uppercase tracking-widest opacity-60">
            FeedHub
          </span>
        </div>
        {feedNavItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => {
              actions.setViewMode(item.mode);
              actions.setMobileSidebar(false);
            }}
            className={cn(
              "group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
              item.active
                ? "bg-app-active text-accent-primary shadow-sm"
                : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
            )}
          >
            {item.active && (
              <motion.div
                layoutId="nav-active-feed"
                className="absolute left-0 w-1 h-5 bg-accent-primary rounded-r-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
            <div className={cn(
              "flex items-center justify-center transition-transform group-hover:scale-110",
              item.active ? "text-accent-primary" : "text-tx-tertiary group-hover:text-tx-primary"
            )}>
              {item.icon}
            </div>
            {item.label}
          </button>
        ))}
      </div>

      {/* Footer: Settings + Logout */}
      <div className="border-t border-app-border px-3 py-2.5 flex items-center gap-2 mt-auto">
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-tx-secondary hover:text-tx-primary hover:bg-app-hover transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-app-hover group-hover:bg-accent-primary/10 flex items-center justify-center transition-colors">
            <Settings size={14} className="group-hover:text-accent-primary transition-colors" />
          </div>
          <span className="text-xs font-medium">{t('sidebar.settings', "系统设置")}</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={user?.username || t('sidebar.user_menu', "用户菜单")}
            className="w-9 h-9 rounded-2xl flex items-center justify-center border border-zinc-200/50 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all overflow-hidden shadow-md hover:shadow-lg"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-9 h-9 rounded-2xl object-cover shadow-lg ring-2 ring-white dark:ring-zinc-800 transition-all duration-300 group-hover:ring-accent-primary/50 group-hover:scale-105" />
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-accent-primary shadow-sm group-hover:shadow-md group-hover:border-accent-primary/30 transition-all">
                <User size={18} />
              </div>
            )}
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-app-sidebar border border-app-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-app-border bg-app-surface/50">
                    <p className="text-xs font-semibold text-tx-primary truncate">{user?.username}</p>
                    <p className="text-[10px] text-tx-tertiary truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5 border-b border-app-border space-y-1">
                    {user?.username === 'admin' && (
                      <button
                        onClick={() => {
                          actions.setViewMode('admin');
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-tx-primary hover:bg-app-hover transition-colors"
                      >
                        <Shield size={14} className="text-rose-400" />
                        <span>{t('sidebar.controlPanel', "控制面板")}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        localStorage.removeItem("nowen-token");
                        window.location.reload();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>{t('sidebar.logout', "退出登录")}</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}
