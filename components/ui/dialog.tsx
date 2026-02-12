"use client";

import * as React from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  disableOverlayPointerEvents?: boolean;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  showClose?: boolean;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, disableOverlayPointerEvents }: DialogProps) {
  if (!open) return null;

  const overlayPointerClass = disableOverlayPointerEvents ? "pointer-events-none" : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className={`fixed inset-0 bg-black/50 ${overlayPointerClass}`}
        onClick={disableOverlayPointerEvents ? undefined : () => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "", onClose, showClose = true }: DialogContentProps) {
  return (
    <div
      className={`
        relative bg-card rounded-lg shadow-xl max-w-lg md:max-w-2xl w-full mx-4 md:mx-6
        max-h-[90vh] overflow-y-auto z-[100] border border-border
        ${className}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {onClose && showClose && (
        <button
          className="absolute top-2 right-2 text-foreground bg-muted hover:bg-accent px-3 py-2 rounded-md text-xl font-bold leading-none touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
          onClick={onClose}
          aria-label="Schließen"
        >
          ×
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">{children}</div>;
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h2 className="text-lg md:text-xl font-semibold text-card-foreground">{children}</h2>;
}

export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className="text-sm text-muted-foreground mt-1">{children}</p>;
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div className={`px-4 md:px-6 py-3 md:py-4 border-t border-border flex flex-col md:flex-row justify-end gap-2 md:gap-3 ${className}`}>
      {children}
    </div>
  );
}
