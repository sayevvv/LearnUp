"use client";

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

export default function ThemeToggle({ className = "", expanded = false }: { className?: string; expanded?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize from storage or system; then lock to explicit light/dark
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('theme') as ThemeMode | null;
      let initial: ThemeMode | null = saved === 'light' || saved === 'dark' ? saved : null;
      if (!initial) {
        const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        initial = prefersDark ? 'dark' : 'light';
      }
      apply(initial);
    } catch {
      apply('light');
    }
  }, []);

  function apply(next: ThemeMode) {
    setMode(next);
    try { localStorage.setItem('theme', next); } catch {}
    const root = document.documentElement;
    root.classList.toggle('dark', next === 'dark');
    // Ensure native color-scheme switches for form controls, etc.
    root.style.colorScheme = next;
  }

  const toggle = () => apply(mode === 'dark' ? 'light' : 'dark');

  if (!mounted) {
    return <button aria-label="Toggle theme" className={`h-9 w-9 rounded-lg ${className}`} />;
  }

  if (expanded) {
    return (
      <div className={`inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden ${className}`} role="group" aria-label="Theme selector">
        <button
          type="button"
          onClick={() => apply('light')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${mode === 'light' ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`}
          title="Light"
          aria-pressed={mode === 'light'}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => apply('dark')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${mode === 'dark' ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`}
          title="Dark"
          aria-pressed={mode === 'dark'}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const Icon = mode === 'dark' ? Sun : Moon;
  const label = mode === 'dark' ? 'Switch to light' : 'Switch to dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg border light:border-slate-200 px-2.5 py-1.5 light:text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
