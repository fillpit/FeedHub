import React, { useState, useEffect, useCallback } from "react";
import { Link2, Copy, Check, Trash2, Shield, Clock, Eye, EyeOff, Globe, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { api, getServerUrl } from "@/lib/api";
import { Share, SharePermission } from "@/types";
import { cn, copyToClipboard as globalCopyToClipboard } from "@/lib/utils";

interface ShareModalProps {
  noteId: string;
  noteTitle: string;
  onClose: () => void;
}

export default function ShareModal({ noteId, noteTitle, onClose }: ShareModalProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [permission, setPermission] = useState<SharePermission>("view");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>("");
  const [maxViews, setMaxViews] = useState<string>("");

  const loadShares = useCallback(async () => {
    try {
      const data = await api.getSharesByNote(noteId);
      setShares(data);
    } catch (e) {
      console.error("加载分享列表失败:", e);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const getShareUrl = (shareToken: string) => {
    const serverUrl = getServerUrl();
    const baseUrl = serverUrl || window.location.origin;
    return `${baseUrl}/share/${shareToken}`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    const success = await globalCopyToClipboard(text);
    if (success) {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      let expiresAt: string | undefined;
      if (expiresIn) {
        const date = new Date();
        const hours = parseInt(expiresIn);
        date.setHours(date.getHours() + hours);
        expiresAt = date.toISOString();
      }

      await api.createShare({
        noteId,
        permission,
        password: password || undefined,
        expiresAt,
        maxViews: maxViews ? parseInt(maxViews) : undefined,
      });

      setPassword("");
      setExpiresIn("");
      setMaxViews("");
      setPermission("view");
      await loadShares();
    } catch (e) {
      console.error("创建分享失败:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteShare(id);
      setShares((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("删除分享失败:", e);
    }
  };

  const handleToggleActive = async (share: Share) => {
    try {
      const updated = await api.updateShare(share.id, { isActive: share.isActive ? 0 : 1 });
      setShares((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) {
      console.error("更新分享状态失败:", e);
    }
  };

  const permissionLabels: Record<SharePermission, string> = {
    view: "仅查看",
    comment: "可评论",
    edit: "可编辑",
  };

  const expiresOptions = [
    { value: "", label: "永不过期" },
    { value: "1", label: "1小时" },
    { value: "24", label: "1天" },
    { value: "168", label: "7天" },
    { value: "720", label: "30天" },
  ];

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      size="lg"
      className="max-w-lg"
      title="分享笔记"
      description={noteTitle}
    >
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-4 border-b border-app-border">
          <h3 className="text-xs font-medium text-tx-secondary mb-3 flex items-center gap-1.5">
            <Link2 size={13} />
            创建分享链接
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-tx-tertiary w-16 shrink-0">权限</label>
              <div className="flex gap-1.5 flex-1">
                {(["view", "comment", "edit"] as SharePermission[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPermission(p)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors flex-1",
                      permission === p
                        ? "bg-accent-primary/10 border-accent-primary/30 text-accent-primary font-medium"
                        : "border-app-border text-tx-tertiary hover:bg-app-hover hover:text-tx-secondary"
                    )}
                  >
                    {permissionLabels[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-tx-tertiary w-16 shrink-0 flex items-center gap-1">
                <Shield size={11} />
                密码
              </label>
              <div className="relative flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="留空则无需密码"
                  className="w-full h-8 px-3 pr-8 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary/50 focus:outline-none focus:border-accent-primary/50"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-tx-tertiary hover:text-tx-secondary"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-tx-tertiary w-16 shrink-0 flex items-center gap-1">
                <Clock size={11} />
                有效期
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="flex-1 h-8 px-3 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:border-accent-primary/50"
              >
                {expiresOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-tx-tertiary w-16 shrink-0 flex items-center gap-1">
                <Eye size={11} />
                次数
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)}
                placeholder="不限制"
                className="flex-1 h-8 px-3 text-xs rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary/50 focus:outline-none focus:border-accent-primary/50"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating}
              className="w-full h-9 text-xs font-medium bg-accent-primary hover:bg-accent-primary/90 text-white"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin mr-1.5" />
              ) : (
                <Link2 size={14} className="mr-1.5" />
              )}
              {creating ? "创建中..." : "生成分享链接"}
            </Button>
          </div>
        </div>

        <div className="px-5 py-4">
          <h3 className="text-xs font-medium text-tx-secondary mb-3">
            已创建的分享 {shares.length > 0 && <span className="text-tx-tertiary">({shares.length})</span>}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-tx-tertiary" />
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8">
              <Globe size={28} className="mx-auto mb-2 text-tx-tertiary/30" />
              <p className="text-xs text-tx-tertiary">还没有分享链接</p>
              <p className="text-[10px] text-tx-tertiary/60 mt-0.5">点击上方按钮创建</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shares.map((share) => (
                <ShareItem
                  key={share.id}
                  share={share}
                  shareUrl={getShareUrl(share.shareToken)}
                  copied={copied}
                  onCopy={copyToClipboard}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function ShareItem({
  share,
  shareUrl,
  copied,
  onCopy,
  onDelete,
  onToggleActive,
}: {
  share: Share;
  shareUrl: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (share: Share) => void;
}) {
  const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();
  const isMaxed = share.maxViews && share.viewCount >= share.maxViews;
  const isInactive = !share.isActive || isExpired || isMaxed;

  const permissionColors: Record<string, string> = {
    view: "bg-blue-500/10 text-blue-500",
    comment: "bg-amber-500/10 text-amber-500",
    edit: "bg-green-500/10 text-green-500",
  };

  const permissionLabels: Record<string, string> = {
    view: "仅查看",
    comment: "可评论",
    edit: "可编辑",
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isInactive
          ? "border-app-border/50 bg-app-bg/50 opacity-60"
          : "border-app-border bg-app-bg hover:border-accent-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <code className="text-[11px] text-tx-secondary truncate flex-1 font-mono">{shareUrl}</code>
            <button
              onClick={() => onCopy(shareUrl, share.id)}
              className="shrink-0 p-1 rounded hover:bg-app-hover text-tx-tertiary hover:text-tx-secondary transition-colors"
              title="复制链接"
            >
              {copied === share.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1 rounded hover:bg-app-hover text-tx-tertiary hover:text-tx-secondary transition-colors"
              title="新窗口打开"
            >
              <ExternalLink size={13} />
            </a>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-medium", permissionColors[share.permission])}>
              {permissionLabels[share.permission]}
            </span>
            {share.hasPassword && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-orange-500/10 text-orange-500">
                🔒 密码保护
              </span>
            )}
            {share.expiresAt && (
              <span className={cn(
                "px-1.5 py-0.5 text-[10px] rounded-md",
                isExpired ? "bg-red-500/10 text-red-500" : "bg-tx-tertiary/10 text-tx-tertiary"
              )}>
                {isExpired ? "已过期" : `${formatDate(share.expiresAt)} 到期`}
              </span>
            )}
            {share.maxViews && (
              <span className={cn(
                "px-1.5 py-0.5 text-[10px] rounded-md",
                isMaxed ? "bg-red-500/10 text-red-500" : "bg-tx-tertiary/10 text-tx-tertiary"
              )}>
                {share.viewCount}/{share.maxViews} 次访问
              </span>
            )}
            {!share.maxViews && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-tx-tertiary/10 text-tx-tertiary">
                {share.viewCount} 次访问
              </span>
            )}
            {!share.isActive && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-red-500/10 text-red-500">
                已停用
              </span>
            )}
          </div>

          <p className="text-[10px] text-tx-tertiary/60 mt-1.5">
            创建于 {formatDate(share.createdAt)}
          </p>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onToggleActive(share)}
            className={cn(
              "p-1.5 rounded-md transition-colors text-xs",
              share.isActive
                ? "hover:bg-amber-500/10 text-amber-500"
                : "hover:bg-green-500/10 text-green-500"
            )}
            title={share.isActive ? "停用分享" : "启用分享"}
          >
            {share.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => onDelete(share.id)}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-colors"
            title="删除分享"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
