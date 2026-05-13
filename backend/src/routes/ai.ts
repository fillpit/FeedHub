import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getDb } from "../db/schema";

const ai = new Hono();

// ===== AI 设置管理 =====

export interface AISettings {
  ai_provider: string;       // "openai" | "ollama" | "custom" | "qwen" | "deepseek" | "gemini" | "doubao"
  ai_api_url: string;        // API 端点
  ai_api_key: string;        // API Key（Ollama 可为空）
  ai_model: string;          // 模型名称

  // 侧边栏助手独立配置
  ai_chat_provider?: string;
  ai_chat_api_url?: string;
  ai_chat_api_key?: string;
  ai_chat_model?: string;
}

const AI_DEFAULTS: AISettings = {
  ai_provider: "openai",
  ai_api_url: "https://api.openai.com/v1",
  ai_api_key: "",
  ai_model: "gpt-4o-mini",
};

// 不需要 API Key 的 Provider
const NO_KEY_PROVIDERS = ["ollama"];

// Docker 环境下 Ollama 使用内部 URL
const OLLAMA_DOCKER_URL = process.env.OLLAMA_URL || "";

function getAISettings(): AISettings {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'ai_%'").all() as { key: string; value: string }[];
  const result: AISettings = { ...AI_DEFAULTS };
  for (const row of rows) {
    ((result as unknown) as Record<string, string | undefined>)[row.key] = row.value;
  }
  // Docker 环境下自动替换 Ollama localhost URL 为内部容器 URL
  if (OLLAMA_DOCKER_URL && result.ai_provider === "ollama" && result.ai_api_url.includes("localhost:11434")) {
    result.ai_api_url = result.ai_api_url.replace(/http:\/\/localhost:11434/, OLLAMA_DOCKER_URL);
  }
  return result;
}

// GET /api/ai/settings
ai.get("/settings", (c) => {
  const settings = getAISettings();
  // 不返回完整 API Key，只返回掩码
  const response: Record<string, unknown> = {
    ...settings,
    ai_api_key: settings.ai_api_key ? "sk-****" + settings.ai_api_key.slice(-4) : "",
    ai_api_key_set: !!settings.ai_api_key,
  };

  if (settings.ai_chat_api_key) {
    response.ai_chat_api_key = "sk-****" + settings.ai_chat_api_key.slice(-4);
  }

  return c.json(response);
});

// PUT /api/ai/settings
ai.put("/settings", async (c) => {
  const body = await c.req.json() as Record<string, string>;
  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, updatedAt)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = datetime('now')
  `);

  const allowedKeys = [
    "ai_provider", "ai_api_url", "ai_api_key", "ai_model",
    "ai_chat_provider", "ai_chat_api_url", "ai_chat_api_key", "ai_chat_model"
  ];

  const tx = db.transaction(() => {
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        let value = body[key];
        if (key.includes("api_key") && value.includes("****")) {
          continue; // Skip masked keys
        }
        if (key.includes("api_url")) {
          value = value.replace(/\/+$/, "");
        }
        upsert.run(key, value);
      }
    }
  });
  tx();

  const settings = getAISettings();
  return c.json({
    ...settings,
    ai_api_key: settings.ai_api_key ? "sk-****" + settings.ai_api_key.slice(-4) : "",
    ai_api_key_set: !!settings.ai_api_key,
  });
});

// ===== AI 连接测试 =====
ai.post("/test", async (c) => {
  const settings = getAISettings();
  if (!settings.ai_api_url) {
    return c.json({ success: false, error: "未配置 API 地址" }, 400);
  }
  if (!NO_KEY_PROVIDERS.includes(settings.ai_provider) && !settings.ai_api_key) {
    return c.json({ success: false, error: "未配置 API Key" }, 400);
  }

  // 规范化 URL：去除末尾斜杠，避免拼接出双斜杠
  const baseUrl = settings.ai_api_url.replace(/\/+$/, "");

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.ai_api_key) {
      headers["Authorization"] = `Bearer ${settings.ai_api_key}`;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.ai_model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      // 如果是 Ollama 且返回 405，尝试回退到 Ollama 原生 API 进行连接测试
      if (settings.ai_provider === "ollama" && res.status === 405) {
        // 从 URL 中提取 Ollama 基础地址（去掉 /v1 后缀）
        const ollamaBase = baseUrl.replace(/\/v1$/, "");
        try {
          const fallbackRes = await fetch(`${ollamaBase}/api/tags`, {
            method: "GET",
            signal: AbortSignal.timeout(10000),
          });
          if (fallbackRes.ok) {
            return c.json({
              success: true,
              message: "连接成功（Ollama 原生 API）。注意：当前 Ollama 版本可能不支持 OpenAI 兼容接口（/v1/chat/completions），请升级 Ollama 至 v0.1.14 或更高版本以获得完整功能支持。",
            });
          }
        } catch { /* 回退也失败，返回原始错误 */ }
      }

      const err = await res.text();
      return c.json({ success: false, error: `API 返回 ${res.status}: ${err.slice(0, 200)}` }, 400);
    }

    return c.json({ success: true, message: "连接成功" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message || "连接失败" }, 500);
  }
});

// ===== 获取模型列表 =====
ai.get("/models", async (c) => {
  const settings = getAISettings();
  if (!settings.ai_api_url) {
    return c.json({ models: [] });
  }

  try {
    const headers: Record<string, string> = {};
    if (settings.ai_api_key) {
      headers["Authorization"] = `Bearer ${settings.ai_api_key}`;
    }

    const res = await fetch(`${settings.ai_api_url}/models`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return c.json({ models: [] });
    }

    const data = await res.json();
    const models = (data.data || data.models || []).map((m: { id?: string; name?: string }) => ({
      id: m.id || m.name,
      name: m.id || m.name,
    }));
    return c.json({ models });
  } catch {
    return c.json({ models: [] });
  }
});

// ===== AI 写作助手（流式 SSE） =====

type AIAction = "continue" | "rewrite" | "polish" | "shorten" | "expand" | "translate_en" | "translate_zh" | "summarize" | "explain" | "fix_grammar" | "title" | "tags" | "format_markdown" | "format_code" | "custom";

const ACTION_PROMPTS: Record<AIAction, string> = {
  continue: "请根据上下文，自然流畅地续写以下内容。不要重复已有内容，直接输出续写部分：",
  rewrite: "请用不同的表达方式改写以下内容，保持原意不变：",
  polish: "请对以下内容进行润色，使其更加专业流畅，保持原意：",
  shorten: "请将以下内容精简压缩，保留核心要点，去除冗余：",
  expand: "请对以下内容进行扩展，增加更多细节和解释，使其更充实：",
  translate_en: "请将以下内容翻译为英文，保持原意和风格：",
  translate_zh: "请将以下内容翻译为中文，保持原意和风格：",
  summarize: "请为以下内容生成一个简洁的摘要（100字以内）：",
  explain: "请用通俗易懂的语言解释以下内容：",
  fix_grammar: "请修正以下内容中的语法和拼写错误，只返回修正后的文本：",
  format_markdown: "请将以下内容按照规范的 Markdown 格式重新排版，合理使用标题、列表、代码块、表格、加粗、引用等格式元素，保持原意不变，使内容结构更清晰：",
  format_code: "请识别以下内容中的代码部分，用正确的编程语言标记包裹在代码块中（如 ```python），保持代码缩进和格式正确。如果内容本身就是纯代码，直接用代码块包裹并标注语言：",
  custom: "",
  title: "请根据以下笔记内容，生成一个简洁准确的标题（10字以内），只返回标题文本，不要加引号或其他标点：",
  tags: "请根据以下笔记内容，推荐3-5个标签关键词。每个标签用逗号分隔，只返回标签文本，不要加#号：",
};

ai.post("/chat", async (c) => {
  const settings = getAISettings();
  if (!settings.ai_api_url) {
    return c.json({ error: "未配置 AI 服务" }, 400);
  }
  if (!NO_KEY_PROVIDERS.includes(settings.ai_provider) && !settings.ai_api_key) {
    return c.json({ error: "未配置 API Key" }, 400);
  }

  const { action, text, context, customPrompt } = await c.req.json() as {
    action: AIAction;
    text: string;
    context?: string;
    customPrompt?: string;
  };

  if (!action || !text) {
    return c.json({ error: "参数不完整" }, 400);
  }

  // 自定义指令：使用用户传入的 prompt
  let systemPrompt: string;
  if (action === "custom") {
    if (!customPrompt?.trim()) {
      return c.json({ error: "请输入自定义指令" }, 400);
    }
    systemPrompt = customPrompt.trim() + "：";
  } else {
    systemPrompt = ACTION_PROMPTS[action];
    if (!systemPrompt) {
      return c.json({ error: "不支持的操作类型" }, 400);
    }
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: "你是一个专业的写作助手，帮助用户优化笔记内容。请直接输出结果，不要添加额外的解释或前缀。" },
  ];

  if (context) {
    messages.push({ role: "system", content: `笔记上下文：\n${context.slice(0, 2000)}` });
  }

  messages.push({ role: "user", content: `${systemPrompt}\n\n${text}` });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  const apiUrl = (settings.ai_chat_api_url || settings.ai_api_url).replace(/\/+$/, "");
  const apiKey = settings.ai_chat_api_key || settings.ai_api_key;
  const model = settings.ai_chat_model || settings.ai_model;

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model,
        messages,
        stream: true,
        temperature: action === "fix_grammar" ? 0.1 : action === "format_code" ? 0.2 : 0.7,
        max_tokens: action === "title" ? 50 : action === "tags" ? 100 : action === "summarize" ? 300 : action === "custom" ? 4000 : 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: `AI 服务错误: ${res.status} ${err.slice(0, 200)}` }, 502);
    }

    // SSE streaming
    return streamSSE(c, async (stream) => {
      if (!res.body) {
        await stream.writeSSE({ data: "AI 响应没有正文内容", event: "error" });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              await stream.writeSSE({ data: "[DONE]", event: "done" });
              return;
            }
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                await stream.writeSSE({ data: content, event: "message" });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
        await stream.writeSSE({ data: "[DONE]", event: "done" });
      } catch {
        await stream.writeSSE({ data: "流式传输中断", event: "error" });
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message || "AI 请求失败" }, 500);
  }
});
// ===== 知识库问答（流式 SSE） =====
ai.post("/ask", async (c) => {
  const settings = getAISettings();
  const { question, history } = await c.req.json() as {
    question: string;
    history?: { role: string; content: string }[];
  };

  if (!question) {
    return c.json({ error: "问题不能为空" }, 400);
  }

  const apiUrl = (settings.ai_chat_api_url || settings.ai_api_url).replace(/\/+$/, "");
  const apiKey = settings.ai_chat_api_key || settings.ai_api_key;
  const model = settings.ai_chat_model || settings.ai_model;

  const messages: { role: string; content: string }[] = [
    { role: "system", content: "你是一个智能笔记助手。请基于用户的提问提供有帮助的回答。如果涉及知识库搜索，请说明结果。直接输出回答内容。" },
  ];

  if (history && history.length > 0) {
    messages.push(...history.slice(-10));
  }

  messages.push({ role: "user", content: question });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: `AI 服务错误: ${res.status} ${err.slice(0, 200)}` }, 502);
    }

    const responseBody = res.body;
    if (!responseBody) {
      return c.json({ error: "AI 响应没有正文内容" }, 500);
    }

    return streamSSE(c, async (stream) => {
      const reader = responseBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        // 先发送一个空的参考引用（因为后端目前没有真正的 FTS 索引）
        // await stream.writeSSE({ data: JSON.stringify([]), event: "message" });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              await stream.writeSSE({ data: "[DONE]", event: "done" });
              return;
            }
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                await stream.writeSSE({ data: content, event: "message" });
              }
            } catch { /* skip */ }
          }
        }
        await stream.writeSSE({ data: "[DONE]", event: "done" });
      } catch {
        await stream.writeSSE({ data: "流式传输中断", event: "error" });
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message || "AI 请求失败" }, 500);
  }
});

// ===== 知识库统计 =====
ai.get("/knowledge-stats", (c) => {
  const db = getDb();
  // 由于目前是模板项目，核心业务表（notes, notebooks 等）可能不存在
  // 我们通过 try-catch 来安全地获取统计，如果表不存在则返回 0
  const stats = {
    noteCount: 0,
    ftsCount: 0,
    notebookCount: 0,
    tagCount: 0,
    recentTopics: [],
    indexed: false,
  };

  try {
    const noteCount = db.prepare("SELECT COUNT(*) as count FROM notes WHERE isTrashed = 0").get() as { count?: number } | undefined;
    stats.noteCount = noteCount?.count || 0;
    
    const notebookCount = db.prepare("SELECT COUNT(*) as count FROM notebooks").get() as { count?: number } | undefined;
    stats.notebookCount = notebookCount?.count || 0;

    const tagCount = db.prepare("SELECT COUNT(*) as count FROM tags").get() as { count?: number } | undefined;
    stats.tagCount = tagCount?.count || 0;
  } catch {
    // 表不存在，保持为 0
  }

  return c.json(stats);
});

// ===== 更多 AI 功能桩位 (Stubs) =====
ai.post("/parse-document", async (c) => {
  return c.json({ error: "文档解析功能在此模板中尚未实现" }, 501);
});

ai.post("/import-to-knowledge", async (c) => {
  return c.json({ error: "知识库导入功能在此模板中尚未实现" }, 501);
});

ai.post("/batch-format", async (c) => {
  return c.json({ error: "批量格式化功能在此模板中尚未实现" }, 501);
});

export default ai;
