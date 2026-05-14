import React, { useState, useEffect, useCallback, useRef } from "react";
import { Database, RefreshCw, Plus, Download, RefreshCcw, Trash2, Check, AlertCircle, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { BackupItem } from "@/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "./ConfirmModal";

const TYPE_DB_ONLY = "db-only" as const;
const TYPE_FULL = "full" as const;
const MSG_DURATION = 3000;

interface MessageState {
  type: "success" | "error";
  text: string;
}

export default function BackupPanel() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [backupType, setBackupType] = useState<"db-only" | "full">(TYPE_DB_ONLY);
  const [description, setDescription] = useState("");

  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getBackups();
      setBackups(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg || "获取备份失败" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), MSG_DURATION);
    return () => clearTimeout(timer);
  }, [message]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    try {
      const newBackup = await api.createBackup({ type: backupType, description });
      setBackups((prev) => [newBackup, ...prev]);
      setDescription("");
      setMessage({ type: "success", text: "备份创建成功" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg || "创建失败" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    try {
      await api.restoreBackup(confirmRestore);
      setMessage({ type: "success", text: "恢复成功，请刷新页面" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg || "恢复失败" });
    } finally {
      setConfirmRestore(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteBackup(confirmDelete);
      setBackups((prev) => prev.filter((b) => b.filename !== confirmDelete));
      setMessage({ type: "success", text: "删除成功" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg || "删除失败" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleUpload = async (file: File) => {
    setIsCreating(true);
    try {
      const newBackup = await api.uploadBackup(file);
      setBackups((prev) => [newBackup, ...prev]);
      setMessage({ type: "success", text: "备份文件上传成功" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg || "上传失败" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PanelHeader
        message={message}
        onRefresh={fetchBackups}
        isLoading={isLoading}
        onUpload={handleUpload}
        isCreating={isCreating}
      />
      <CreateForm
        backupType={backupType}
        description={description}
        isCreating={isCreating}
        onTypeChange={setBackupType}
        onDescChange={setDescription}
        onSubmit={handleCreate}
      />
      <BackupList
        backups={backups}
        isLoading={isLoading}
        onRestore={setConfirmRestore}
        onDelete={setConfirmDelete}
      />
      <ConfirmModal
        isOpen={!!confirmRestore}
        title="确认恢复备份"
        message={`确定要恢复快照 "${confirmRestore}" 吗？当前系统数据将被完全覆盖。`}
        confirmText="确认恢复"
        confirmVariant="warning"
        onConfirm={handleRestore}
        onClose={() => setConfirmRestore(null)}
      />
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="确认删除备份"
        message={`确定要永久删除备份 "${confirmDelete}" 吗？此操作无法撤销。`}
        confirmText="永久删除"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function PanelHeader({
  message,
  onRefresh,
  isLoading,
  onUpload,
  isCreating,
}: {
  message: MessageState | null;
  onRefresh: () => void;
  isLoading: boolean;
  onUpload: (file: File) => void;
  isCreating: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center justify-between pb-4 border-b border-app-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
          <Database size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-tx-primary">备份与恢复</h2>
            <AnimatePresence>
              {message && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-md",
                    message.type === "success"
                      ? "text-emerald-500 bg-emerald-500/10"
                      : "text-rose-500 bg-rose-500/10"
                  )}
                >
                  {message.text}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="text-xs text-tx-secondary mt-0.5">创建数据快照，随时还原系统状态</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".bak,.json"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isCreating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border bg-app-surface text-tx-secondary hover:text-tx-primary hover:bg-app-hover transition-all text-xs font-bold disabled:opacity-50"
          title="上传备份文件"
        >
          <Upload size={16} />
          <span>上传备份</span>
        </button>
        <button
          onClick={onRefresh}
          disabled={isLoading || isCreating}
          className="p-2 rounded-xl hover:bg-app-hover text-tx-tertiary transition-colors disabled:opacity-50"
          title="刷新列表"
        >
          <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}

function CreateForm({
  backupType,
  description,
  isCreating,
  onTypeChange,
  onDescChange,
  onSubmit,
}: {
  backupType: "db-only" | "full";
  description: string;
  isCreating: boolean;
  onTypeChange: (type: "db-only" | "full") => void;
  onDescChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="p-6 rounded-3xl bg-app-surface border border-app-border space-y-4">
      <h3 className="text-sm font-bold text-tx-primary">创建新备份</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onTypeChange(TYPE_DB_ONLY)}
          className={cn(
            "p-4 rounded-2xl border transition-all text-left flex items-center justify-between",
            backupType === TYPE_DB_ONLY
              ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/20"
              : "border-app-border bg-app-bg hover:border-tx-tertiary"
          )}
        >
          <div>
            <p className="text-sm font-bold text-tx-primary">仅数据库备份</p>
            <p className="text-xs text-tx-secondary mt-0.5">速度快，仅备份 SQLite 数据</p>
          </div>
          {backupType === TYPE_DB_ONLY && <Check size={16} className="text-accent-primary" />}
        </button>
        <button
          type="button"
          onClick={() => onTypeChange(TYPE_FULL)}
          className={cn(
            "p-4 rounded-2xl border transition-all text-left flex items-center justify-between",
            backupType === TYPE_FULL
              ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/20"
              : "border-app-border bg-app-bg hover:border-tx-tertiary"
          )}
        >
          <div>
            <p className="text-sm font-bold text-tx-primary">全量备份</p>
            <p className="text-xs text-tx-secondary mt-0.5">包含数据库、字体及全部静态资源</p>
          </div>
          {backupType === TYPE_FULL && <Check size={16} className="text-accent-primary" />}
        </button>
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={description}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="备注说明 (可选)..."
          className="flex-1 bg-app-bg border border-app-border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-accent-primary text-white text-sm font-bold hover:bg-accent-primary/90 transition-all shadow-lg shadow-accent-primary/20 disabled:opacity-50"
        >
          <Plus size={16} />
          {isCreating ? "创建中..." : "创建备份"}
        </button>
      </div>
    </form>
  );
}

function BackupList({
  backups,
  isLoading,
  onRestore,
  onDelete,
}: {
  backups: BackupItem[];
  isLoading: boolean;
  onRestore: (filename: string) => void;
  onDelete: (filename: string) => void;
}) {
  if (isLoading && backups.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-tx-tertiary" />
      </div>
    );
  }

  if (backups.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-tx-tertiary bg-app-surface/40 rounded-3xl border border-app-border border-dashed gap-3">
        <AlertCircle size={32} className="opacity-40" />
        <p className="text-sm font-medium">暂无备份记录</p>
      </div>
    );
  }

  return (
    <div className="bg-app-surface rounded-3xl border border-app-border overflow-hidden divide-y divide-app-border shadow-sm">
      {backups.map((item) => (
        <BackupRow key={item.filename} item={item} onRestore={onRestore} onDelete={onDelete} />
      ))}
    </div>
  );
}

function BackupRow({
  item,
  onRestore,
  onDelete,
}: {
  item: BackupItem;
  onRestore: (filename: string) => void;
  onDelete: (filename: string) => void;
}) {
  const sizeMb = (item.size / (1024 * 1024)).toFixed(2);
  const dateStr = new Date(item.createdAt).toLocaleString();

  return (
    <div className="p-4 flex items-center justify-between hover:bg-app-hover/50 transition-colors gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-app-bg border border-app-border flex items-center justify-center text-tx-tertiary shrink-0">
          <Database size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-tx-primary truncate">{item.filename}</span>
            <span className="px-2 py-0.5 rounded-full bg-app-bg border border-app-border text-[10px] text-tx-secondary font-bold uppercase tracking-wide">
              {item.type === TYPE_FULL ? "全量" : "数据库"}
            </span>
          </div>
          <p className="text-xs text-tx-tertiary mt-0.5 truncate">
            {dateStr} · {sizeMb} MB {item.description ? `· ${item.description}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={api.getBackupDownloadUrl(item.filename)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-app-hover text-tx-tertiary hover:text-tx-primary transition-colors flex items-center gap-1 text-xs font-medium"
          title="下载"
        >
          <Download size={16} />
        </a>
        <button
          onClick={() => onRestore(item.filename)}
          className="p-2 rounded-lg hover:bg-amber-500/10 text-tx-tertiary hover:text-amber-500 transition-colors"
          title="恢复"
        >
          <RefreshCcw size={16} />
        </button>
        <button
          onClick={() => onDelete(item.filename)}
          className="p-2 rounded-lg hover:bg-rose-500/10 text-tx-tertiary hover:text-rose-500 transition-colors"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
