import React from "react";
import { Layers, Users, Activity, BarChart4 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-app-bg text-tx-primary p-8 overflow-y-auto">
      <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col items-start gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            欢迎回来
          </h1>
          <p className="text-tx-secondary text-base">
            这是一个标准的全栈项目模板，你可以在这里快速开始你的业务开发。
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 flex flex-col gap-3 rounded-2xl bg-app-surface/50 border border-app-border hover:border-accent-primary/50 transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-tx-secondary mb-1">总用户数</p>
              <h3 className="text-2xl font-semibold text-tx-primary">1,248</h3>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-3 rounded-2xl bg-app-surface/50 border border-app-border hover:border-accent-primary/50 transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-tx-secondary mb-1">今日活跃</p>
              <h3 className="text-2xl font-semibold text-tx-primary">142</h3>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-3 rounded-2xl bg-app-surface/50 border border-app-border hover:border-accent-primary/50 transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <BarChart4 size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-tx-secondary mb-1">系统负载</p>
              <h3 className="text-2xl font-semibold text-tx-primary">24%</h3>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-3 rounded-2xl bg-app-surface/50 border border-app-border hover:border-accent-primary/50 transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-tx-secondary mb-1">数据库连接数</p>
              <h3 className="text-2xl font-semibold text-tx-primary">8</h3>
            </div>
          </div>
        </div>

        {/* Quick Actions Placeholder */}
        <div className="p-6 rounded-2xl bg-app-elevated border border-app-border shadow-sm flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-tx-primary border-b border-app-border pb-4">快速操作</h2>
          <div className="flex gap-4">
            <Button className="bg-accent-primary text-white hover:bg-accent-primary/90">
              查看报表
            </Button>
            <Button variant="outline" className="text-tx-secondary border-app-border hover:bg-app-hover">
              系统设置
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
