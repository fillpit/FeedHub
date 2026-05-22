import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteParam } from "@/types/feed";

interface Props {
  params: RouteParam[];
  onChange: (params: RouteParam[]) => void;
}

export default function RouteParamEditor({ params, onChange }: Props) {
  const handleAdd = () => {
    onChange([
      ...params,
      { name: "", type: "string", required: false, defaultValue: "", description: "" },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(params.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<RouteParam>) => {
    onChange(
      params.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-tx-secondary uppercase tracking-wider">
          请求参数 ({params.length})
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-7 px-2.5 text-xs gap-1"
        >
          <Plus size={12} />
          添加参数
        </Button>
      </div>

      {params.length === 0 ? (
        <div className="p-4 text-center rounded-xl border border-dashed border-app-border bg-app-bg/20">
          <p className="text-xs text-tx-tertiary">未配置任何参数，此路由将不接收自定义参数。</p>
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto pr-1">
          {params.map((param, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-app-border bg-app-bg/40 space-y-2 relative group"
            >
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-2.5 right-2.5 text-tx-tertiary hover:text-accent-danger p-1 rounded-lg hover:bg-app-hover transition-colors"
              >
                <Trash2 size={13} />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-tx-tertiary">参数名称 *</span>
                  <input
                    value={param.name}
                    onChange={(e) => handleUpdate(idx, { name: e.target.value })}
                    placeholder="limit"
                    className="w-full px-2 py-1 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-tx-tertiary">参数类型</span>
                  <select
                    value={param.type}
                    onChange={(e) => handleUpdate(idx, { type: e.target.value as RouteParam["type"] })}
                    className="w-full px-2 py-1 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <span className="text-[10px] text-tx-tertiary">默认值</span>
                  <input
                    value={param.defaultValue ?? ""}
                    onChange={(e) => handleUpdate(idx, { defaultValue: e.target.value })}
                    placeholder="10"
                    className="w-full px-2 py-1 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  />
                </div>
                <div className="flex items-center justify-center pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={(e) => handleUpdate(idx, { required: e.target.checked })}
                      className="rounded border-app-border text-accent-primary focus:ring-accent-primary w-3.5 h-3.5"
                    />
                    <span className="text-[10px] text-tx-secondary font-medium">必填</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-tx-tertiary">参数描述</span>
                <input
                  value={param.description ?? ""}
                  onChange={(e) => handleUpdate(idx, { description: e.target.value })}
                  placeholder="限制返回数量"
                  className="w-full px-2 py-1 text-xs rounded border border-app-border bg-app-surface text-tx-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
