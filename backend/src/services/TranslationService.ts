import { injectable } from "inversify";
import GlobalSetting from "../models/GlobalSetting";

@injectable()
export class TranslationService {
  private cachedSettings: GlobalSetting | null = null;
  private settingsCacheTime: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds

  /**
   * ⚡ Bolt Optimization:
   * 获取全局设置并进行内存缓存，避免在批量翻译 RSS 条目时产生 N+1 查询问题
   */
  private async getSettings() {
    const now = Date.now();
    if (this.settingsCacheTime > 0 && now - this.settingsCacheTime < this.CACHE_TTL) {
      return this.cachedSettings;
    }
    this.cachedSettings = await GlobalSetting.findOne();
    this.settingsCacheTime = now;
    return this.cachedSettings;
  }

  /**
   * 执行翻译并返回双语对照文本
   * - 使用环境变量配置模型: TRANSLATION_API_BASE, TRANSLATION_API_KEY, TRANSLATION_MODEL
   * - 读取全局设置中的 targetLanguage 与 prompt
   */
  async translateBilingual(input: string): Promise<string> {
    const settings = await this.getSettings();
    const targetLanguage = settings?.translationTargetLanguage || "en-US";
    const prompt = settings?.translationPrompt || "请将输入内容翻译为目标语言，并保留原文";

    const apiBase = settings?.translationApiBase || "";
    const apiKey = settings?.translationApiKey || "";
    const model = settings?.translationModel || "gpt-4o-mini";

    if (!apiBase || !apiKey) {
      // 未配置外部服务时直接返回原文
      return input;
    }

    try {
      const body = {
        model,
        messages: [
          {
            role: "system",
            content: `${prompt}。目标语言: ${targetLanguage}。输出仅包含原文与译文两段，保留换行。`,
          },
          { role: "user", content: input },
        ],
        temperature: 0.2,
      };

      const resp = await fetch(`${apiBase}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        return input;
      }

      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || "";
      if (!content) return input;

      // 组合双语对照：原文 + 译文
      return `${input}\n\n${content}`;
    } catch {
      return input;
    }
  }
}
