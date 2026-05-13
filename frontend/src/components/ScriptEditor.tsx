import React, { useEffect, useRef, useState, useCallback } from "react";
import { Save, FolderOpen, RefreshCw, FileCode2, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptFile } from "@/types/feed";
import { dynamicRouteApi } from "@/lib/feed-api";
import { cn } from "@/lib/utils";

interface Props {
  routeId: number;
  scriptFolder: string;
}

export default function ScriptEditor({ routeId, scriptFolder }: Props) {
  const [files, setFiles] = useState<ScriptFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const loadFiles = useCallback(async () => {
    const fileList = await dynamicRouteApi.listFiles(routeId);
    const onlyFiles = fileList.filter((f) => f.type === "file");
    setFiles(onlyFiles);
    if (onlyFiles.length > 0 && !activeFile) {
      const main = onlyFiles.find((f) => f.name === "main.js") ?? onlyFiles[0];
      setActiveFile(main.path);
    }
  }, [routeId, activeFile]);

  const loadFileContent = useCallback(async (filePath: string) => {
    const { content: c } = await dynamicRouteApi.getFileContent(routeId, filePath);
    setContent(c);
    setHasUnsavedChanges(false);
  }, [routeId]);

  useEffect(() => {
    if (!scriptFolder) return;
    loadFiles();
  }, [loadFiles, scriptFolder]);

  useEffect(() => {
    if (activeFile) loadFileContent(activeFile);
  }, [activeFile, loadFileContent]);

  const handleInitScript = async () => {
    setIsInitializing(true);
    try {
      await dynamicRouteApi.initScript(routeId);
      await loadFiles();
    } catch (e) {
      alert(e instanceof Error ? e.message : "初始化失败");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      await dynamicRouteApi.saveFileContent(routeId, activeFile, content);
      setHasUnsavedChanges(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = content.substring(0, start) + "  " + content.substring(end);
      setContent(newValue);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = start + 2;
          editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  if (!scriptFolder) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-4">
          <FileCode2 size={22} className="text-accent-primary" />
        </div>
        <h3 className="text-sm font-semibold text-tx-primary mb-1">脚本未初始化</h3>
        <p className="text-xs text-tx-tertiary mb-4">先初始化脚本目录，然后在此编辑脚本</p>
        <Button size="sm" onClick={handleInitScript} disabled={isInitializing} className="gap-1.5">
          {isInitializing ? <RefreshCw size={13} className="animate-spin" /> : <FilePlus size={13} />}
          初始化脚本
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-44 border-r border-app-border flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-app-border">
          <span className="text-[11px] text-tx-tertiary font-medium flex items-center gap-1">
            <FolderOpen size={12} />
            文件
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(file.path)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors",
                activeFile === file.path
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
              )}
            >
              {file.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-app-border bg-app-bg/50">
          <span className="text-[11px] text-tx-tertiary font-mono">{activeFile ?? ""}</span>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-[10px] text-amber-500">● 未保存</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="h-6 px-2 text-xs gap-1"
            >
              {isSaving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
              Cmd+S
            </Button>
          </div>
        </div>
        <textarea
          ref={editorRef}
          value={content}
          onChange={(e) => { setContent(e.target.value); setHasUnsavedChanges(true); }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs leading-relaxed resize-none outline-none"
          style={{ fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace" }}
        />
      </div>
    </div>
  );
}
