import React, { useState, useEffect } from "react";
import { Chrome, Globe, HelpCircle, Terminal, Cpu, Database, EyeOff, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { IntegrationCard, CopyButton } from "./IntegrationCard";
import { ChromeDebuggingConfig } from "./ChromeDebuggingConfig";
import { BrowserlessConfig } from "./BrowserlessConfig";
import { RedisConfig } from "./RedisConfig";
import { CloakBrowserConfig } from "./CloakBrowserConfig";
import { LightpandaConfig } from "./LightpandaConfig";

const CHROME_CMD = "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222";
const CLOAK_DOCKER_CMD = "docker run -d -p 9122:9122 --name cloak-browser --restart always cloakbrowser/browser:latest --remote-debugging-port=9122 --remote-debugging-address=0.0.0.0";
const LIGHTPANDA_DOCKER_CMD = "docker run -d --name lightpanda -p 9222:9222 lightpanda/browser:latest";
const DOCKER_CMD = "docker run -d -p 3000:3000 --restart always -e \"MAX_CONCURRENT_SESSIONS=10\" -e \"TOKEN=your_secure_token\" browserless/chrome";

/**
 * CloakBrowser instruction node
 */
const CloakBrowserInstructions: React.FC = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-tx-primary flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
        独立 Docker 容器快速启动指令
      </span>
      <CopyButton text={CLOAK_DOCKER_CMD} tooltip="复制运行指令" />
    </div>
    <p className="text-[11px] text-tx-secondary leading-relaxed">
      你可以通过下面的指令快速在服务器或本地以远程调试模式启动一个 CloakBrowser 实例：
    </p>
    <div className="p-3.5 bg-app-bg border border-app-border rounded-xl font-mono text-[11px] text-tx-primary break-all leading-normal relative select-all hover:border-accent-primary/20 transition-all shadow-inner">
      {CLOAK_DOCKER_CMD}
    </div>
  </div>
);

/**
 * Lightpanda instruction node
 */
const LightpandaInstructions: React.FC = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-tx-primary flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        独立 Docker 容器快速启动指令
      </span>
      <CopyButton text={LIGHTPANDA_DOCKER_CMD} tooltip="复制运行指令" />
    </div>
    <p className="text-[11px] text-tx-secondary leading-relaxed">
      你可以通过下面的指令快速在服务器或本地以远程调试模式启动一个 Lightpanda 实例：
    </p>
    <div className="p-3.5 bg-app-bg border border-app-border rounded-xl font-mono text-[11px] text-tx-primary break-all leading-normal relative select-all hover:border-accent-primary/20 transition-all shadow-inner">
      {LIGHTPANDA_DOCKER_CMD}
    </div>
  </div>
);

/**
 * Chrome Remote Debugging instruction node with improved readability and color balance
 */
const ChromeDebuggingInstructions: React.FC = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-tx-primary flex items-center gap-1.5">
        <Terminal className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
        Mac Mini 终端快速启动指令
      </span>
      <CopyButton text={CHROME_CMD} tooltip="复制运行指令" />
    </div>
    <p className="text-[11px] text-tx-secondary leading-relaxed">
      要在同一局域网（或本地）激活无头 Chrome 调试会话，请先关闭正在运行的所有 Chrome 实例，再在 Mac Mini 终端复制并直接运行以下命令：
    </p>
    <div className="p-3.5 bg-app-bg border border-app-border rounded-xl font-mono text-[11px] text-tx-primary break-all leading-normal relative select-all hover:border-accent-primary/20 transition-all shadow-inner">
      {CHROME_CMD}
    </div>
    <p className="text-[10px] text-tx-tertiary leading-relaxed">
      💡 <strong>登录提示：</strong> 启动后，请直接在弹出的 Chrome 实例中正常登录你的目标平台。后续系统抓取时将复用 Cookie 绕过验证机制。
    </p>
    <div className="p-4 bg-rose-500/[0.02] dark:bg-rose-500/[0.04] border border-rose-500/10 dark:border-rose-500/20 rounded-xl space-y-2.5 text-[11px] leading-relaxed text-tx-secondary">
      <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-xs">
        ⚠️ 局域网访问连接拒绝（安全策略限制）
      </span>
      <p>
        从 Chromium M113 版本开始，由于安全防范考量，Chrome <strong>彻底禁用 <code>--remote-debugging-address=0.0.0.0</code> 选项</strong>。如果强行指定，Chrome 会直接拒绝启动。
      </p>
      <p className="font-bold text-tx-primary text-xs pt-1 border-t border-app-border/10">【解决方案】：</p>
      <div className="space-y-3 pl-1">
        <div>
          <strong className="text-tx-primary">方案一：SSH 隧道转发（最安全，免安装）</strong>
          <p className="mt-0.5">在部署本系统的服务器终端中运行以下命令（将服务器本地 9222 安全转发至 Mac Mini）：</p>
          <code className="block mt-1.5 p-2 bg-app-bg border border-app-border/60 rounded font-mono text-[11px] text-tx-primary">
            ssh -L 9222:127.0.0.1:9222 user@{"<Mac_Mini_IP>"}
          </code>
        </div>
        <div>
          <strong className="text-tx-primary">方案二：socat 端口映射（支持后台持久运行）</strong>
          <p className="mt-0.5">在 Mac Mini 安装并运行 socat 转发，利用 nohup 后台挂载持久运行：</p>
          <code className="block mt-1.5 p-3 bg-app-bg border border-app-border/60 rounded font-mono text-[11px] text-tx-primary leading-normal whitespace-pre-wrap">
            <span className="text-tx-tertiary"># 1. 安装 socat</span>{"\n"}
            brew install socat{"\n"}{"\n"}
            <span className="text-tx-tertiary"># 2. 在后台持久运行转发（窗口关闭不中断）</span>{"\n"}
            nohup socat TCP-LISTEN:9223,fork,reuseaddr TCP:127.0.0.1:9222 &gt; /dev/null 2&gt;&amp;1 &amp;{"\n"}{"\n"}
            <span className="text-tx-tertiary"># 3. 后续如需关闭此服务，执行以下命令：</span>{"\n"}
            killall socat
          </code>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Browserless instruction node
 */
const BrowserlessInstructions: React.FC = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-tx-primary flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
        独立 Docker 极致部署镜像
      </span>
      <CopyButton text={DOCKER_CMD} tooltip="复制 Docker 指令" />
    </div>
    <p className="text-[11px] text-tx-secondary leading-relaxed">
      你可以通过下面的指令在一台闲置 babys 独立服务器或群晖上快速启动 Browserless 实例：
    </p>
    <div className="p-3.5 bg-app-bg border border-app-border rounded-xl font-mono text-[11px] text-tx-primary break-all leading-normal relative select-all hover:border-accent-primary/20 transition-all shadow-inner">
      {DOCKER_CMD}
    </div>
  </div>
);

/**
 * Main Integration Configuration Panel Component
 */
export default function IntegrationsPanel() {
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({
    redis: false,
    greader: true,
    cloak: false,
    lightpanda: false,
    chrome_debugging: false,
    browserless: false,
  });

  const fetchActiveStatus = () => {
    api.getSiteSettings()
      .then((data) => {
        setActiveStates({
          redis: data.redis_enabled === "1",
          greader: true,
          cloak: data.cloak_enabled === "1",
          lightpanda: data.lightpanda_enabled === "1",
          chrome_debugging: data.cdp_enabled === "1",
          browserless: data.browserless_enabled === "1",
        });
      })
      .catch((err) => console.error("Failed to load integrations state", err));
  };

  useEffect(() => {
    fetchActiveStatus();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-12">
        <IntegrationCard
          icon={<Database className="w-4 h-4 text-emerald-500" />}
          title="Redis 缓存集成"
          description="使用 Redis 高速缓存网页内容，极大地提升二次抓取速度，并有效减少对源站的并发请求压力。"
          badgeText={activeStates.redis ? "已开启" : "未开启"}
          isActive={activeStates.redis}
          content={<RedisConfig onStateChange={fetchActiveStatus} />}
          instructions={
            <div className="space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 text-xs">
                <HelpCircle className="w-3.5 h-3.5" />
                配置说明：
              </div>
              <p className="text-[11px] text-tx-secondary leading-relaxed space-y-1.5 flex flex-col">
                <span>请确保填入正确的 Redis 连接字符串（例如 <code>redis://localhost:6379</code>）。</span>
                <span>• <strong>配置密码：</strong>使用 <code>redis://:password@host:port</code> 格式。</span>
                <span>• <strong>指定数据库库编号：</strong>在主机地址末尾加斜杠加数字（范围一般为 <code>/0</code> 到 <code>/15</code>），如 <code>redis://host:port/1</code>。</span>
                <span>• <strong>完整混合配置示例：</strong><code>redis://:my_password@127.0.0.1:6379/2</code>（表示连接到密码为 my_password 且端口为 6379 的 2 号数据库实例）。</span>
              </p>
            </div>
          }
        />

        <IntegrationCard
          icon={<EyeOff className="w-4 h-4 text-orange-500" />}
          title="CloakBrowser 防关联浏览器 (Stealth CDP)"
          description="集成 CloakBrowser 指纹浏览器，通过远程调试接口以极高优先级进行 network 内容抓取，彻底防封抗反爬。"
          badgeText={activeStates.cloak ? "已开启" : "未开启"}
          isActive={activeStates.cloak}
          content={<CloakBrowserConfig onStateChange={fetchActiveStatus} />}
          instructions={<CloakBrowserInstructions />}
        />

        <IntegrationCard
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          title="Lightpanda 极速无头浏览器"
          description="集成基于 WebAssembly/Rust 架构的 Lightpanda 极速无头浏览器。超低内存与 CPU 消耗，毫秒级快速启动，为高并发抓取提供极致性能。"
          badgeText={activeStates.lightpanda ? "已开启" : "未开启"}
          isActive={activeStates.lightpanda}
          content={<LightpandaConfig onStateChange={fetchActiveStatus} />}
          instructions={<LightpandaInstructions />}
        />

        <IntegrationCard
          icon={<Chrome className="w-4 h-4 text-indigo-500" />}
          title="Chrome 远程调试"
          description="一键劫持 Chrome 运行会话进行全文提取。无缝利用本地 Cookie、完美绕过 Cloudflare 与防爬拦截。"
          badgeText={activeStates.chrome_debugging ? "已开启" : "未开启"}
          isActive={activeStates.chrome_debugging}
          content={<ChromeDebuggingConfig onStateChange={fetchActiveStatus} />}
          instructions={<ChromeDebuggingInstructions />}
        />

        <IntegrationCard
          icon={<Globe className="w-4 h-4 text-teal-500" />}
          title="Browserless 云端/独立容器集成"
          description="连接云端或私有化 Docker 部署 of 无头 Chrome 容器阵列（Browserless）。专为处理复杂的 SPA 单页应用设计，高并发极速加载。"
          badgeText={activeStates.browserless ? "已开启" : "未开启"}
          isActive={activeStates.browserless}
          content={<BrowserlessConfig onStateChange={fetchActiveStatus} />}
          instructions={<BrowserlessInstructions />}
        />
      </section>
    </div>
  );
}
