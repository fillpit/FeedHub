import React, { useState } from "react";
import { Play, BookOpen, Wand2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { DynamicRoute } from "@/types/feed";
import ScriptEditor from "./ScriptEditor";
import RouteDebugDrawer from "./RouteDebugDrawer";
import RouteScriptHelp from "./RouteScriptHelp";
import CurlConverter from "./CurlConverter";

interface Props {
  route: DynamicRoute;
  onClose: () => void;
  onSave?: () => void;
}

export default function DynamicRouteScriptDialog({ route, onClose, onSave }: Props) {
  const [currentRoute, setCurrentRoute] = useState<DynamicRoute>(route);
  const [activeTab, setActiveTab] = useState<"debug" | "help" | "curl">("debug");

  const handleScriptInit = (folder: string) => {
    setCurrentRoute((prev) => ({
      ...prev,
      script: { ...prev.script, folder },
    }));
    if (onSave) onSave();
  };

  const isScriptInitialized = !!currentRoute.script.folder;

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
      {/* Left Column: Script Editor */}
      <div className="flex-1 h-full overflow-hidden">
        <ScriptEditor
          routeId={currentRoute.id}
          scriptFolder={currentRoute.script.folder}
          onInit={handleScriptInit}
        />
      </div>

      {/* Right Column: Route Debugger / Writing Help */}
      {isScriptInitialized && (
        <div className="w-[380px] h-full shrink-0 overflow-hidden flex flex-col bg-app-surface/10">
          {/* Tabs Header */}
          <div className="flex border-b border-app-border bg-app-surface/30 select-none shrink-0">
            <button
              onClick={() => setActiveTab("debug")}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "debug"
                  ? "border-accent-primary text-accent-primary bg-app-surface/10"
                  : "border-transparent text-tx-tertiary hover:text-tx-secondary hover:bg-app-hover/30"
              }`}
            >
              <Play size={13} />
              在线调试
            </button>
            <button
              onClick={() => setActiveTab("help")}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "help"
                  ? "border-accent-primary text-accent-primary bg-app-surface/10"
                  : "border-transparent text-tx-tertiary hover:text-tx-secondary hover:bg-app-hover/30"
              }`}
            >
              <BookOpen size={13} />
              编写说明
            </button>
            <button
              onClick={() => setActiveTab("curl")}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === "curl"
                  ? "border-accent-primary text-accent-primary bg-app-surface/10"
                  : "border-transparent text-tx-tertiary hover:text-tx-secondary hover:bg-app-hover/30"
              }`}
            >
              <Wand2 size={13} />
              cURL转换
            </button>
          </div>

          {/* Tabs Body */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <div className={activeTab !== "debug" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
              <RouteDebugDrawer routeId={currentRoute.id} routeParams={currentRoute.params ?? []} />
            </div>
            <div className={activeTab !== "help" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
              <RouteScriptHelp />
            </div>
            <div className={activeTab !== "curl" ? "hidden" : "flex-1 flex flex-col overflow-hidden"}>
              <CurlConverter />
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
