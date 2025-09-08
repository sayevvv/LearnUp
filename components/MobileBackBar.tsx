"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileBackBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-10 md:hidden bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="inline-flex items-center justify-center rounded-full h-9 w-9 text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
