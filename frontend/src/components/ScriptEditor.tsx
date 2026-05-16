import React, { useEffect, useRef, useState, useCallback } from "react";
import { Save, FolderOpen, RefreshCw, FileCode2, FilePlus, Sparkles, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptFile } from "@/types/feed";
import { dynamicRouteApi } from "@/lib/feed-api";
import { cn } from "@/lib/utils";

interface Props {
  routeId: number;
  scriptFolder: string;
  onInit?: (folder: string) => void;
}

/**
 * 极简、高效、零依赖的 JavaScript 代码缩进格式化器
 */
function formatJsCode(code: string): string {
  const lines = code.split("\n");
  let indentLevel = 0;
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      // 限制最多保留 1 个连续空行
      if (formatted.length > 0 && formatted[formatted.length - 1] !== "") {
        formatted.push("");
      }
      continue;
    }

    // 若本行以闭括号开头，则在输出前先缩进减一级
    const startsWithClose = /^[}\])]/.test(line);
    if (startsWithClose) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    formatted.push("  ".repeat(indentLevel) + line);

    // 计算下一行的缩进层级变化
    const opens = (line.match(/[{[]/g) || []).length;
    const closes = (line.match(/[}\]]/g) || []).length;
    
    if (!startsWithClose) {
      indentLevel += (opens - closes);
    } else {
      indentLevel += opens - Math.max(0, closes - 1);
    }
    indentLevel = Math.max(0, indentLevel);
  }
  
  return formatted.join("\n").trim();
}

/**
 * 智能语法补全提示候选配置字典
 */
const AUTOCOMPLETE_SUGGESTIONS = [
  { label: "require", insertText: "require(\"./$0.js\")", desc: "导入同目录下的其他脚本模块或内置 Node 模块" },
  { label: "fetch", insertText: "await fetch($0)", desc: "发起异步 HTTP 网络请求" },
  { label: "params", insertText: "params", desc: "表单自定义配置项参数" },
  { label: "routeParams", insertText: "routeParams", desc: "路由路径参数 (动态路由参数)" },
  { label: "authInfo", insertText: "authInfo", desc: "关联的授权凭证(用户名/Token)" },
  { label: "URLSearchParams", insertText: "new URLSearchParams($0)", desc: "URL 查询参数序列化生成器" },
  { label: "console.log", insertText: "console.log($0);", desc: "在调试面板中进行审计打印" },
  { label: "JSON.stringify", insertText: "JSON.stringify($0)", desc: "将 JavaScript 对象转为 JSON 字符串" },
  { label: "JSON.parse", insertText: "JSON.parse($0)", desc: "解析 JSON 字符串为 JS 对象" },
  { label: "FeedItem", insertText: "{\n  title: $0,\n  link: \"\",\n  content: \"\"\n}", desc: "符合 FeedHub 标准的条目模板" },
  { label: "Promise.all", insertText: "await Promise.all($0)", desc: "并发执行多个 Promise 异步操作" },
];

/**
 * 极速、原生的 Token 隔离式 JavaScript 语法高亮引擎
 */
function highlightJs(code: string): string {
  if (!code) return "";
  
  // 1. 转义 HTML 实体，防止富文本穿透报错
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 为了避免注释、字符串里的文字重叠匹配关键字，我们使用占位符 Token 缓存隔离技术
  const tokens: { id: string; html: string }[] = [];
  let tokenCounter = 0;

  const saveToken = (className: string, content: string) => {
    const id = `___JS_HIGHLIGHT_TOKEN_${tokenCounter++}___`;
    tokens.push({
      id,
      html: `<span class="${className}">${content}</span>`
    });
    return id;
  };

  // 1. 统一提取并缓存注释与字符串（单次线性扫描，彻底防止 URL 中的 // 被误判为注释）
  const mixedRegex = /(\/\*[\s\S]*?(\*\/|$))|(\/\/.*)|("(\\.|[^"\\])*")|('(\\.|[^'\\])*')|(`(\\.|[^`\\])*`)/g;
  html = html.replace(mixedRegex, (match) => {
    if (match.startsWith("/*") || match.startsWith("//")) {
      return saveToken("text-zinc-400 dark:text-[#6a9955] italic font-normal", match);
    } else {
      return saveToken("text-amber-600 dark:text-[#ce9178]", match);
    }
  });

  // 4. 高亮数字
  html = html.replace(/\b(\d+)\b/g, (_, match) => {
    return saveToken("text-emerald-600 dark:text-[#b5cea8]", match);
  });

  // 5. 高亮核心 JS 关键字
  const keywords = /\b(const|let|var|function|return|try|catch|async|await|import|export|if|else|for|of|in|new|throw|instanceof|typeof|break|continue|default)\b/g;
  html = html.replace(keywords, (_, match) => {
    return saveToken("text-violet-600 dark:text-[#c586c0] font-bold", match);
  });

  // 6. 高亮沙箱全局注入变量与常用 API
  const globals = /\b(fetch|params|routeParams|authInfo|console|log|warn|error|require|Promise|JSON|Buffer|URL|URLSearchParams|process|env)\b/g;
  html = html.replace(globals, (_, match) => {
    return saveToken("text-cyan-600 dark:text-[#4fc1ff] font-semibold", match);
  });

  // 7. 高亮函数调用 (如 resolve(), map())
  html = html.replace(/\b(\w+)(?=\s*\()/g, (_, match) => {
    const forbidden = ["if", "for", "catch", "fetch", "require", "log", "warn", "error"];
    if (forbidden.includes(match)) return match;
    return saveToken("text-blue-600 dark:text-[#dcdcaa]", match);
  });

  // 倒序还原 Token，确保嵌套关系不被打乱
  for (let i = tokens.length - 1; i >= 0; i--) {
    html = html.replace(tokens[i].id, tokens[i].html);
  }

  return html;
}

export default function ScriptEditor({ routeId, scriptFolder, onInit }: Props) {
  const [files, setFiles] = useState<ScriptFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [matchingSuggestions, setMatchingSuggestions] = useState<typeof AUTOCOMPLETE_SUGGESTIONS>([]);
  
  // 新建文件自定义弹窗状态
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("utils.js");

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const validateSyntax = useCallback((code: string, filePath: string | null) => {
    if (!filePath || (!filePath.endsWith(".js") && !filePath.endsWith(".ts"))) {
      setSyntaxError(null);
      return true;
    }
    try {
      // 封装进异步函数块解析，可支持顶层 await / return 编译检查
      new Function(`return (async () => {
        ${code}
      })`);
      setSyntaxError(null);
      return true;
    } catch (err) {
      if (err instanceof SyntaxError) {
        setSyntaxError(err.message);
      } else {
        setSyntaxError(String(err));
      }
      return false;
    }
  }, []);

  // 匹配并过滤出当前输入单词对应的候选项
  const updateSuggestions = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastWordMatch = textBeforeCursor.match(/[\w.]+$/);
    const lastWord = lastWordMatch ? lastWordMatch[0] : "";

    if (!lastWord || lastWord.length < 1) {
      setMatchingSuggestions([]);
      return;
    }

    const matches = AUTOCOMPLETE_SUGGESTIONS.filter((sug) => 
      sug.label.toLowerCase().startsWith(lastWord.toLowerCase()) &&
      sug.label.toLowerCase() !== lastWord.toLowerCase()
    );

    setMatchingSuggestions(matches);
  }, []);

  // 插入自动补全项并重定向光标到占位符 $0 处
  const handleInsertSuggestion = (sug: typeof AUTOCOMPLETE_SUGGESTIONS[0]) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const text = content;

    const textBeforeCursor = text.slice(0, start);
    const lastWordMatch = textBeforeCursor.match(/[\w.]+$/);
    const lastWord = lastWordMatch ? lastWordMatch[0] : "";
    const wordStart = start - lastWord.length;

    const insertVal = sug.insertText;
    const placeholderIndex = insertVal.indexOf("$0");
    const cleanInsert = insertVal.replace("$0", "");

    const newValue = text.slice(0, wordStart) + cleanInsert + text.slice(start);
    setContent(newValue);
    setHasUnsavedChanges(true);
    validateSyntax(newValue, activeFile);
    setMatchingSuggestions([]);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = wordStart + (placeholderIndex !== -1 ? placeholderIndex : cleanInsert.length);
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
    }, 0);
  };

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
    validateSyntax(c, filePath);
    setMatchingSuggestions([]);
  }, [routeId, validateSyntax]);

  useEffect(() => {
    if (!scriptFolder) return;
    loadFiles();
  }, [loadFiles, scriptFolder]);

  useEffect(() => {
    if (activeFile) loadFileContent(activeFile);
  }, [activeFile, loadFileContent]);

  // NPM & RSSHub Import states
  const [isNpmInstalling, setIsNpmInstalling] = useState(false);
  const [isImportingRsshub, setIsImportingRsshub] = useState(false);
  const [rsshubRoute, setRsshubRoute] = useState("");

  const handleNpmInstall = async () => {
    setIsNpmInstalling(true);
    try {
      const res = await dynamicRouteApi.npmInstall(routeId);
      alert(res.success ? "安装成功！\n" + res.logs : "安装失败：\n" + res.logs);
    } catch (e: any) {
      alert("NPM 安装出错：" + e.message);
    } finally {
      setIsNpmInstalling(false);
    }
  };

  const submitImportRsshub = async () => {
    if (!rsshubRoute.trim()) return;
    setIsImportingRsshub(true);
    try {
      const res = await dynamicRouteApi.importRsshub(routeId, rsshubRoute.trim());
      await loadFiles();
      setActiveFile("main.js");
      setContent(res.code);
      setHasUnsavedChanges(false);
      alert("导入成功！");
    } catch (e: any) {
      alert("导入失败：" + e.message);
    } finally {
      setIsImportingRsshub(false);
      setRsshubRoute("");
    }
  };

  const handleInitScript = async () => {
    setIsInitializing(true);
    try {
      const res = await dynamicRouteApi.initScript(routeId);
      if (onInit) {
        onInit(res.folder);
      }
      await loadFiles();
    } catch (e) {
      alert(e instanceof Error ? e.message : "初始化失败");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setNewFileName("utils.js");
    setIsCreatingFile(true);
  };

  const submitCreateFile = async () => {
    const name = newFileName;
    if (!name || !name.trim()) return;
    // Allow package.json
    let cleanName = name.trim();
    if (!cleanName.endsWith(".js") && !cleanName.endsWith(".ts") && !cleanName.endsWith(".json")) {
      cleanName = `${cleanName}.js`;
    }
    if (files.some(f => f.name === cleanName)) {
      alert("文件名已存在");
      return;
    }
    try {
      let initCode = `// 模块：${cleanName}\nmodule.exports = {\n  \n};\n`;
      if (cleanName === "package.json") {
        initCode = `{\n  "name": "script",\n  "version": "1.0.0",\n  "dependencies": {\n    "cheerio": "*"\n  }\n}`;
      }
      await dynamicRouteApi.saveFileContent(routeId, cleanName, initCode);
      await loadFiles();
      setActiveFile(cleanName);
      setIsCreatingFile(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "新建失败");
    }
  };

  const handleDeleteFile = async (filePath: string, fileName: string) => {
    if (!confirm(`确定要删除文件 ${fileName} 吗？`)) return;
    try {
      await dynamicRouteApi.deleteFile(routeId, filePath);
      if (activeFile === filePath) {
        setActiveFile(null);
      }
      await loadFiles();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      let finalContent = content;
      // 仅对 JS/TS 代码文件在保存时进行自动格式化
      if (activeFile.endsWith(".js") || activeFile.endsWith(".ts")) {
        finalContent = formatJsCode(content);
        setContent(finalContent);
      }
      await dynamicRouteApi.saveFileContent(routeId, activeFile, finalContent);
      setHasUnsavedChanges(false);
      validateSyntax(finalContent, activeFile);
      setMatchingSuggestions([]);
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
      validateSyntax(newValue, activeFile);
      updateSuggestions(newValue, start + 2);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = start + 2;
          editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // 同步处理滚动：行号、高亮背景、TextArea 三者滚动对齐
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = target.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = target.scrollTop;
      highlightRef.current.scrollLeft = target.scrollLeft;
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

  const linesCount = Math.max(content.split("\n").length, 1);
  const hasPackageJson = files.some(f => f.name === "package.json");

  return (
    <div className="flex h-full relative">
      {/* 导入 RSSHub 弹窗 */}
      {isImportingRsshub && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-96 bg-app-elevated border border-app-border rounded-xl shadow-2xl p-4 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-semibold text-tx-primary mb-2 flex items-center gap-1">
              <Sparkles size={14} className="text-accent-primary" />
              通过 AI 导入 RSSHub 路由
            </h4>
            <p className="text-[11px] text-tx-tertiary mb-3">
              输入 RSSHub 官方文档中的路由（例如：/bilibili/user/dynamic/:uid/:routeParams?），AI 将尝试拉取源码并转换为主程序代码。
            </p>
            <input
              type="text"
              autoFocus
              value={rsshubRoute}
              onChange={(e) => setRsshubRoute(e.target.value)}
              placeholder="/bilibili/user/dynamic/:uid"
              className="w-full px-3 py-2 text-xs bg-app-surface border border-app-border rounded-lg text-tx-primary focus:outline-none focus:border-accent-primary mb-4 font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitImportRsshub();
                } else if (e.key === "Escape") {
                  setIsImportingRsshub(false);
                  setRsshubRoute("");
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setIsImportingRsshub(false); setRsshubRoute(""); }} className="h-8 text-xs">
                取消
              </Button>
              <Button size="sm" onClick={submitImportRsshub} disabled={!rsshubRoute.trim()} className="h-8 text-xs">
                确定导入
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新建脚本文件弹窗 */}
      {isCreatingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-80 bg-app-elevated border border-app-border rounded-xl shadow-2xl p-4 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-semibold text-tx-primary mb-2">新建文件</h4>
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="例如：utils.js 或 package.json"
              className="w-full px-3 py-2 text-xs bg-app-surface border border-app-border rounded-lg text-tx-primary focus:outline-none focus:border-accent-primary mb-4 font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitCreateFile();
                } else if (e.key === "Escape") {
                  setIsCreatingFile(false);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsCreatingFile(false)} className="h-8 text-xs">
                取消
              </Button>
              <Button size="sm" onClick={submitCreateFile} className="h-8 text-xs">
                确定
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Tree */}
      <div className="w-44 border-r border-app-border flex flex-col shrink-0 bg-app-surface/30 select-none">
        <div className="flex items-center justify-between px-3 py-2 border-b border-app-border">
          <span className="text-[11px] text-tx-tertiary font-medium flex items-center gap-1">
            <FolderOpen size={12} />
            文件
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenCreateDialog}
            className="w-5 h-5 text-tx-tertiary hover:text-tx-primary hover:bg-app-hover rounded"
            title="新建文件"
          >
            <Plus size={12} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {files.map((file) => (
            <div
              key={file.path}
              onClick={() => setActiveFile(file.path)}
              className={cn(
                "group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors cursor-pointer",
                activeFile === file.path
                  ? "bg-accent-primary/10 text-accent-primary font-medium"
                  : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
              )}
            >
              <span className="truncate flex-1">{file.name}</span>
              {file.name !== "main.js" && file.name !== "index.js" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.path, file.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-tx-tertiary hover:text-red-500 rounded transition-opacity shrink-0 ml-1"
                  title="删除文件"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 flex flex-col bg-app-bg overflow-hidden relative">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-app-border bg-app-surface/50 select-none shrink-0">
          <span className="text-[11px] text-tx-tertiary font-mono">{activeFile ?? ""}</span>
          <div className="flex items-center gap-2">
            {hasPackageJson && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNpmInstall}
                disabled={isNpmInstalling}
                className="h-6 px-2 text-xs gap-1 hover:bg-app-hover text-tx-secondary hover:text-tx-primary"
                title="根据 package.json 安装依赖"
              >
                {isNpmInstalling ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                安装依赖
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRsshubRoute(""); setIsImportingRsshub(true); }}
              className="h-6 px-2 text-[10px] gap-1 text-accent-primary border-accent-primary/20 hover:bg-accent-primary/10"
            >
              <Sparkles size={11} />
              AI 导入 RSSHub
            </Button>
            
            <div className="w-px h-3 bg-app-border mx-1" />

            {hasUnsavedChanges && (
              <span className="text-[10px] text-amber-500">● 未保存</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="h-6 px-2 text-xs gap-1 hover:bg-app-hover text-tx-secondary hover:text-tx-primary"
            >
              {isSaving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
              Cmd+S 保存
            </Button>
          </div>
        </div>

        {/* Editor Body with Ruler and Stacking Syntax Highlighter */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Synchronized Line Numbers Ruler */}
          <div
            ref={lineNumbersRef}
            className="w-12 py-4 select-none text-right pr-3 bg-app-surface/30 text-tx-tertiary font-mono text-xs overflow-hidden border-r border-app-border flex flex-col shrink-0"
            style={{ 
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace"
            }}
          >
            {Array.from({ length: linesCount }, (_, i) => (
              <div key={i} className="select-none text-[11px] font-mono shrink-0" style={{ height: "20px", lineHeight: "20px" }}>
                {i + 1}
              </div>
            ))}
          </div>

          {/* Stacking Textarea + Highlighting Context */}
          <div className="flex-1 h-full relative overflow-hidden bg-app-bg">
            {/* 1. Behind Layer: Rendered Syntactically Highlighted Code Block */}
            <pre
              ref={highlightRef}
              className="absolute inset-0 py-4 px-3 text-[11px] font-mono overflow-hidden pointer-events-none select-none text-tx-primary"
              style={{
                fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                lineHeight: "20px",
                tabSize: 2,
                whiteSpace: "pre",
                margin: 0,
              }}
              dangerouslySetInnerHTML={{ __html: highlightJs(content) }}
            />

            {/* 2. In Front Layer: Transparent Input TextArea */}
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => {
                const val = e.target.value;
                const pos = e.target.selectionStart;
                setContent(val);
                setHasUnsavedChanges(true);
                validateSyntax(val, activeFile);
                updateSuggestions(val, pos);
              }}
              onSelect={(e) => {
                const pos = e.currentTarget.selectionStart;
                updateSuggestions(content, pos);
              }}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              spellCheck={false}
              wrap="off"
              className="absolute inset-0 py-4 px-3 bg-transparent text-transparent caret-accent-primary font-mono text-[11px] resize-none outline-none overflow-auto"
              style={{ 
                fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                lineHeight: "20px",
                tabSize: 2,
                whiteSpace: "pre"
              }}
            />
          </div>
        </div>

        {/* Floating Intellisense Auto-completion Widget */}
        {matchingSuggestions.length > 0 && (
          <div className="absolute bottom-12 right-4 bg-app-elevated/95 border border-app-border rounded-xl shadow-xl p-1.5 w-64 flex flex-col gap-1 z-10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-48 overflow-hidden select-none">
            <div className="text-[10px] text-tx-tertiary px-1.5 py-1 border-b border-app-border flex justify-between items-center font-sans font-medium">
              <span className="flex items-center gap-1">
                <Sparkles size={10} className="text-accent-primary" />
                智能代码补全 (点击插入)
              </span>
              <span className="text-[9px] bg-accent-primary/10 text-accent-primary px-1 rounded scale-90">Intellisense</span>
            </div>
            <div className="flex flex-col overflow-y-auto max-h-36 pr-0.5">
              {matchingSuggestions.map((sug) => (
                <button
                  key={sug.label}
                  onClick={() => handleInsertSuggestion(sug)}
                  className="w-full text-left px-2 py-1.5 hover:bg-app-hover rounded-lg flex flex-col transition-colors group cursor-pointer"
                >
                  <span className="text-xs font-mono font-semibold text-accent-primary group-hover:text-accent-primary/80">
                    {sug.label}
                  </span>
                  <span className="text-[10px] text-tx-tertiary font-sans mt-0.5 truncate w-full">
                    {sug.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Diagnostics Status Bar */}
        {syntaxError ? (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2 text-[11px] text-red-500 font-mono select-text shrink-0">
            <span className="font-bold">⚠️ 语法错误:</span>
            <span>{syntaxError}</span>
          </div>
        ) : (
          <div className="px-4 py-1.5 bg-app-surface/30 border-t border-app-border flex items-center justify-between text-[10px] text-tx-tertiary select-none shrink-0 font-mono">
            <div className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              语法诊断正常
            </div>
            <div>
              Lines: {linesCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
