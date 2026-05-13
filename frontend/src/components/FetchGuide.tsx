import React, { useState } from "react";
import { HelpCircle, Copy, Check, Terminal, Globe, Send, HelpCircle as HelpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FetchGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getExample1 = `// 例子 1: 最简单的 GET 请求
const res = await fetch("https://api.example.com/items");

// 将响应体解析为 JSON 对象
const data = await res.json();
console.log("请求成功:", data);`;

  const getExample2 = `// 例子 2: GET 请求携带自定义请求参数 (Query Params)
// 使用 URLSearchParams 对象：它会自动把参数处理成 keyword=value 形式，
// 并对中文或特殊字符（如空格、&、=）进行自动转码，安全又高效！
const params = new URLSearchParams({
  keyword: "人工智能",
  limit: "10",
  category: "tech"
});

// 拼接后的完整请求地址：https://api.example.com/search?keyword=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD&limit=10&category=tech
const res = await fetch(\`https://api.example.com/search?\${params}\`);
const data = await res.json();`;

  const getExample3 = `// 例子 3: 携带自定义请求头 (Headers) 的 GET 请求
const res = await fetch("https://api.example.com/user/profile", {
  method: "GET", // 默认为 GET，可省略
  headers: {
    "User-Agent": "Mozilla/5.0 (FeedHub)",
    "Authorization": "Bearer YOUR_SECRET_TOKEN", // 鉴权 Token
    "Accept": "application/json"
  }
});
const profile = await res.json();`;

  const postExample1 = `// 例子 4: 发送 JSON 数据的 POST 请求
const res = await fetch("https://api.example.com/posts", {
  method: "POST", // 声明为 POST 方法
  headers: {
    // 告诉服务器发送的数据是 JSON 格式（极为重要！）
    "Content-Type": "application/json", 
    "User-Agent": "Mozilla/5.0 (FeedHub)"
  },
  // 将 JavaScript 对象转换为 JSON 字符串作为请求体
  body: JSON.stringify({
    title: "探索 FeedHub",
    category: "tech",
    content: "这是一个非常棒的聚合订阅工具！"
  })
});

const result = await res.json();
console.log("创建成功:", result);`;

  return (
    <div className="space-y-4 border-t border-app-border pt-5 mt-4">
      {/* Title */}
      <div className="flex items-center gap-1.5 text-tx-primary">
        <HelpCircle size={14} className="text-accent-secondary" />
        <h5 className="text-xs font-semibold">Fetch 网络请求新手教程</h5>
      </div>

      <p className="text-xs text-tx-secondary leading-relaxed">
        <code className="px-1 py-0.5 rounded bg-app-surface border border-app-border font-mono text-[11px] text-accent-secondary">fetch()</code> 是现代 JavaScript 用于发送网络 HTTP 请求的标准方法。它基于 Promise，需要搭配 <code className="font-mono text-[11px] text-accent-secondary">await</code> 关键字使用。
      </p>

      {/* GET Tab Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-tx-primary">
          <Globe size={11} className="text-emerald-500" />
          <span>1. GET 方法（获取数据）</span>
        </div>
        <p className="text-xs text-tx-secondary leading-relaxed pl-4">
          用于从服务器获取信息。GET 请求的参数必须通过拼接在 URL 后面进行传递。
        </p>

        {/* GET Simple */}
        <div className="rounded-xl border border-app-border overflow-hidden bg-app-surface/20 pl-4 ml-4 border-l-2 border-l-emerald-500">
          <div className="px-3 py-1.5 border-b border-app-border bg-app-surface/40 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">GET - 基础获取</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(getExample1, 1)}
              className="w-5 h-5 rounded hover:bg-app-hover"
            >
              {copiedIndex === 1 ? <Check size={11} className="text-accent-secondary" /> : <Copy size={11} className="text-tx-tertiary" />}
            </Button>
          </div>
          <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-zinc-950/5 dark:bg-black/20 text-tx-secondary whitespace-pre">
            {getExample1}
          </pre>
        </div>

        {/* GET With Params */}
        <div className="rounded-xl border border-app-border overflow-hidden bg-app-surface/20 pl-4 ml-4 border-l-2 border-l-emerald-500">
          <div className="px-3 py-1.5 border-b border-app-border bg-app-surface/40 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">GET - 携带请求参数（最推荐）</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(getExample2, 2)}
              className="w-5 h-5 rounded hover:bg-app-hover"
            >
              {copiedIndex === 2 ? <Check size={11} className="text-accent-secondary" /> : <Copy size={11} className="text-tx-tertiary" />}
            </Button>
          </div>
          <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-zinc-950/5 dark:bg-black/20 text-tx-secondary whitespace-pre">
            {getExample2}
          </pre>
        </div>

        {/* GET Advanced Headers */}
        <div className="rounded-xl border border-app-border overflow-hidden bg-app-surface/20 pl-4 ml-4 border-l-2 border-l-emerald-500">
          <div className="px-3 py-1.5 border-b border-app-border bg-app-surface/40 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">GET - 自定义请求头 Headers</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(getExample3, 3)}
              className="w-5 h-5 rounded hover:bg-app-hover"
            >
              {copiedIndex === 3 ? <Check size={11} className="text-accent-secondary" /> : <Copy size={11} className="text-tx-tertiary" />}
            </Button>
          </div>
          <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-zinc-950/5 dark:bg-black/20 text-tx-secondary whitespace-pre">
            {getExample3}
          </pre>
        </div>
      </div>

      {/* POST Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-tx-primary">
          <Send size={11} className="text-blue-500" />
          <span>2. POST 方法（提交数据）</span>
        </div>
        <p className="text-xs text-tx-secondary leading-relaxed pl-4">
          用于向服务器发送并保存新数据。常用于调用第三方服务发送推送、创建文章。
        </p>

        {/* POST JSON */}
        <div className="rounded-xl border border-app-border overflow-hidden bg-app-surface/20 pl-4 ml-4 border-l-2 border-l-blue-500">
          <div className="px-3 py-1.5 border-b border-app-border bg-app-surface/40 flex items-center justify-between">
            <span className="text-[10px] font-mono text-blue-500 font-semibold">POST - 发送 JSON 报文</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(postExample1, 4)}
              className="w-5 h-5 rounded hover:bg-app-hover"
            >
              {copiedIndex === 4 ? <Check size={11} className="text-accent-secondary" /> : <Copy size={11} className="text-tx-tertiary" />}
            </Button>
          </div>
          <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-zinc-950/5 dark:bg-black/20 text-tx-secondary whitespace-pre">
            {postExample1}
          </pre>
        </div>
      </div>

      {/* Important summary */}
      <div className="p-3.5 rounded-xl border border-zinc-500/10 bg-zinc-500/5 dark:bg-zinc-500/10 space-y-1 pl-4 ml-4">
        <div className="flex items-center gap-1 text-tx-primary">
          <Terminal size={12} className="text-tx-secondary" />
          <span className="text-[11px] font-semibold">新手高频避坑要点</span>
        </div>
        <ul className="list-disc list-inside text-xs text-tx-secondary space-y-1">
          <li><strong>切记使用 await</strong>：网络请求是异步的，写成 <code className="font-mono text-[10px] px-1 bg-app-surface rounded">const res = await fetch(...)</code> 才能正确同步获取结果。</li>
          <li><strong>解析返回体</strong>：<code className="font-mono text-[10px]">res</code> 是响应信息流。需要使用 <code className="font-mono text-[10px]">await res.json()</code> 得到 JSON 对象，或使用 <code className="font-mono text-[10px]">await res.text()</code> 得到纯文本 HTML 内容。</li>
        </ul>
      </div>
    </div>
  );
}
