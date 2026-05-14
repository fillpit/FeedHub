import React, { useState } from "react";
import { BookOpen, Copy, Check, Info, Code, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RouteScriptHelp() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeExample1 = `// 示例 1: 使用 hub.http.get 抓取并返回完整 RSS
console.log("正在获取文章列表...");

const posts = await hub.http.get("https://api.example.com/posts", {
  category: params.category || "tech",
  limit: params.limit || 10
});

console.log(\`抓取完成，共获得 \${posts.length} 条数据\`);

// 构造并返回完整的 RSS 订阅源数据格式
return {
  title: params.feedTitle || "极速科技订阅",
  description: "自动聚合最新科技前沿资讯",
  link: "https://example.com/tech",
  items: posts.map(item => ({
    title: item.title,
    link: item.url,
    content: item.summary || "无摘要",
    pubDate: hub.date.parse(item.publishTime) // 自动智能解析任意网页时间格式
  }))
};`;

  const codeExample2 = `// 示例 2: 提交数据分析并组装完整 RSS 对象
console.log("准备向第三方服务发送请求...");

const result = await hub.http.post("https://api.example.com/analyze", {
  routeId: routeParams.id || "default",
  query: params.keyword || "AI"
});

if (!result.success) {
  console.error("数据分析失败:", result.errorMsg);
  return { title: "分析错误源", items: [] };
}

console.log("分析成功，生成订阅列表");

return {
  title: "AI 行业深度分析报告",
  description: "实时洞察人工智能前沿商业化趋势",
  link: "https://example.com/ai-report",
  items: result.data.items.map(i => ({
    title: i.name,
    link: i.targetUrl,
    author: i.creator,
    pubDate: hub.date.parse(i.dateStr)
  }))
};`;

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
          脚本的入口文件为 <code className="px-1 py-0.5 rounded bg-app-surface border border-app-border font-mono text-[11px] text-accent-primary">main.js</code>。脚本执行完毕后，<strong>必须通过 <code className="font-mono text-[11px] text-accent-primary font-bold">return &#123; title, link, description, items &#125;</code> 返回完整的 RSS 订阅源结构</strong>，其中 `items` 代表订阅源里的具体文章列表。
        </p>
      </div>

      {/* Global Variables */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-tx-primary">
          <Code size={14} className="text-tx-secondary" />
          <h5 className="text-xs font-semibold">可用沙箱全局变量</h5>
        </div>
        <div className="space-y-2">
          {/* hub */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">hub.http / hub.date</span>
              <span className="text-[10px] text-tx-tertiary">Object</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              内置的高级便捷网络与工具封装库。使用 <code className="px-1 rounded bg-app-surface font-mono text-[11px] text-tx-primary">hub.http.get / post</code> 可极速发起请求并解析 JSON。使用 <code className="px-1 rounded bg-app-surface font-mono text-[11px] text-tx-primary">hub.date.parse(str)</code> 可智能识别十/十三位时间戳、网页相对时间（如“刚刚”、“5分钟前”、“昨天”）以及中英文常见日期，自动转换为标准 ISO 格式供 RSS 的 pubDate 使用。
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

          {/* fetch */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">fetch(url, options)</span>
              <span className="text-[10px] text-tx-tertiary">Promise</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              标准的底层网络请求方法。支持自定义 Headers、Body 等，用于请求外部平台 API。
            </p>
          </div>

          {/* console */}
          <div className="p-3 rounded-lg border border-app-border bg-app-bg/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-tx-primary font-mono">console.log / warn / error</span>
              <span className="text-[10px] text-tx-tertiary">Function</span>
            </div>
            <p className="text-xs text-tx-secondary leading-relaxed">
              日志打印函数。支持传入任意对象或文本，所有输出信息会被自动捕获并展示在右侧的调试控制台中。
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
          <h5 className="text-xs font-semibold">RSS 完整结构规范</h5>
        </div>
        
        {/* 顶级源规范 */}
        <div className="overflow-x-auto rounded-xl border border-app-border mb-3">
          <div className="px-3 py-1.5 bg-app-surface/40 border-b border-app-border text-[11px] font-semibold text-tx-secondary">
            顶级订阅源属性 (RSS Channel)
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-app-border bg-app-surface/20 text-tx-secondary">
                <th className="p-2.5 font-semibold">属性名</th>
                <th className="p-2.5 font-semibold">类型</th>
                <th className="p-2.5 font-semibold">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border text-tx-secondary">
              <tr>
                <td className="p-2.5 font-mono text-tx-primary font-semibold">title</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">订阅源总标题（如：科技前沿资讯）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary">description</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">订阅源总描述（可选）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary">link</td>
                <td className="p-2.5">String</td>
                <td className="p-2.5">总站链接（可选）</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-tx-primary font-semibold text-accent-primary">items</td>
                <td className="p-2.5">Array</td>
                <td className="p-2.5 font-semibold">具体文章/条目列表（必填，见下表）</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* items 内部规范 */}
        <div className="overflow-x-auto rounded-xl border border-app-border">
          <div className="px-3 py-1.5 bg-app-surface/40 border-b border-app-border text-[11px] font-semibold text-tx-secondary">
            items 列表内部对象属性 (FeedItem)
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-app-border bg-app-surface/20 text-tx-secondary">
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
            <span className="text-[11px] font-semibold text-tx-secondary">范本 1: 极速抓取与完整 RSS 源 (GET)</span>
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
            <span className="text-[11px] font-semibold text-tx-secondary">范本 2: 提交分析与完整 RSS 源 (POST)</span>
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
    </div>
  );
}
