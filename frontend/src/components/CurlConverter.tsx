import React, { useState } from "react";
import { ArrowDown, Copy, Check, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils";

export default function CurlConverter() {
  const [curlInput, setCurlInput] = useState("");
  const [outputCode, setOutputCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleConvert = () => {
    if (!curlInput || !curlInput.trim()) {
      setOutputCode("");
      return;
    }
    const str = curlInput.trim();
    let method = "GET";
    let url = "";
    const headers: Record<string, string> = {};
    let bodyStr: string | null = null;

    // 1. 提取 URL
    const urlMatch = str.match(/https?:\/\/[^\s"'()]+/);
    if (urlMatch) {
      url = urlMatch[0].replace(/['"]$/, "");
    }

    // 2. 提取 Method (-X POST, -X GET, 等)
    const methodMatch = str.match(/-X\s+([A-Z]+)/);
    if (methodMatch) {
      method = methodMatch[1];
    }

    // 3. 提取 Headers (-H "Key: Value")
    const headerRegex = /(?:-H|--header)\s+(['"])(.*?)\1/g;
    let match;
    while ((match = headerRegex.exec(str)) !== null) {
      const part = match[2];
      const colonIndex = part.indexOf(":");
      if (colonIndex !== -1) {
        const k = part.substring(0, colonIndex).trim();
        const v = part.substring(colonIndex + 1).trim();
        if (k) headers[k] = v;
      }
    }

    // 3.5 提取 Cookie (-b, --cookie)
    const cookieRegex = /(?:-b|--cookie)\s+(['"])(.*?)\1/g;
    let cookieMatch;
    while ((cookieMatch = cookieRegex.exec(str)) !== null) {
      const cookieStr = cookieMatch[2].trim();
      if (cookieStr) {
        if (headers["Cookie"]) {
          headers["Cookie"] += `; ${cookieStr}`;
        } else if (headers["cookie"]) {
          headers["cookie"] += `; ${cookieStr}`;
        } else {
          headers["Cookie"] = cookieStr;
        }
      }
    }

    // 4. 提取 Body (-d, --data, --data-raw, --data-binary)
    const dataRegex = /(?:-d|--data|--data-raw|--data-binary)\s+(['"])([\s\S]*?)\1/;
    const dataMatch = str.match(dataRegex);
    if (dataMatch) {
      bodyStr = dataMatch[2];
      if (method === "GET") method = "POST";
    }

    let baseUrl = url;
    const queryParams: Record<string, string> = {};
    try {
      if (url && url.includes("?")) {
        const [base, query] = url.split("?");
        baseUrl = base;
        const search = new URLSearchParams(query);
        search.forEach((val, key) => {
          queryParams[key] = val;
        });
      }
    } catch {
      // 忽略
    }

    if (!baseUrl) {
      setOutputCode("// 未匹配到有效的 URL 链接");
      return;
    }

    if (method === "GET") {
      const customHeaders = { ...headers };
      delete customHeaders["Content-Type"];
      delete customHeaders["content-type"];
      delete customHeaders["Content-Length"];
      delete customHeaders["content-length"];

      const hasCustomHeaders = Object.keys(customHeaders).length > 0;
      const hasQuery = Object.keys(queryParams).length > 0;

      if (hasCustomHeaders) {
        setOutputCode(`const res = await hub.http.get(\n  "${baseUrl}",\n  ${hasQuery ? JSON.stringify(queryParams, null, 2) : "null"},\n  ${JSON.stringify(customHeaders, null, 2)}\n);\nconsole.log(res);`);
      } else if (hasQuery) {
        setOutputCode(`const res = await hub.http.get("${baseUrl}", ${JSON.stringify(queryParams, null, 2)});\nconsole.log(res);`);
      } else {
        setOutputCode(`const res = await hub.http.get("${baseUrl}");\nconsole.log(res);`);
      }
    } else {
      let bodyObj: unknown = bodyStr;
      try {
        if (bodyStr) {
          bodyObj = JSON.parse(bodyStr);
        } else {
          bodyObj = {};
        }
      } catch {
        // 保留字符串
      }

      const customHeaders = { ...headers };
      delete customHeaders["Content-Type"];
      delete customHeaders["content-type"];
      delete customHeaders["Content-Length"];
      delete customHeaders["content-length"];

      const hasCustomHeaders = Object.keys(customHeaders).length > 0;
      if (hasCustomHeaders) {
        setOutputCode(`const res = await hub.http.post(\n  "${baseUrl}",\n  ${JSON.stringify(bodyObj, null, 2)},\n  ${JSON.stringify(customHeaders, null, 2)}\n);\nconsole.log(res);`);
      } else {
        setOutputCode(`const res = await hub.http.post("${baseUrl}", ${JSON.stringify(bodyObj, null, 2)});\nconsole.log(res);`);
      }
    }
  };

  const handleCopy = () => {
    if (!outputCode) return;
    copyToClipboard(outputCode).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4 select-text">
      <div className="flex items-center gap-2 text-tx-primary">
        <Wand2 size={16} className="text-accent-primary" />
        <h4 className="text-sm font-semibold">cURL 转 hub.http 请求</h4>
      </div>
      <p className="text-xs text-tx-tertiary">
        粘贴浏览器的 cURL 命令，自动转换为适用于当前沙箱的 hub.http 请求代码。
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-tx-secondary">1. 粘贴 cURL 命令</label>
        <textarea
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          placeholder="curl 'https://api.example.com/data' -H 'Authorization: Bearer xxxx' ..."
          className="w-full h-32 px-3 py-2 text-xs font-mono bg-app-surface border border-app-border rounded-lg text-tx-primary focus:outline-none focus:border-accent-primary resize-none"
        />
        <Button size="sm" onClick={handleConvert} className="gap-1.5 w-full h-8 text-xs">
          <Wand2 size={13} />
          立即转换
        </Button>
      </div>

      <div className="flex justify-center text-tx-tertiary">
        <ArrowDown size={16} />
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-tx-secondary">2. 转换结果</label>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!outputCode}
            className="h-6 px-2 text-xs gap-1 hover:bg-app-hover text-tx-secondary hover:text-tx-primary"
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            {copied ? "已复制" : "复制代码"}
          </Button>
        </div>
        <pre className="w-full flex-1 min-h-[140px] p-3 text-[11px] font-mono bg-zinc-950/5 dark:bg-black/20 text-tx-secondary rounded-lg border border-app-border overflow-auto whitespace-pre">
          {outputCode || "// 转换后的请求代码将显示在此处"}
        </pre>
      </div>
    </div>
  );
}
