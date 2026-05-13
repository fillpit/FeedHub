import React, { useState } from "react";
import { BookOpen, Copy, Check, Info, Code, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import FetchGuide from "./FetchGuide";

export default function RouteScriptHelp() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeExample1 = `// 示例 1: 请求外部 JSON 接口并转换输出
try {
  const res = await fetch("https://api.github.com/repos/trending");
  const data = await res.json();
  
  // 映射成 FeedItem 数组并返回
  return data.map(item => ({
    title: item.name,
    link: item.html_url,
    content: item.description || "无描述",
    author: item.owner?.login,
    pubDate: new Date().toISOString()
  }));
} catch (err) {
  console.error("执行脚本失败: " + err.message);
  return [];
}`;

  const codeExample2 = `// 示例 2: 使用自定义请求参数 params
const limit = Number(params.limit || 10);
const category = params.category || "tech";

const res = await fetch(\`https://api.example.com/posts?cat=\${category}&limit=\${limit}\`);
const { posts } = await res.json();

return posts.map(p => ({
  title: p.title,
  link: p.url,
  content: p.body,
  pubDate: p.createdAt
}));`;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6 select-text hide-scrollbar">
      {/* Introduction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-tx-primary">
          <BookOpen size={16} className="text-accent-primary" />
          <h4 className="text-sm font-semibold">动态脚本开发说明</h4>
        </div>
        <p className="text-xs text-tx-secondary leading-relaxed">
          FeedHub 支持编写原生的 JavaScript 代码来抓取任意的 API 接口，并清洗、转换输出标准的 RSS/JSON 格式订阅源。
        </p>
      </div>

      {/* Basic Concept */}
      <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/5 dark:bg-blue-500/10 space-y-1.5">
        <div className="flex items-center gap-1.5 text-accent-primary">
          <Info size={14} />
          <span className="text-xs font-semibold">核心概念</span>
        </div>
        <p className="text-xs text-tx-secondary leading-relaxed">
          脚本的入口文件为 <code className="px-1 py-0.5 rounded bg-app-surface border border-app-border font-mono text-[11px] text-accent-primary">main.js</code>。脚本执行完毕后，<strong>必须通过 <code className="font-mono text-[11px] text-accent-primary font-bold">return [...]</code> 返回一个对象数组</strong>，每个对象代表订阅源里的一个条目。
        </p>
      </div>

      {/* Global Variables */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-tx-primary">
          <Code size={14} className="text-tx-secondary" />
          <h5 className="text-xs font-semibold">可用沙箱全局变量</h5>
        </div>
        <div className="space-y-2">
          {/* fetch */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">fetch(url, options)</span>
              <span className="text-[10px] text-tx-tertiary">Promise</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              标准的网络请求方法。支持 GET、POST 等，可自定义 Headers、Body 等，用于请求外部平台 API。
            </p>
          </div>

          {/* params */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">params</span>
              <span className="text-[10px] text-tx-tertiary">Object</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              用户在前台配置中配置的**自定义请求参数**。例如输入框限制 `limit` 将作为键值映射在 <code className="px-1 rounded bg-app-surface font-mono text-[11px] text-tx-primary">params.limit</code> 中。
            </p>
          </div>

          {/* routeParams */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">routeParams</span>
              <span className="text-[10px] text-tx-tertiary">Object</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              动态路由路径中的占位通配符。例如配置路径为 <code className="font-mono text-[11px]">/user/:id</code> 时，请求 <code className="font-mono text-[11px]">/user/999</code> 即可通过 <code className="font-mono text-[11px] text-tx-primary bg-app-surface px-1">routeParams.id</code> 拿到 <code className="font-mono text-[11px]">"999"</code>。
            </p>
          </div>

          {/* authInfo */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">authInfo</span>
              <span className="text-[10px] text-tx-tertiary">Object | null</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              若在路由表单中选择了关联的**授权凭证**，其配置的所有核心解密后键值对（如 API Key、Cookie、Password）会自动绑定到此变量中。
            </p>
          </div>

          {/* console */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">console.log / warn / error</span>
              <span className="text-[10px] text-tx-tertiary">Function</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              日志打印函数。所有输出信息会被自动捕获，并实时展示在右侧的调试控制台中。
            </p>
          </div>
        </div>
      </div>

      {/* Allowed Modules */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-tx-primary">
          <ShieldCheck size={14} className="text-tx-secondary" />
          <h5 className="text-xs font-semibold">安全支持的内置 Node 模块</h5>
        </div>
        <p className="text-xs text-tx-secondary leading-relaxed">
          允许通过 <code className="font-mono text-[11px] text-accent-primary">require("模块名")</code> 导入以下核心底层类库来进行高级数据处理：
        </p>
        <div className="flex flex-wrap gap-1.5">
          {["crypto", "url", "querystring", "path", "util"].map((m) => (
            <span key={m} className="px-2 py-0.5 rounded-md text-[11px] font-mono border border-app-border bg-app-surface text-tx-primary">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Return Schema */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-tx-primary">
          <HelpCircle size={14} className="text-tx-secondary" />
          <h5 className="text-xs font-semibold">FeedItem 返回字段规范</h5>
        </div>
        <div className="overflow-x-auto rounded-xl border border-app-border">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-app-border bg-app-surface/50 text-tx-secondary">
                <th className="p-2.5 font-semibold">属性名</th>
                <th className="p-2.5 font-semibold">类型</th>
                <th className="p-2.5 font-semibold">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border text-tx-secondary">
              <tr>
                <td className="p-2.5 font-mono text-tx-primary font-semibold">title</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">条目名称（必填）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary font-semibold">link</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">原文链接 / URL（必填）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary">content</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">条目的富文本正文描述（可选）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary">author</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">作者姓名（可选）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary">pubDate</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">发布日期（支持 ISO/GMT 字符串，可选）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary">guid</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">唯一标识符（默认自动取 link，可选）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Examples */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-tx-primary">
          <Code size={14} className="text-tx-secondary" />
          <h5 className="text-xs font-semibold">常用代码范本</h5>
        </div>

        {/* Example 1 */}
        <div className="rounded-xl border border-app-border overflow-hidden bg-app-surface/20">
          <div className="px-4 py-2 border-b border-app-border bg-app-surface/40 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-tx-secondary">范本 1: 标准 JSON 转换</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(codeExample1, 1)}
              className="w-6 h-6 rounded hover:bg-app-hover"
            >
              {copiedIndex === 1 ? <Check size={12} className="text-accent-secondary" /> : <Copy size={12} className="text-tx-tertiary" />}
            </Button>
          </div>
          <pre className="p-4 overflow-x-auto text-[10px] font-mono leading-relaxed bg-zinc-950/5 dark:bg-black/20 text-tx-secondary whitespace-pre">
            {codeExample1}
          </pre>
        </div>

        {/* Example 2 */}
        <div className="rounded-xl border border-app-border overflow-hidden bg-app-surface/20">
          <div className="px-4 py-2 border-b border-app-border bg-app-surface/40 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-tx-secondary">范本 2: 动态读取自定义参数</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(codeExample2, 2)}
              className="w-6 h-6 rounded hover:bg-app-hover"
            >
              {copiedIndex === 2 ? <Check size={12} className="text-accent-secondary" /> : <Copy size={12} className="text-tx-tertiary" />}
            </Button>
          </div>
          <pre className="p-4 overflow-x-auto text-[10px] font-mono leading-relaxed bg-zinc-950/5 dark:bg-black/20 text-tx-secondary whitespace-pre">
            {codeExample2}
          </pre>
        </div>
      </div>

      {/* Fetch Beginner Tutorial */}
      <FetchGuide />
    </div>
  );
}
