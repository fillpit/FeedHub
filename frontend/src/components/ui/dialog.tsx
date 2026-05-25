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
  position?: "center" | "right" | "top";
  className?: string;
  bodyClassName?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "6xl": "max-w-6xl",
  full: "max-w-full h-full",
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  position = "center",
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

  const isCenter = position === "center";
  const isTop = position === "top";

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
          <div 
            className={cn(
              "fixed inset-0 z-[70] flex p-4 pointer-events-none",
              isCenter && "items-center justify-center",
              isTop && "items-start justify-center pt-[15vh]",
              position === "right" && "items-stretch justify-end p-0"
            )}
          >
            <motion.div
              initial={isCenter || isTop ? { opacity: 0, scale: 0.95, y: 15 } : { x: "100%" }}
              animate={isCenter || isTop ? { opacity: 1, scale: 1, y: 0 } : { x: 0 }}
              exit={isCenter || isTop ? { opacity: 0, scale: 0.95, y: 15 } : { x: "100%" }}
              transition={isCenter || isTop ? { type: "spring", bounce: 0.15, duration: 0.4 } : { type: "spring", bounce: 0, duration: 0.3 }}
              className={cn(
                "w-full bg-app-elevated border-app-border shadow-2xl flex flex-col overflow-hidden pointer-events-auto",
                isCenter || isTop ? "rounded-2xl border" : "h-full border-l",
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              {title && (
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
