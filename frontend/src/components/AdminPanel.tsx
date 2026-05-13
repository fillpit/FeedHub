import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, Activity, Globe, Bot, Users,
  AlertCircle, Info, Lock, UserPlus, RefreshCw, Plus,
  Mail, Check, AlertTriangle, ArrowLeft
} from "lucide-react";
import { User } from "@/types";
import { cn } from "@/lib/utils";
import AISettingsPanel from "./AISettingsPanel";
import SiteSettingsPanel from "./SiteSettingsPanel";
import { useAppActions } from "@/store/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

type AdminTab =
  | "account" | "site" | "ai" | "ai-actions" | "users"
  | "stats-reading" | "stats-files" | "logs" | "tasks" | "about";

interface SidebarItem {
  id: AdminTab;
  label: string;
  icon: React.ReactNode;
  desc?: string;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export default function AdminPanel() {
  const actions = useAppActions();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  const sidebarGroups: SidebarGroup[] = [
    {
      label: "通用",
      items: [
        { id: "site", label: "站点", icon: <Globe size={18} />, desc: "名称、目录、缓存" },
        { id: "ai", label: "AI 设置", icon: <Bot size={18} />, desc: "模型与 API 配置" },
        { id: "users", label: "用户管理", icon: <Users size={18} />, desc: "账号、角色、注册策略" },
      ]
    },
    {
      label: "数据",
      items: [
        { id: "about", label: "关于", icon: <Info size={18} />, desc: "版本与项目信息" },
      ]
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg scroll-smooth">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-10 min-h-full">
        {/* 左侧侧边栏 */}
        <div className="w-full md:w-64 shrink-0 space-y-8">
          <div className="px-4 flex items-center gap-4 mb-8">
            <button
              onClick={() => actions.setViewMode("dashboard")}
              className="w-10 h-10 rounded-2xl bg-app-surface border border-app-border flex items-center justify-center text-tx-secondary hover:text-tx-primary hover:border-tx-tertiary transition-all shadow-sm"
              title="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent-primary flex items-center justify-center text-white shadow-lg shadow-accent-primary/20">
                <Shield size={18} />
              </div>
              <div>
                <h1 className="font-bold text-tx-primary leading-none">设置</h1>
                <p className="text-[10px] text-tx-tertiary mt-1 uppercase tracking-widest font-semibold">Admin Panel</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {sidebarGroups.map(group => (
              <div key={group.label} className="space-y-3">
                <h2 className="px-4 text-[10px] font-bold text-tx-tertiary uppercase tracking-widest opacity-50">{group.label}</h2>
                <div className="space-y-1">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all text-left group",
                        activeTab === item.id
                          ? "bg-app-surface text-accent-primary shadow-sm border border-app-border"
                          : "text-tx-secondary hover:text-tx-primary"
                      )}
                    >
                      <div className={cn(
                        "shrink-0 transition-colors",
                        activeTab === item.id ? "text-accent-primary" : "text-tx-tertiary group-hover:text-tx-secondary"
                      )}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold truncate leading-tight">{item.label}</p>
                        {item.desc && <p className="text-[10px] opacity-50 truncate mt-0.5 font-medium">{item.desc}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧主内容区 */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* 面板标题 (Mobile only or extra context) */}
              <div className="md:hidden pb-4 border-b border-app-border mb-6">
                <h2 className="text-xl font-bold text-tx-primary">
                  {sidebarGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label}
                </h2>
              </div>

              {activeTab === "users" && <UserManagementView />}

              {activeTab === "site" && <SiteSettingsPanel />}

              {activeTab === "ai" && (
                <div className="bg-app-surface rounded-3xl border border-app-border p-8 shadow-sm">
                  <AISettingsPanel />
                </div>
              )}

              {activeTab !== "tasks" && activeTab !== "users" && activeTab !== "ai" && activeTab !== "site" && (
                <div className="h-[50vh] flex flex-col items-center justify-center text-tx-tertiary gap-4 bg-app-surface/40 rounded-3xl border border-app-border border-dashed">
                  <div className="w-16 h-16 rounded-2xl bg-app-surface flex items-center justify-center border border-app-border shadow-sm">
                    <Activity size={32} className="opacity-20" />
                  </div>
                  <p className="text-sm font-medium">「{sidebarGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label}」模块正在建设中...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}



function UserManagementView() {
  const [regPolicy, setRegPolicy] = useState<"open" | "invite" | "closed">("closed");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await api.getSiteSettings();
      setRegPolicy(settings.registration_policy || "closed");
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchSettings(), fetchUsers()]);
      } catch (error) {
        console.error("Initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [fetchSettings, fetchUsers]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handlePolicyChange = async (newPolicy: "open" | "invite" | "closed") => {
    if (newPolicy === regPolicy) return;

    setIsUpdating(true);
    try {
      await api.updateSiteSettings({ registration_policy: newPolicy });
      setRegPolicy(newPolicy);
      setMessage({ type: 'success', text: "注册策略已更新" });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      setMessage({ type: 'error', text: messageText || "更新失败" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (username === 'admin') return;
    if (!window.confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) return;

    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setMessage({ type: 'success', text: `用户 ${username} 已删除` });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      setMessage({ type: 'error', text: messageText || "删除失败" });
    }
  };

  const policies: { id: "open" | "invite" | "closed"; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: "open", title: "开放注册", desc: "任何人都可以自行注册", icon: <Globe size={20} /> },
    { id: "invite", title: "邀请制", desc: "仅管理员可以创建新用户", icon: <UserPlus size={20} /> },
    { id: "closed", title: "关闭注册", desc: "不再允许新用户加入", icon: <Lock size={20} /> },
  ];

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-tx-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 注册策略 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-indigo-400" />
          <h2 className="text-lg font-bold text-tx-primary">注册策略</h2>
          {isUpdating && <RefreshCw size={14} className="animate-spin text-accent-primary ml-2" />}
          <AnimatePresence>
            {message && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "text-xs font-medium ml-4 px-2 py-1 rounded-md",
                  message.type === 'success' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                )}
              >
                {message.text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="text-sm text-tx-secondary">控制新用户如何加入系统</p>

        <div className="grid grid-cols-1 gap-3">
          {policies.map(p => (
            <button
              key={p.id}
              disabled={isUpdating}
              onClick={() => handlePolicyChange(p.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left relative overflow-hidden group",
                regPolicy === p.id
                  ? "bg-accent-primary/5 border-accent-primary ring-1 ring-accent-primary/20"
                  : "bg-app-surface border-app-border hover:border-tx-tertiary disabled:opacity-50"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                regPolicy === p.id ? "bg-accent-primary text-white" : "bg-app-bg text-tx-tertiary group-hover:text-tx-secondary"
              )}>
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-tx-primary">{p.title}</p>
                <p className="text-xs text-tx-secondary mt-0.5">{p.desc}</p>
              </div>
              {regPolicy === p.id && (
                <div className="w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center text-white shrink-0">
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 用户列表 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-tx-primary">
              用户列表 <span className="text-tx-tertiary font-normal text-sm ml-1">({users.length})</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="p-2 rounded-lg hover:bg-app-hover text-tx-tertiary transition-colors"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-all shadow-lg shadow-accent-primary/20"
            >
              <Plus size={16} />
              添加用户
            </button>
          </div>
        </div>

        <div className="bg-app-surface rounded-2xl border border-app-border overflow-hidden divide-y divide-app-border shadow-sm">
          {users.map(user => (
            <div key={user.id} className="p-4 flex items-center gap-4 hover:bg-app-hover/50 transition-colors group">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-tx-primary font-bold border",
                user.username === 'admin' ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-app-bg border-app-border"
              )}>
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-tx-primary">{user.username}</span>
                  {user.username === 'admin' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                      <Shield size={10} /> 管理员
                    </span>
                  )}
                  {user.email && (
                    <span className="text-tx-tertiary flex items-center gap-1 text-[10px]">
                      <Mail size={10} /> {user.email}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-tx-tertiary mt-0.5 opacity-60">注册于 {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              {user.username !== 'admin' && (
                <button
                  onClick={() => handleDeleteUser(user.id, user.username)}
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-tx-tertiary hover:text-rose-500 transition-colors"
                >
                  <AlertTriangle size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 提示信息 */}
      <div className="p-6 rounded-2xl bg-app-surface/50 border border-app-border space-y-3">
        {[
          { icon: <UserPlus size={14} />, text: "管理员手动添加的用户不受注册策略限制，可直接登录" },
          { icon: <Shield size={14} />, text: "管理员可以管理用户、修改设置、访问日志等" },
          { icon: <Lock size={14} />, text: "系统至少需要保留一个管理员账号，admin 账号不可删除" },
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-3 text-xs text-tx-secondary">
            <div className="mt-0.5 shrink-0 opacity-60">{tip.icon}</div>
            <p>{tip.text}</p>
          </div>
        ))}
      </div>

      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newUser) => {
          setUsers(prev => [newUser, ...prev]);
          setMessage({ type: 'success', text: "用户添加成功" });
        }}
      />
    </div>
  );
}

// ─── 子组件：添加用户弹窗 ──────────────────────────────────────────────────

function AddUserModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const newUser = await api.createUser({ username, password, email });
      onSuccess(newUser);
      onClose();
      setUsername("");
      setEmail("");
      setPassword("");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      setError(messageText || "创建用户失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-app-surface rounded-3xl border border-app-border shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-tx-primary">添加新用户</h3>
              <p className="text-xs text-tx-secondary mt-1">手动创建一个新的访问账号</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">用户名</label>
              <input
                required
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="例如: john_doe"
                className="w-full bg-app-bg border border-app-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">邮箱 (可选)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="例如: john@example.com"
                className="w-full bg-app-bg border border-app-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">初始密码</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少 6 位字符"
                className="w-full bg-app-bg border border-app-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-xs font-medium">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-2xl border border-app-border text-tx-secondary font-bold text-sm hover:bg-app-hover transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 px-8 py-3 rounded-2xl bg-accent-primary text-white font-bold text-sm hover:bg-accent-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-accent-primary/20"
              >
                {isSubmitting ? <RefreshCw size={18} className="animate-spin mx-auto" /> : "创建用户"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
