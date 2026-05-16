import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Rss, Chrome, Globe, HelpCircle, Terminal, Cpu, Database } from "lucide-react";
import { api } from "@/lib/api";
import { IntegrationCard, CopyButton } from "./IntegrationCard";
import { ChromeDebuggingConfig } from "./ChromeDebuggingConfig";
import { BrowserlessConfig } from "./BrowserlessConfig";
import { RedisConfig } from "./RedisConfig";

const CHROME_CMD = "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222";
const DOCKER_CMD = "docker run -d -p 3000:3000 --restart always -e \"MAX_CONCURRENT_SESSIONS=10\" -e \"TOKEN=your_secure_token\" browserless/chrome";

/**
 * GReader instruction node
 */
const GReaderInstructions: React.FC = () => {
  return (
    <div className="space-y-2">
      <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-xs">
        <HelpCircle className="w-3.5 h-3.5" />
        接入指南：
      </div>
      <ul className="list-disc list-inside space-y-1 text-[11px] text-tx-secondary leading-relaxed">
        <li>直接使用你的 <strong>本站账号与登录密码</strong> 在阅读器中进行鉴权登录。</li>
        <li>对于部分知名阅读器，选择 <strong>"Google Reader"</strong> 类型的服务商，然后填入上面的物理网关。</li>
      </ul>
    </div>
  );
};

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
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState("");
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({
    redis: false,
    greader: true,
    chrome_debugging: false,
    browserless: false,
  });

  const fetchActiveStatus = () => {
    api.getSiteSettings()
      .then((data) => {
        setActiveStates({
          redis: data.redis_enabled === "1",
          greader: true,
          chrome_debugging: data.cdp_enabled === "1",
          browserless: data.browserless_enabled === "1",
        });
      })
      .catch((err) => console.error("Failed to load integrations state", err));
  };

  useEffect(() => {
    let url = window.location.origin;
    if (import.meta.env.VITE_API_URL) {
      if (import.meta.env.VITE_API_URL.startsWith('http')) {
        url = new URL(import.meta.env.VITE_API_URL).origin;
      } else {
        url = window.location.origin;
      }
    }
    setServerUrl(url);
    fetchActiveStatus();
  }, []);

  const greaderContent = (
    <div className="space-y-4 animate-in fade-in duration-300">
      <p className="text-xs text-tx-secondary leading-relaxed">
        {t('settings.greaderServerInfo')}
      </p>
      <div className="flex items-center gap-2 max-w-md">
        <div className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-3 text-xs text-tx-primary truncate select-all font-mono font-bold">
          {serverUrl}
        </div>
        <CopyButton text={serverUrl} tooltip="复制服务器网关" />
      </div>
    </div>
  );

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
              <p className="text-[11px] text-tx-secondary leading-relaxed">
                请确保填入正确的 Redis 连接字符串（例如 <code>redis://localhost:6379</code>）。如果 Redis 服务设置了密码，请使用 <code>redis://:password@host:port</code> 格式。
              </p>
            </div>
          }
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
          description="连接云端或私有化 Docker 部署的无头 Chrome 容器阵列（Browserless）。专为处理复杂的 SPA 单页应用设计，高并发极速加载。"
          badgeText={activeStates.browserless ? "已开启" : "未开启"}
          isActive={activeStates.browserless}
          content={<BrowserlessConfig onStateChange={fetchActiveStatus} />}
          instructions={<BrowserlessInstructions />}
        />
      </section>
    </div>
  );
}
