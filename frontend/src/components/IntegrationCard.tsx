import React, { useState } from "react";
import { Copy, Check, ChevronsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  readonly text: string;
  readonly tooltip?: string;
}

/**
 * Copy button with state and tooltips
 */
export const CopyButton: React.FC<CopyButtonProps> = ({ text, tooltip = "复制" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-2 rounded-lg bg-app-surface border border-app-border text-tx-secondary hover:text-accent-primary hover:border-accent-primary/30 transition-all duration-300 relative group shadow-sm flex items-center justify-center"
      )}
      title={tooltip}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in duration-300" />
      ) : (
        <Copy className="w-3.5 h-3.5 transition-transform group-hover:scale-105" />
      )}
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 px-2 py-1 text-[10px] font-semibold text-white bg-zinc-900 rounded-md shadow-lg transition-transform duration-200 pointer-events-none whitespace-nowrap">
        {copied ? "已复制!" : tooltip}
      </span>
    </button>
  );
};

interface IntegrationCardProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly badgeText: string;
  readonly isActive: boolean;
  readonly content: React.ReactNode;
  readonly instructions?: React.ReactNode;
}

/**
 * Single integration configuration card component with dynamic collapsing details
 */
export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  icon,
  title,
  description,
  badgeText,
  isActive,
  content,
  instructions,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Title block */}
      <div className="flex items-center gap-2 flex-wrap">
        {icon}
        <h4 className="text-sm font-bold text-tx-primary leading-none">{title}</h4>

        {/* Status badge */}
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors",
            isActive
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-app-hover text-tx-tertiary border-app-border"
          )}
        >
          <span className="relative flex h-1.5 w-1.5 mr-1">
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-1.5 w-1.5",
                isActive ? "bg-emerald-500" : "bg-tx-tertiary"
              )}
            ></span>
          </span>
          {badgeText}
        </span>
      </div>

      {/* Subtitle / Description */}
      <p className="text-xs text-tx-secondary leading-relaxed w-full">{description}</p>

      {/* Configuration Details wrapped in its own card container */}
      <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-sm space-y-4">
        {content}

        {instructions && (
          <div className="pt-1">
            <div className="flex justify-center w-full">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "p-1 text-tx-tertiary hover:text-accent-primary transition-all duration-300 focus:outline-none flex items-center justify-center relative group select-none",
                  !isExpanded && "animate-pulse"
                )}
                style={!isExpanded ? { animationDuration: "3.5s" } : undefined}
                title={isExpanded ? "收起指南" : "展开指南"}
              >
                <ChevronsDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-500 ease-out",
                    isExpanded ? "transform rotate-180 text-accent-primary" : ""
                  )}
                />
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 px-2 py-1 text-[10px] font-semibold text-white bg-zinc-900 rounded-md shadow-lg transition-transform duration-200 pointer-events-none whitespace-nowrap">
                  {isExpanded ? "收起部署与接入指南" : "展开部署与接入指南"}
                </span>
              </button>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-app-border/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {instructions}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
