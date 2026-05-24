import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, Key, Loader2, CheckCircle2, Eye, EyeOff, User, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { User as UserType } from "@/types";
import { cn } from "@/lib/utils";
import { useAppActions } from "@/store/AppContext";

export default function SecuritySettings() {
  const { t } = useTranslation();
  const actions = useAppActions();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [previewAvatar, setPreviewAvatar] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMe().then(user => {
      setCurrentUser(user);
      setPreviewAvatar(user.avatarUrl || "");
      setNewUsername(user.username);
    }).catch(() => { /* ignore */ });
  }, []);

  const triggerShake = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      triggerShake(t('settings.iconTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const hasAvatarChange = previewAvatar !== (currentUser?.avatarUrl || "");
    const hasUsernameChange = newUsername !== currentUser?.username && !!newUsername;
    const hasPasswordChange = !!newPassword;

    if (!hasAvatarChange && !hasUsernameChange && !hasPasswordChange) {
      return triggerShake(t('securitySettings.noChanges'));
    }

    if (hasUsernameChange || hasPasswordChange) {
      if (!currentPassword) {
        return triggerShake(t('securitySettings.currentPasswordRequired'));
      }
      if (hasPasswordChange) {
        if (newPassword.length < 6) {
          return triggerShake(t('securitySettings.passwordTooShort'));
        }
        if (newPassword !== confirmPassword) {
          return triggerShake(t('securitySettings.passwordNotMatch'));
        }
      }
    }

    setIsLoading(true);

    try {
      if (hasAvatarChange) {
        await api.updateMe({ avatarUrl: previewAvatar });
      }

      if (hasUsernameChange || hasPasswordChange) {
        await api.updateSecurity({ 
          currentPassword, 
          newUsername: hasUsernameChange ? newUsername : undefined, 
          newPassword: hasPasswordChange ? newPassword : undefined 
        });
        setSuccess(true);
        setTimeout(() => {
          localStorage.removeItem("nowen-token");
          window.location.reload();
        }, 2000);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        const updatedUser = await api.getMe();
        setCurrentUser(updatedUser);
        actions.setUser(updatedUser);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      triggerShake(message || t('securitySettings.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-tx-primary mb-1">{t('securitySettings.title')}</h3>
        <p className="text-sm text-tx-secondary mb-6">{t('securitySettings.description')}</p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6 max-w-md"
        animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={shake ? { duration: 0.5 } : {}}
      >
        {/* 头像配置 */}
        <div className="flex items-center gap-6 p-4 rounded-2xl bg-app-surface/50 border border-app-border shadow-sm transition-all hover:bg-app-hover">
           <div 
             className="relative w-20 h-20 rounded-3xl border-2 border-dashed border-app-border flex items-center justify-center overflow-hidden group cursor-pointer hover:border-accent-primary transition-all bg-app-bg shadow-inner"
             onClick={() => fileInputRef.current?.click()}
           >
             {previewAvatar ? (
               <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <User size={32} className="text-tx-tertiary" />
             )}
             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
               <Camera size={20} className="text-white" />
             </div>
           </div>
           <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleImageChange} 
             accept="image/*" 
             className="hidden" 
           />
           <div className="flex-1">
             <div className="text-sm font-bold text-tx-primary tracking-tight">{t('securitySettings.avatar')}</div>
             <p className="text-[11px] text-tx-secondary leading-relaxed mt-1 font-medium">{t('securitySettings.avatarDesc')}</p>
           </div>
        </div>

        <div className="space-y-4">
          {/* 用户名 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">{t('securitySettings.newUsername')}</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-tx-tertiary group-focus-within:text-accent-primary transition-colors" />
              </div>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-app-border rounded-xl bg-app-bg text-tx-primary placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all text-sm shadow-sm"
                placeholder={t('securitySettings.newUsernamePlaceholder')}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-app-border to-transparent my-6" />

          {/* 新密码 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">{t('securitySettings.newPassword')}</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-tx-tertiary group-focus-within:text-accent-primary transition-colors" />
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-app-border rounded-xl bg-app-bg text-tx-primary placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all text-sm shadow-sm"
                placeholder={t('securitySettings.newPasswordPlaceholder')}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-tx-tertiary hover:text-tx-primary transition-colors"
              >
                {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {newPassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-1.5 overflow-hidden"
            >
              <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">{t('securitySettings.confirmPassword')}</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-tx-tertiary group-focus-within:text-accent-primary transition-colors" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-app-bg text-tx-primary placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all text-sm shadow-sm",
                    confirmPassword && newPassword !== confirmPassword ? "border-accent-danger/50" : "border-app-border"
                  )}
                  placeholder={t('securitySettings.confirmPasswordPlaceholder')}
                />
              </div>
            </motion.div>
          )}

          <div className="h-px w-full bg-gradient-to-r from-transparent via-app-border to-transparent my-6" />

          {/* 当前密码验证 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tx-secondary uppercase tracking-wider ml-1">
              {t('securitySettings.currentPassword')} {(newUsername !== currentUser?.username || newPassword) && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Shield className="h-4 w-4 text-tx-tertiary group-focus-within:text-accent-primary transition-colors" />
              </div>
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={cn(
                  "block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-app-bg text-tx-primary placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all text-sm shadow-sm",
                  error && !currentPassword ? "border-accent-danger/50 shadow-accent-danger/10" : "border-app-border"
                )}
                placeholder={t('securitySettings.currentPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-tx-tertiary hover:text-tx-primary transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-[11px] font-bold text-accent-danger shadow-sm"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading || success}
          className={cn(
            "w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-[0.98]",
            success ? "bg-emerald-500 shadow-emerald-500/20" : "bg-accent-primary hover:bg-accent-primary/90 shadow-accent-primary/20"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : success ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{t('securitySettings.successMessage')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>{t('securitySettings.saveButton')}</span>
            </div>
          )}
        </button>
      </motion.form>
    </div>
  );
}
