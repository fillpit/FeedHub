import React, { useEffect, useState, useCallback } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DynamicRoute, DynamicRouteCreate, DynamicRouteUpdate, RouteParam, AuthCredential } from "@/types/feed";
import { dynamicRouteApi, authCredentialApi } from "@/lib/feed-api";
import { cn } from "@/lib/utils";
import RouteParamEditor from "./RouteParamEditor";

interface Props {
  route: DynamicRoute | null;
  onClose: () => void;
  onSave: (route: DynamicRoute) => void;
}

export default function DynamicRouteForm({ route, onClose, onSave }: Props) {
  const isNew = !route;
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(route?.name ?? "");
  const [routePath, setRoutePath] = useState(route?.path ?? "/");
  const [description, setDescription] = useState(route?.description ?? "");
  const [refreshInterval, setRefreshInterval] = useState(route?.refreshInterval ?? 60);
  const [authCredentialId, setAuthCredentialId] = useState<number | undefined>(route?.authCredentialId);
  const [params, setParams] = useState<RouteParam[]>(route?.params ?? []);
  const [source, setSource] = useState<"local" | "github">(route?.script.source ?? "local");
  const [githubConfig, setGithubConfig] = useState(route?.script.githubConfig ?? {
    owner: "", repo: "", branch: "main", path: ""
  });
  const [credentials, setCredentials] = useState<AuthCredential[]>([]);

  // Load available credentials list
  useEffect(() => {
    authCredentialApi.list()
      .then(setCredentials)
      .catch((err) => console.error("加载授权凭证失败", err));
  }, []);

  useEffect(() => {
    if (route) {
      setName(route.name);
      setRoutePath(route.path);
      setDescription(route.description ?? "");
      setRefreshInterval(route.refreshInterval);
      setParams(route.params ?? []);
      setAuthCredentialId(route.authCredentialId);
      setSource(route.script.source ?? "local");
      setGithubConfig(route.script.githubConfig ?? { owner: "", repo: "", branch: "main", path: "" });
    }
  }, [route]);

  const handleSaveConfig = useCallback(async () => {
    if (!name.trim() || !routePath.trim()) return;
    
    // Validate that parameter names are not empty
    const hasEmptyParam = params.some((p) => !p.name.trim());
    if (hasEmptyParam) {
      alert("所有配置的参数名均不能为空！");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await dynamicRouteApi.create({
          name,
          path: routePath,
          method: "GET",
          params,
          script: { 
            sourceType: "inline", 
            source, 
            githubConfig: source === "github" ? githubConfig : undefined,
            folder: "", 
            timeout: 30000 
          },
          description,
          refreshInterval,
          authCredentialId: authCredentialId || null,
        } as DynamicRouteCreate);
        onSave(created);
      } else if (route) {
        const updated = await dynamicRouteApi.update(route.id, {
          name,
          path: routePath,
          params,
          script: route.script ? {
            ...route.script,
            source,
            githubConfig: source === "github" ? githubConfig : undefined,
          } : undefined,
          description,
          refreshInterval,
          authCredentialId: authCredentialId || null,
        } as DynamicRouteUpdate);
        onSave(updated);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [name, routePath, params, description, refreshInterval, authCredentialId, isNew, route, onSave, githubConfig, source]);

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      position="right"
      size="md"
      title={isNew ? "新建动态路由" : `编辑 · ${route?.name}`}
      description={isNew ? "配置基础参数，保存后可开始编辑脚本" : `路径: ${route?.path}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSaveConfig} disabled={isSaving} className="gap-1.5 min-w-20">
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {isNew ? "创建并继续" : "保存"}
          </Button>
        </>
      }
      bodyClassName="p-6 space-y-5"
    >
      <div className="space-y-2">
        <label className="text-xs font-medium text-tx-secondary">路由名称 *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：GitHub Trending"
          className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-tx-secondary flex items-center gap-1">
          <span className="text-accent-danger font-bold">*</span>
          路由路径
        </label>
        <div className="flex rounded-lg border border-app-border overflow-hidden bg-app-bg focus-within:ring-1 focus-within:ring-accent-primary transition-all">
          <span className="flex items-center justify-center px-3.5 bg-app-surface border-r border-app-border text-xs text-tx-tertiary font-mono select-none">
            /dynamic
          </span>
          <input
            value={routePath}
            onChange={(e) => setRoutePath(e.target.value)}
            placeholder="/guokr/science"
            className="flex-1 px-3 py-2 text-sm bg-transparent text-tx-primary placeholder:text-tx-tertiary font-mono outline-none"
          />
        </div>
        <p className="text-[11px] text-tx-tertiary leading-relaxed">
          路由路径格式说明： 路径以 / 开头，支持动态参数（如 :uid、:id），动态参数会自动传递给脚本的 routeParams 变量。访问地址: /api/dynamic/sub{routePath}
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-tx-secondary">描述（可选）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="这个路由的用途说明..."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary placeholder:text-tx-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-tx-secondary">刷新间隔（分钟）</label>
          <input
            type="number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            min={1}
            max={10080}
            className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-tx-secondary">授权凭证（可选）</label>
          <select
            value={authCredentialId ?? ""}
            onChange={(e) => setAuthCredentialId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">无</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 脚本来源配置 */}
      <div className="space-y-4 pt-2 pb-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-tx-secondary uppercase tracking-wider">脚本来源</label>
          <div className="flex bg-app-surface border border-app-border rounded-lg p-0.5">
            <button
              onClick={() => setSource("local")}
              className={cn(
                "px-3 py-1 text-[10px] font-medium rounded-md transition-all",
                source === "local" ? "bg-app-bg text-accent-primary shadow-sm" : "text-tx-tertiary hover:text-tx-secondary"
              )}
            >
              本地/上传
            </button>
            <button
              onClick={() => setSource("github")}
              className={cn(
                "px-3 py-1 text-[10px] font-medium rounded-md transition-all",
                source === "github" ? "bg-app-bg text-accent-primary shadow-sm" : "text-tx-tertiary hover:text-tx-secondary"
              )}
            >
              GitHub 同步
            </button>
          </div>
        </div>

        {source === "github" && (
          <div className="space-y-3 p-4 rounded-xl border border-dashed border-app-border bg-app-surface/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-tx-tertiary">Owner *</label>
                <input
                  value={githubConfig.owner}
                  onChange={(e) => setGithubConfig({ ...githubConfig, owner: e.target.value })}
                  placeholder="例如: google"
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-tx-tertiary">Repo *</label>
                <input
                  value={githubConfig.repo}
                  onChange={(e) => setGithubConfig({ ...githubConfig, repo: e.target.value })}
                  placeholder="例如: feed-hub"
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-tx-tertiary">Branch</label>
                <input
                  value={githubConfig.branch}
                  onChange={(e) => setGithubConfig({ ...githubConfig, branch: e.target.value })}
                  placeholder="main"
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-tx-tertiary">Sub Path (可选)</label>
                <input
                  value={githubConfig.path}
                  onChange={(e) => setGithubConfig({ ...githubConfig, path: e.target.value })}
                  placeholder="scripts/my-script"
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-tx-tertiary">Access Token (私有仓库可选)</label>
              <input
                type="password"
                value={githubConfig.token || ""}
                onChange={(e) => setGithubConfig({ ...githubConfig, token: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-2 py-1.5 text-xs rounded-md border border-app-border bg-app-bg text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-app-border" />

      {/* Route Params Editor */}
      <RouteParamEditor params={params} onChange={setParams} />
    </Dialog>
  );
}
