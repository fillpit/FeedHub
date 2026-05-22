import React, { useState, useCallback } from "react";
import { Play, BookOpen, Wand2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { DynamicRoute } from "@/types/feed";
import ScriptEditor from "./ScriptEditor";
import RouteDebugDrawer from "./RouteDebugDrawer";
import RouteScriptHelp from "./RouteScriptHelp";
import CurlConverter from "./CurlConverter";

interface Props {
  readonly route: DynamicRoute;
  readonly onClose: () => void;
  readonly onSave?: () => void;
}

interface TabsHeaderProps {
  readonly activeTab: "debug" | "help" | "curl";
  readonly onTabChange: (tab: "debug" | "help" | "curl") => void;
}

function SidebarTabsHeader({ activeTab, onTabChange }: TabsHeaderProps) {
  const tabs = [
    { key: "debug", label: "在线调试", icon: Play },
    { key: "help", label: "编写说明", icon: BookOpen },
    { key: "curl", label: "cURL转换", icon: Wand2 },
  ] as const;

  return (
    <div className="flex border-b border-app-border bg-app-surface/30 select-none shrink-0">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === key
              ? "border-accent-primary text-accent-primary bg-app-surface/10"
              : "border-transparent text-tx-tertiary hover:text-tx-secondary hover:bg-app-hover/30"
          }`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

interface SidebarPaneProps {
  readonly route: DynamicRoute;
  readonly activeTab: "debug" | "help" | "curl";
  readonly onTabChange: (tab: "debug" | "help" | "curl") => void;
}

function SidebarPane({ route, activeTab, onTabChange }: SidebarPaneProps) {
  if (!route.script.folder) return null;
  return (
    <div className="w-[380px] h-full shrink-0 overflow-hidden flex flex-col bg-app-surface/10">
      <SidebarTabsHeader activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <div className={activeTab !== "debug" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
          <RouteDebugDrawer
            key={route.id}
            routeId={route.id}
            routeParams={route.params ?? []}
            routePath={route.path}
          />
        </div>
        <div className={activeTab !== "help" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
          <RouteScriptHelp />
        </div>
        <div className={activeTab !== "curl" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
          <CurlConverter />
        </div>
      </div>
    </div>
  );
}

export default function DynamicRouteScriptDialog({ route, onClose, onSave }: Props) {
  const [currentRoute, setCurrentRoute] = useState<DynamicRoute>(route);
  const [activeTab, setActiveTab] = useState<"debug" | "help" | "curl">("debug");

  const handleScriptInit = useCallback((folder: string) => {
    setCurrentRoute((prev) => ({
      ...prev,
      script: { ...prev.script, folder },
    }));
    if (onSave) onSave();
  }, [onSave]);

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      size="6xl"
      className="h-[85vh] max-h-[850px]"
      title={`脚本编辑与调试 · ${currentRoute.name}`}
      description={`路径: ${currentRoute.path}`}
      bodyClassName="flex divide-x divide-app-border overflow-hidden"
    >
      <div className="flex-1 h-full overflow-hidden">
        <ScriptEditor
          routeId={currentRoute.id}
          scriptFolder={currentRoute.script.folder}
          onInit={handleScriptInit}
        />
      </div>
      <SidebarPane route={currentRoute} activeTab={activeTab} onTabChange={setActiveTab} />
    </Dialog>
  );
}
