import React, { useState } from "react";
import { Palette, Shield, Settings, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import SecuritySettings from "@/components/SecuritySettings";
import AppearancePanel from "@/components/AppearancePanel";
import NotificationSettingsPanel from "@/components/NotificationSettingsPanel";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";
import { Dialog } from "./ui/dialog";
import { AnimatePresence, motion } from "framer-motion";

type TabId = "appearance" | "notification" | "security";

interface SettingsModalProps {
  onClose: () => void;
  defaultTab?: TabId;
}

export default function SettingsModal({ onClose, defaultTab = "appearance" }: SettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const { siteConfig } = useSiteSettings();

  const SETTING_TABS = [
    { id: "appearance" as const, label: t('settings.appearance'), icon: Palette },
    { id: "notification" as const, label: t('settings.notification'), icon: Bell },
    { id: "security" as const, label: t('settings.security'), icon: Shield },
  ];

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      size="6xl"
      className="h-[80vh] min-h-[500px] max-md:h-full max-md:rounded-none"
      bodyClassName="flex flex-col md:flex-row h-full"
    >
      {/* 移动端：顶部标签栏 */}
      <div className="md:hidden flex items-center border-b border-app-border bg-app-sidebar shrink-0 overflow-x-auto no-scrollbar p-2">
        {SETTING_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                isActive
                  ? "bg-app-active text-accent-primary"
                  : "text-tx-secondary active:bg-app-hover"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 桌面端：左侧导航栏 */}
      <div className="hidden md:flex w-56 flex-shrink-0 bg-app-sidebar border-r border-app-border p-4 flex-col">
        <div className="flex items-center gap-2 mb-6 px-2">
          <Settings className="w-4 h-4 text-tx-secondary" />
          <span className="font-bold text-sm text-tx-primary">{t('settings.title')}</span>
        </div>

        <nav className="flex-1 space-y-0.5">
          {SETTING_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-app-active text-accent-primary"
                    : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-app-border px-2">
          <p className="text-xs text-tx-tertiary">{siteConfig.title} v1.0.0</p>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "appearance" && <AppearancePanel />}
            {activeTab === "notification" && <NotificationSettingsPanel />}
            {activeTab === "security" && <SecuritySettings />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Dialog>
  );
}
