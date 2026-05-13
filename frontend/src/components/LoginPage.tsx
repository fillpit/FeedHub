import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, User as UserIcon, BookOpen, Globe, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getServerUrl, setServerUrl, clearServerUrl, testServerConnection } from "@/lib/api";
import { User } from "@/types";

interface LoginPageProps {
  onLogin: (token: string, user: User) => void;
  /** 是否为客户端模式（Electron / Android / 曾配置过服务器地址） */
  isClientMode?: boolean;
  onDisconnect?: () => void;
}

export default function LoginPage({ onLogin, isClientMode = false, onDisconnect }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [serverAddress, setServerAddress] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationPolicy, setRegistrationPolicy] = useState<"open" | "invite" | "closed">("closed");
  const [serverStatus, setServerStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const { t } = useTranslation();

  // 回填上次的服务器地址并获取注册策略
  useEffect(() => {
    if (isClientMode) {
      const saved = getServerUrl() || localStorage.getItem("nowen-server-url-last") || "";
      if (saved) {
        setServerAddress(saved.replace(/^https?:\/\//, ""));
        setServerStatus("ok");
      }
    }

    // 获取公共设置以确定是否允许注册
    const fetchPublicSettings = async () => {
      try {
        const baseUrl = isClientMode ? getServerUrl() : "";
        const targetUrl = baseUrl ? `${baseUrl}/api/settings` : "/api/settings";
        const res = await fetch(targetUrl);
        if (res.ok) {
          const data = await res.json();
          setRegistrationPolicy(data.registration_policy || "closed");
        }
      } catch (e) {
        console.error("Failed to fetch public settings", e);
      }
    };
    fetchPublicSettings();
  }, [isClientMode]);

  // 服务器地址失去焦点时自动检测连通性
  const handleServerBlur = async () => {
    if (!isClientMode || !serverAddress.trim()) return;

    let url = serverAddress.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `http://${url}`;
    }

    setServerStatus("checking");
    const result = await testServerConnection(url);
    if (result.ok) {
      setServerStatus("ok");
      // 成功连接后尝试获取该服务器的注册策略
      try {
        const res = await fetch(`${url}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setRegistrationPolicy(data.registration_policy || "closed");
        }
      } catch { /* ignore */ }
    } else {
      setServerStatus("fail");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // 注册模式下的基本校验
    if (isRegister) {
      if (password !== confirmPassword) {
        setError(t("auth.passwordMismatch"));
        setIsLoading(false);
        return;
      }
    }

    try {
      let baseUrl = "";

      if (isClientMode) {
        let url = serverAddress.trim();
        if (!url) {
          setError(t("auth.serverRequired"));
          setIsLoading(false);
          return;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `http://${url}`;
        }

        const serverResult = await testServerConnection(url);
        if (!serverResult.ok) {
          setServerStatus("fail");
          setError(serverResult.error || t("server.connectFailed"));
          setIsLoading(false);
          return;
        }
        setServerStatus("ok");
        setServerUrl(url);
        localStorage.setItem("nowen-server-url-last", url);
        baseUrl = url;
      }

      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const targetUrl = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

      const payload = isRegister
        ? { username, password, email: email.trim() || undefined }
        : { username, password };

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t(isRegister ? "auth.registerFailed" : "auth.loginFailed"));
        setIsLoading(false);
        return;
      }

      localStorage.setItem("nowen-token", data.token);
      onLogin(data.token, data.user);
    } catch {
      setError(t("auth.networkError"));
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearServerUrl();
    localStorage.removeItem("nowen-token");
    setServerAddress("");
    setServerStatus("idle");
    setUsername("");
    setPassword("");
    setError("");
    onDisconnect?.();
  };

  const serverStatusIcon = () => {
    switch (serverStatus) {
      case "checking":
        return <Loader2 className="w-4 h-4 animate-spin text-amber-500" />;
      case "ok":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "fail":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 selection:bg-indigo-500/30 transition-colors">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-[420px] mx-4"
      >
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 mb-4"
            >
              <BookOpen size={24} className="text-indigo-600 dark:text-indigo-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t("auth.appTitle")}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
              {isRegister ? "创建您的新账号" : (isClientMode ? t("auth.subtitleClient") : t("auth.subtitle"))}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 服务器地址 — 仅客户端模式显示 */}
            <AnimatePresence>
              {isClientMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("auth.serverAddress")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      value={serverAddress}
                      onChange={(e) => {
                        setServerAddress(e.target.value);
                        if (serverStatus !== "idle") setServerStatus("idle");
                      }}
                      onBlur={handleServerBlur}
                      className="block w-full pl-10 pr-10 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-sm"
                      placeholder={t("auth.serverPlaceholder")}
                      autoFocus={isClientMode}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {serverStatusIcon()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 用户名 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("auth.username")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-sm"
                  placeholder={t("auth.usernamePlaceholder")}
                  autoComplete="username"
                  autoFocus={!isClientMode}
                  required
                />
              </div>
            </div>

            {/* 邮箱 — 仅注册模式 */}
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-sm"
                      placeholder={t("auth.emailPlaceholder")}
                      autoComplete="email"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 密码 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("auth.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-sm"
                  placeholder="••••••••"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
              </div>
            </div>

            {/* 确认密码 — 仅注册模式 */}
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("auth.confirmPassword")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-sm"
                      placeholder={t("auth.confirmPasswordPlaceholder")}
                      autoComplete="new-password"
                      required={isRegister}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
                >
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading || !username || !password || (isClientMode && !serverAddress.trim())}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isRegister ? t("auth.registerButton") : t("auth.loginButton")
              )}
            </button>
          </form>

          {/* 切换 登录/注册 */}
          {registrationPolicy === "open" && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
              >
                {isRegister ? t("auth.toLogin") : t("auth.toRegister")}
              </button>
            </div>
          )}

          {/* 默认账号提示 - 仅登录模式且没有开放注册时显示 */}
          {!isRegister && registrationPolicy !== "open" && (
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-6 font-medium">
              {t("auth.defaultCredentials")}
            </p>
          )}

          {/* 客户端模式：断开连接按钮 */}
          {isClientMode && getServerUrl() && (
            <div className="mt-4 flex justify-center border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
              >
                {t("auth.resetServer")}
              </button>
            </div>
          )}
        </div>

        {/* 底部说明 — 客户端模式 */}
        {isClientMode && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 mt-4 px-4"
          >
            {t("auth.clientNote")}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
