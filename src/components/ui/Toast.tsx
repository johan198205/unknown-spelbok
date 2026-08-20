"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ToastAction = { label: string; href: string };

type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
};

type ToastContextValue = {
  toast: (message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, action?: ToastAction) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, action }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-[min(420px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 rounded-[10px] border border-line bg-panel px-4 py-3 text-[14px] text-text shadow-[var(--shadow-toast)]"
            )}
          >
            <span>{item.message}</span>
            {item.action ? (
              <Link
                href={item.action.href}
                className="shrink-0 font-semibold text-win no-underline hover:underline"
              >
                {item.action.label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (message: string) => {
        if (typeof window !== "undefined") window.alert(message);
      },
    };
  }
  return ctx;
}
