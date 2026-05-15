import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";

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
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      className="z-[99999]"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">
            取消
          </Button>
          <Button
            onClick={onConfirm}
            variant="default"
            className={cn(
              "flex-1 rounded-xl text-white",
              confirmVariant === "danger"
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
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
          <div className="min-w-0">
            <h3 className="text-base font-bold text-tx-primary">{title}</h3>
            <p className="text-xs text-tx-secondary mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
