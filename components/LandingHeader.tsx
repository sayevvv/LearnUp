"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import ThemeToggle from './ui/ThemeToggle';

export default function LandingHeader() {
  const [dest, setDest] = useState<string>('/login?callbackUrl=%2Fdashboard%2Fnew');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const moRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.user?.id) setDest('/dashboard/new');
        else setDest('/login?callbackUrl=%2Fdashboard%2Fnew');
      })
      .catch(() => setDest('/login?callbackUrl=%2Fdashboard%2Fnew'));

    // watch for theme class changes on <html>
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    moRef.current = mo;

    return () => {
      mounted = false;
      moRef.current?.disconnect();
      moRef.current = null;
    };
  }, []);

  return (
    <header className="fixed top-7 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
    <div
          className={[
            'relative flex h-14 items-center justify-between rounded-2xl border',
            'border-slate-200/70 dark:border-white/10',
            // translucent + blur background so content under header is blurred
            'light:bg-white/70 dark:bg-black/70 backdrop-saturate-150 backdrop-blur-xl',
            'shadow-sm transition-colors'
          ].join(' ')}
        >
          {/* Logo */}
          <Link href="/" className="pl-4 pr-2 flex items-center overflow-visible select-none">
            <div className="origin-left -my-1">
              <Image
                src={'/logo/logolearnup.webp'}
                alt="LearnUp"
                width={120}
                height={24}
                className="h-6 w-auto"
                priority
              />
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3 pr-3">
            <ThemeToggle />
            <Link href="#features" className="text-sm font-medium light:text-slate-600 light:hover:text-slate-900 dark:text-neutral-100 dark:hover:text-neutral-300">Fitur</Link>
            <Link href="#about" className="text-sm font-medium light:text-slate-600 light:hover:text-slate-900 dark:text-neutral-100 dark:hover:text-neutral-300">Tentang</Link>
            <span aria-hidden className="mx-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <Link href={dest} className="ml-1 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-slate-800 text-white hover:bg-slate-600">
              Masuk
            </Link>
          </nav>

          {/* Mobile: burger + dropdown */}
          <div className="md:hidden pr-2">
            <button
              type="button"
              aria-label="Buka menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center justify-center rounded-xl p-2 light:text-slate-700 light:hover:bg-slate-100 dark:text-neutral-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-slate-400/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-2 top-[3.5rem] w-56 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-black/75 backdrop-blur-xl shadow-lg p-2">
                <div className="px-2 py-1">
                  <ThemeToggle />
                </div>
                <Link href="#features" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium light:text-slate-700 light:hover:bg-slate-100 dark:text-neutral-100 dark:hover:bg-white/10">Fitur</Link>
                <Link href="#about" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium light:text-slate-700 light:hover:bg-slate-100 dark:text-neutral-100 dark:hover:bg-white/10">Tentang</Link>
                <div className="mt-2 border-t border-slate-200/70 dark:border-white/10 pt-2">
                  <Link
                    href={dest}
                    onClick={() => setMenuOpen(false)}
                    className="block text-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                  >
                    Masuk
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
