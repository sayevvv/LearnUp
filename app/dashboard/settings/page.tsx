// app/dashboard/settings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const { status } = useSession();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const current = document.documentElement.classList.contains('dark');
    setIsDark(current);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center">Memuat pengaturan…</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile" aria-label="Kembali" className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-[#151515]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        </div>

  {/* Akun card removed for settings simplification on this view */}

        {/* Tema */}
        <section className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tema</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-200">Mode Gelap</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Aktifkan untuk tampilan yang lebih redup.</div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
              title={isDark ? 'Matikan mode gelap' : 'Aktifkan mode gelap'}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
