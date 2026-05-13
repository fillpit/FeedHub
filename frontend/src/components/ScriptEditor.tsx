import React, { useEffect, useRef, useState, useCallback } from "react";
import { Save, FolderOpen, RefreshCw, FileCode2, FilePlus, Sparkles } from "lucide-react";
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

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-44 border-r border-app-border flex flex-col shrink-0 bg-app-surface/30 select-none">
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
                  ? "bg-accent-primary/10 text-accent-primary font-medium"
                  : "text-tx-secondary hover:bg-app-hover hover:text-tx-primary"
              )}
            >
              {file.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 flex flex-col bg-app-bg overflow-hidden relative">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-app-border bg-app-surface/50 select-none shrink-0">
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
            className="w-12 py-4 select-none text-right pr-3 bg-zinc-100/50 dark:bg-zinc-900/30 text-zinc-400/80 font-mono text-xs overflow-hidden border-r border-app-border flex flex-col shrink-0"
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
          <div className="flex-1 h-full relative overflow-hidden bg-zinc-50 dark:bg-[#1e1e1e]">
            {/* 1. Behind Layer: Rendered Syntactically Highlighted Code Block */}
            <pre
              ref={highlightRef}
              className="absolute inset-0 py-4 px-3 text-[11px] font-mono overflow-hidden pointer-events-none select-none text-zinc-800 dark:text-[#d4d4d4]"
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
              className="absolute inset-0 py-4 px-3 bg-transparent text-transparent caret-zinc-800 dark:caret-[#d4d4d4] font-mono text-[11px] resize-none outline-none overflow-auto"
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
