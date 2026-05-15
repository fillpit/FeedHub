import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "6xl" | "full";
  className?: string;
  bodyClassName?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "6xl": "max-w-6xl",
  full: "max-w-[95vw] h-[95vh]",
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
}: DialogProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className={cn(
                "w-full bg-app-elevated border border-app-border rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto",
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              {(title || onClose) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-surface/50 shrink-0">
                  <div className="min-w-0">
                    {title && (
                      <h3 className="text-sm font-semibold text-tx-primary truncate">
                        {title}
                      </h3>
                    )}
                    {description && (
                      <p className="text-[11px] text-tx-tertiary truncate mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="w-8 h-8 ml-2 text-tx-tertiary hover:text-tx-primary hover:bg-app-hover rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}

              {/* Body */}
              <div className={cn("flex-1 overflow-y-auto", bodyClassName)}>
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app-border bg-app-surface/30 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
