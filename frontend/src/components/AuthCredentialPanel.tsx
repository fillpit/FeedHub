import React, { useEffect, useState, useCallback } from "react";
import { KeyRound, Plus, Trash2, Edit2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthCredential, AuthCredentialCreate, AuthCredentialUpdate, AuthType } from "@/types/feed";
import { authCredentialApi } from "@/lib/feed-api";

export default function AuthCredentialPanel() {
  const [credentials, setCredentials] = useState<AuthCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<AuthCredential | null>(null);

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await authCredentialApi.list();
      setCredentials(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此凭证？")) return;
    await authCredentialApi.delete(id);
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <KeyRound size={16} className="text-accent-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-tx-primary">授权凭证</h2>
            <p className="text-xs text-tx-tertiary">管理用于抓取受保护页面的凭证</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadCredentials}>
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={() => { setEditingCred(null); setFormOpen(true); }} className="gap-1.5">
            <Plus size={14} />
            新建凭证
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : credentials.length === 0 ? (
          <EmptyState onNew={() => { setEditingCred(null); setFormOpen(true); }} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {credentials.map((cred) => (
                <CredentialCard
                  key={cred.id}
                  credential={cred}
                  onEdit={() => { setEditingCred(cred); setFormOpen(true); }}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {formOpen && (
          <CredentialForm
            credential={editingCred}
            onClose={() => setFormOpen(false)}
            onSave={() => { setFormOpen(false); loadCredentials(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CredentialCard({ credential, onEdit, onDelete }: {
  credential: AuthCredential;
  onEdit: () => void;
  onDelete: (id: number) => void;
}) {
  const typeLabels: Record<AuthType, string> = {
    cookie: "Cookie", token: "Token", basic: "Basic Auth",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group p-4 rounded-xl border border-app-border bg-app-surface hover:border-accent-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-app-hover flex items-center justify-center">
            <KeyRound size={14} className="text-tx-tertiary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-tx-primary">{credential.name}</span>
              <Badge variant="secondary" className="text-xs">{typeLabels[credential.authType]}</Badge>
            </div>
            <p className="text-xs text-tx-tertiary mt-0.5">
              更新于 {new Date(credential.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-tx-primary" onClick={onEdit}>
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-tx-tertiary hover:text-accent-danger" onClick={() => onDelete(credential.id)}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-4">
        <KeyRound size={22} className="text-accent-primary" />
      </div>
      <h3 className="text-sm font-semibold text-tx-primary mb-1">还没有授权凭证</h3>
      <p className="text-xs text-tx-tertiary mb-4">为需要登录的网站配置 Cookie 或 Token</p>
      <Button size="sm" onClick={onNew} className="gap-1.5">
        <Plus size={14} />
        创建第一个凭证
      </Button>
    </div>
  );
}

function CredentialForm({ credential, onClose, onSave }: {
  credential: AuthCredential | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !credential;
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(credential?.name ?? "");
  const [authType, setAuthType] = useState<AuthType>(credential?.authType ?? "cookie");
  const [cred, setCred] = useState<Record<string, string>>(credential?.credential ?? {});
  const [showValues, setShowValues] = useState(false);

  const updateCred = (key: string, value: string) => setCred((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const data: AuthCredentialCreate = { name, authType, credential: cred };
      if (isNew) await authCredentialApi.create(data);
      else if (credential) await authCredentialApi.update(credential.id, data as AuthCredentialUpdate);
      onSave();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-app-surface border-l border-app-border shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <h3 className="text-sm font-semibold text-tx-primary">{isNew ? "新建授权凭证" : `编辑 · ${credential?.name}`}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><Eye size={16} className="hidden" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tx-secondary">凭证名称 *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：内网 Cookie"
              className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tx-secondary">类型</label>
            <select value={authType} onChange={(e) => { setAuthType(e.target.value as AuthType); setCred({}); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none">
              <option value="cookie">Cookie</option>
              <option value="token">Bearer Token</option>
              <option value="basic">Basic Auth</option>
            </select>
          </div>
          <div className="space-y-3 p-3 rounded-lg border border-app-border bg-app-bg/50">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-tx-tertiary uppercase tracking-wider">凭证值</p>
              <button onClick={() => setShowValues(!showValues)} className="text-[11px] text-tx-tertiary hover:text-tx-primary flex items-center gap-1">
                {showValues ? <EyeOff size={11} /> : <Eye size={11} />}
                {showValues ? "隐藏" : "显示"}
              </button>
            </div>
            {authType === "cookie" && (
              <CredInput label="Cookie 字符串" field="cookie" value={cred.cookie ?? ""} onChange={(v) => updateCred("cookie", v)} show={showValues} multiline />
            )}
            {authType === "token" && (
              <CredInput label="Token" field="token" value={cred.token ?? ""} onChange={(v) => updateCred("token", v)} show={showValues} />
            )}
            {authType === "basic" && (
              <>
                <CredInput label="用户名" field="username" value={cred.username ?? ""} onChange={(v) => updateCred("username", v)} show />
                <CredInput label="密码" field="password" value={cred.password ?? ""} onChange={(v) => updateCred("password", v)} show={showValues} />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app-border">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : null}
            保存
          </Button>
        </div>
      </motion.div>
    </>
  );
}

function CredInput({ label, value, onChange, show, multiline }: {
  label: string; field: string; value: string; onChange: (v: string) => void; show: boolean; multiline?: boolean;
}) {
  const baseClass = "w-full px-2 py-1.5 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary";
  return (
    <div>
      <label className="text-[10px] text-tx-tertiary">{label}</label>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4}
            className={`${baseClass} resize-none font-mono`}
            style={{ WebkitTextSecurity: show ? undefined : "disc" } as React.CSSProperties} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? "text" : "password"}
            className={`${baseClass} font-mono`} />
      }
    </div>
  );
}
