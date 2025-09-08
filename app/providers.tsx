// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import ToastProvider from "@/components/ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const enableDark = saved === 'dark' || (saved !== 'light' && prefersDark); // treat null or 'system' same as system
      document.documentElement.classList.toggle('dark', enableDark);
    } catch {}
  }, []);

  return (
    <SessionProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}