"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number; // ms
};

type ToastContextType = {
  show: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, any>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, type: 'info', duration: 3000, ...t };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration && toast.duration > 0) {
      timers.current[id] = setTimeout(() => remove(id), toast.duration);
    }
  }, [remove]);

  useEffect(() => () => {
    // cleanup timers on unmount
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
               className={`min-w-[260px] max-w-sm rounded-lg border px-4 py-3 shadow-lg backdrop-blur bg-white/90 ${
                 t.type === 'success' ? 'border-emerald-300' : t.type === 'error' ? 'border-rose-300' : 'border-slate-200'
               }`}>
            {t.title ? <div className="text-sm font-semibold text-slate-900">{t.title}</div> : null}
            <div className="text-sm text-slate-700">{t.message}</div>
            <button className="absolute top-1.5 right-2 text-slate-400 hover:text-slate-600" onClick={() => remove(t.id)} aria-label="Close">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
