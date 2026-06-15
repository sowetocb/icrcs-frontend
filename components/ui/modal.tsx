"use client";

import { useEffect, useRef } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeLabel: string;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  closeLabel,
}: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-navy-900/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-navy-50/60 px-6 py-4">
          <h3 className="font-display text-lg font-bold text-navy-700">{title}</h3>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-md p-1.5 text-muted transition hover:bg-line hover:text-navy-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed whitespace-pre-line text-ink/80">
          {children}
        </div>

        <div className="border-t border-line px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-navy-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-500"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
