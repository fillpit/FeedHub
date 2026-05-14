import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmVariant: "danger" | "warning";
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  confirmVariant,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm bg-app-surface rounded-3xl border border-app-border p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                  confirmVariant === "danger"
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-amber-500/10 text-amber-500"
                )}
              >
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-tx-primary">{title}</h3>
                <p className="text-xs text-tx-secondary mt-1">{message}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-app-border text-tx-secondary font-bold text-xs hover:bg-app-hover transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-2xl text-white font-bold text-xs transition-all shadow-lg",
                  confirmVariant === "danger"
                    ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                    : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
