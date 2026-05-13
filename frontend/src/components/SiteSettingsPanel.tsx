import React, { useState, useRef } from "react";
import { Camera, Save, Loader2, Globe, Check, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

export default function SiteSettingsPanel() {
  const { t } = useTranslation();
  const { siteConfig, updateSiteConfig } = useSiteSettings();
  const [title, setTitle] = useState(siteConfig.title);
  const [previewIcon, setPreviewIcon] = useState(siteConfig.favicon);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setSaveMessage({ type: 'error', text: t('settings.iconTooLarge') });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewIcon(reader.result as string);
      setSaveMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = () => {
    setPreviewIcon("");
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateSiteConfig(title.trim(), previewIcon);
      setSaveMessage({ type: 'success', text: t('settings.saveSuccess') });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: t('settings.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = title !== siteConfig.title || previewIcon !== siteConfig.favicon;

  return (
    <div className="bg-app-surface rounded-3xl border border-app-border p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
          <Globe size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-tx-primary">{t('settings.siteIdentity')}</h3>
          <p className="text-xs text-tx-secondary mt-1">{t('settings.siteIdentityDesc')}</p>
        </div>
      </div>

      {/* 配置区域 */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* 图标上传 */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-bold text-tx-tertiary uppercase tracking-wider">{t('settings.siteIcon')}</span>
            <div
              className="relative w-24 h-24 rounded-3xl border-2 border-dashed border-app-border flex items-center justify-center overflow-hidden group cursor-pointer hover:border-accent-primary transition-all bg-app-bg shadow-inner"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewIcon ? (
                <img src={previewIcon} alt="Site Icon" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-tx-tertiary">
                  <Camera size={24} />
                  <span className="text-[10px] font-bold">{t('settings.upload')}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/webp"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-tx-tertiary font-medium">PNG/SVG/ICO · &lt;1MB</span>
              {previewIcon && (
                <button
                  onClick={handleRemoveIcon}
                  className="text-[10px] text-rose-500 font-bold hover:text-rose-400 transition-colors"
                >
                  {t('settings.remove')}
                </button>
              )}
            </div>
          </div>

          {/* 名称输入 */}
          <div className="flex-1 space-y-5 w-full">
            <div className="space-y-2">
              <label className="text-xs font-bold text-tx-tertiary uppercase tracking-wider ml-1">{t('settings.siteName')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setSaveMessage(null); }}
                maxLength={20}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-2xl text-sm text-tx-primary focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary outline-none transition-all placeholder:text-tx-tertiary"
                placeholder={t('settings.siteNamePlaceholder')}
              />
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] text-tx-tertiary font-medium">{title.length} / 20</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !title.trim() || !hasChanges}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent-primary/20"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('settings.saveChanges')}
              </button>

              {saveMessage && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-left-2",
                  saveMessage.type === 'success' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                )}>
                  {saveMessage.type === 'success' ? <Check size={14} /> : <RefreshCw size={14} className="animate-spin" />}
                  {saveMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-6 rounded-2xl bg-app-bg/50 border border-app-border border-dashed space-y-3">
        <div className="flex items-start gap-3 text-xs text-tx-tertiary">
          <div className="mt-0.5 shrink-0 opacity-60"><Globe size={14} /></div>
          <p>站点标识将影响浏览器标签页标题、Favicon 以及登录页面的展示。</p>
        </div>
      </div>
    </div>
  );
}
