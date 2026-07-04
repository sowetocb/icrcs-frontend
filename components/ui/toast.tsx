"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CircleX, CircleCheck, Info } from "lucide-react";

type Variant = "success" | "error" | "info";
type Toast = { id: number; message: string; variant: Variant };

type ToastContextValue = {
  /** Show a transient notification (auto-dismisses). */
  notify: (message: string, variant?: Variant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CLS: Record<Variant, string> = {
  success: "border-success/30 bg-success/10 text-success",
  error: "border-danger/30 bg-danger/10 text-danger",
  info: "border-navy-200 bg-navy-50 text-navy-700",
};

function Icon({ variant }: { variant: Variant }) {
  if (variant === "error") return <CircleX size={18} strokeWidth={2.5} aria-hidden="true" />;
  if (variant === "info") return <Info size={18} strokeWidth={2.5} aria-hidden="true" />;
  return <CircleCheck size={18} strokeWidth={2.5} aria-hidden="true" />;
}

/** App-wide transient notifications. Lives in the root layout so a toast shown
 * just before a client-side navigation (e.g. login → dashboard) stays visible. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, variant: Variant = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm ${VARIANT_CLS[toast.variant]}`}
          >
            <Icon variant={toast.variant} />
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
