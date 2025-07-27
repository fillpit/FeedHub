// XSS 防护工具
class XSSProtection {
  // HTML 实体编码映射
  private static readonly HTML_ENTITIES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };

  // 危险标签列表
  private static readonly DANGEROUS_TAGS = [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "textarea",
    "button",
    "select",
    "option",
    "link",
    "meta",
    "style",
    "base",
  ];

  // 危险属性列表
  private static readonly DANGEROUS_ATTRS = [
    "onclick",
    "onload",
    "onerror",
    "onmouseover",
    "onmouseout",
    "onfocus",
    "onblur",
    "onchange",
    "onsubmit",
    "onreset",
    "javascript:",
    "vbscript:",
    "data:",
    "expression(",
  ];

  /**
   * HTML 转义
   */
  static escapeHtml(text: string): string {
    if (typeof text !== "string") {
      return String(text);
    }

    return text.replace(/[&<>"'`=]/g, (match) => {
      return this.HTML_ENTITIES[match] || match;
    });
  }

  /**
   * HTML 反转义
   */
  static unescapeHtml(html: string): string {
    if (typeof html !== "string") {
      return String(html);
    }

    const entityMap: Record<string, string> = {};
    Object.entries(this.HTML_ENTITIES).forEach(([char, entity]) => {
      entityMap[entity] = char;
    });

    return html.replace(/&[#\w]+;/g, (entity) => {
      return entityMap[entity] || entity;
    });
  }

  /**
   * 清理 HTML 内容
   */
  static sanitizeHtml(html: string, allowedTags: string[] = []): string {
    if (typeof html !== "string") {
      return "";
    }

    // 移除危险标签
    let cleaned = html;
    this.DANGEROUS_TAGS.forEach((tag) => {
      if (!allowedTags.includes(tag)) {
        const regex = new RegExp(`</?${tag}[^>]*>`, "gi");
        cleaned = cleaned.replace(regex, "");
      }
    });

    // 移除危险属性
    this.DANGEROUS_ATTRS.forEach((attr) => {
      const regex = new RegExp(`\\s*${attr.replace(/[()]/g, "\\$&")}[^\\s>]*`, "gi");
      cleaned = cleaned.replace(regex, "");
    });

    // 移除 javascript: 协议
    cleaned = cleaned.replace(/javascript:/gi, "");

    return cleaned;
  }

  /**
   * 验证 URL 安全性
   */
  static isUrlSafe(url: string): boolean {
    if (typeof url !== "string") {
      return false;
    }

    // 检查协议
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
    try {
      const urlObj = new URL(url);
      return allowedProtocols.includes(urlObj.protocol);
    } catch {
      // 相对 URL
      return !url.includes("javascript:") && !url.includes("data:") && !url.includes("vbscript:");
    }
  }

  /**
   * 清理用户输入
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== "string") {
      return String(input);
    }

    // 移除控制字符
    let cleaned = input.trim();
    for (let i = 0; i <= 31; i++) {
      cleaned = cleaned.replace(new RegExp(String.fromCharCode(i), "g"), "");
    }
    cleaned = cleaned.replace(String.fromCharCode(127), ""); // DEL字符

    return cleaned.replace(/\s+/g, " "); // 合并多个空格
  }

  /**
   * 清理对象中的所有字符串值
   */
  static sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // if (typeof obj === 'string') {
    //   return this.sanitizeInput(obj);
    // }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

// CSRF 防护工具
class CSRFProtection {
  private static readonly TOKEN_HEADER = "X-CSRF-Token";
  private static readonly TOKEN_STORAGE_KEY = "csrf_token";

  /**
   * 生成 CSRF Token
   */
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  /**
   * 获取当前 CSRF Token
   */
  static getToken(): string {
    let token = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
    if (!token) {
      token = this.generateToken();
      sessionStorage.setItem(this.TOKEN_STORAGE_KEY, token);
    }
    return token;
  }

  /**
   * 设置请求头中的 CSRF Token
   */
  static setRequestHeader(headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      [this.TOKEN_HEADER]: this.getToken(),
    };
  }

  /**
   * 验证 CSRF Token
   */
  static validateToken(token: string): boolean {
    const storedToken = this.getToken();
    return token === storedToken;
  }

  /**
   * 刷新 CSRF Token
   */
  static refreshToken(): string {
    const newToken = this.generateToken();
    sessionStorage.setItem(this.TOKEN_STORAGE_KEY, newToken);
    return newToken;
  }
}

// 内容安全策略工具
class CSPHelper {
  /**
   * 生成随机 nonce
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * 创建安全的内联样式
   */
  static createSecureStyle(css: string, nonce?: string): HTMLStyleElement {
    const style = document.createElement("style");
    if (nonce) {
      style.setAttribute("nonce", nonce);
    }
    style.textContent = css;
    return style;
  }

  /**
   * 创建安全的内联脚本
   */
  static createSecureScript(js: string, nonce?: string): HTMLScriptElement {
    const script = document.createElement("script");
    if (nonce) {
      script.setAttribute("nonce", nonce);
    }
    script.textContent = js;
    return script;
  }
}

// 安全的 DOM 操作工具
class SecureDOM {
  /**
   * 安全地设置元素内容
   */
  static setTextContent(element: Element, content: string): void {
    element.textContent = XSSProtection.sanitizeInput(content);
  }

  /**
   * 安全地设置 HTML 内容
   */
  static setInnerHTML(element: Element, html: string, allowedTags: string[] = []): void {
    const sanitized = XSSProtection.sanitizeHtml(html, allowedTags);
    element.innerHTML = sanitized;
  }

  /**
   * 安全地设置属性
   */
  static setAttribute(element: Element, name: string, value: string): void {
    // 检查危险属性
    const dangerousAttrs = ["onclick", "onload", "onerror", "href", "src"];
    if (dangerousAttrs.some((attr) => name.toLowerCase().includes(attr))) {
      if (name.toLowerCase() === "href" || name.toLowerCase() === "src") {
        if (XSSProtection.isUrlSafe(value)) {
          element.setAttribute(name, value);
        }
      }
      return;
    }

    element.setAttribute(name, XSSProtection.sanitizeInput(value));
  }

  /**
   * 创建安全的链接
   */
  static createSafeLink(url: string, text: string, target = "_blank"): HTMLAnchorElement | null {
    if (!XSSProtection.isUrlSafe(url)) {
      return null;
    }

    const link = document.createElement("a");
    link.href = url;
    link.textContent = XSSProtection.sanitizeInput(text);
    link.target = target;

    // 防止 tabnabbing 攻击
    if (target === "_blank") {
      link.rel = "noopener noreferrer";
    }

    return link;
  }
}

// 密码安全工具
class PasswordSecurity {
  /**
   * 检查密码强度
   */
  static checkStrength(password: string): {
    score: number;
    level: "weak" | "medium" | "strong" | "very-strong";
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("密码长度至少需要8位");
    }

    if (password.length >= 12) {
      score += 1;
    }

    // 字符类型检查
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("需要包含小写字母");
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("需要包含大写字母");
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("需要包含数字");
    }

    if (/[^a-zA-Z\d]/.test(password)) {
      score += 1;
    } else {
      feedback.push("需要包含特殊字符");
    }

    // 复杂度检查
    if (!/(..).*\1/.test(password)) {
      score += 1; // 没有重复的字符对
    }

    // 确定强度等级
    let level: "weak" | "medium" | "strong" | "very-strong";
    if (score <= 2) {
      level = "weak";
    } else if (score <= 4) {
      level = "medium";
    } else if (score <= 6) {
      level = "strong";
    } else {
      level = "very-strong";
    }

    return { score, level, feedback };
  }

  /**
   * 生成安全密码
   */
  static generateSecurePassword(length = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = lowercase + uppercase + numbers + symbols;
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    let password = "";

    // 确保至少包含每种类型的字符
    password += lowercase[array[0] % lowercase.length];
    password += uppercase[array[1] % uppercase.length];
    password += numbers[array[2] % numbers.length];
    password += symbols[array[3] % symbols.length];

    // 填充剩余长度
    for (let i = 4; i < length; i++) {
      password += allChars[array[i] % allChars.length];
    }

    // 打乱顺序
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }
}

// 安全存储工具
class SecureStorage {
  /**
   * 加密存储
   */
  static setSecureItem(key: string, value: string): void {
    try {
      const encrypted = btoa(encodeURIComponent(value));
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error("安全存储失败:", error);
    }
  }

  /**
   * 解密获取
   */
  static getSecureItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return decodeURIComponent(atob(encrypted));
    } catch (error) {
      console.error("安全获取失败:", error);
      return null;
    }
  }

  /**
   * 安全删除
   */
  static removeSecureItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * 清理敏感数据
   */
  static clearSensitiveData(): void {
    const sensitiveKeys = ["token", "password", "secret", "key"];
    Object.keys(localStorage).forEach((key) => {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        localStorage.removeItem(key);
      }
    });
  }
}

// 输入验证和清理
export const sanitize = {
  // 清理 HTML
  html: (input: string, allowedTags: string[] = []) =>
    XSSProtection.sanitizeHtml(input, allowedTags),

  // 转义 HTML
  escape: (input: string) => XSSProtection.escapeHtml(input),

  // 清理用户输入
  input: (input: string) => XSSProtection.sanitizeInput(input),

  // 验证 URL
  url: (url: string) => XSSProtection.isUrlSafe(url),
};

// 导出所有工具
export { XSSProtection, CSRFProtection, CSPHelper, SecureDOM, PasswordSecurity, SecureStorage };

// 默认导出安全工具集合
export default {
  XSSProtection,
  CSRFProtection,
  CSPHelper,
  SecureDOM,
  PasswordSecurity,
  SecureStorage,
  sanitize,
};
