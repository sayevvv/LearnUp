"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type TocVariant = 'fixed' | 'static';

export default function ReaderRightTOC({ title = 'Dalam tahap ini', items, currentIndex, variant = 'fixed' }: { title?: string; items: Array<{ label: string; href: string }>; currentIndex: number; variant?: TocVariant }) {
  const [showHeader, setShowHeader] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY || 0;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const dy = y - lastY.current;
      if (dy < -8) setShowHeader(true); // scrolling up
      else if (dy > 8) setShowHeader(false); // scrolling down
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!items || items.length === 0) return null;
  const isFixed = variant === 'fixed';
  const desktopAsideClass = isFixed
    ? 'fixed left-6 top-[calc(6rem+0.5rem)] hidden xl:block w-[22rem] z-20'
    : 'hidden xl:block sticky top-24 z-10 w-full h-[calc(100vh-6rem)] overflow-y-auto pr-1';
  const headerAnimClass = isFixed
    ? (showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1')
    : 'opacity-100 translate-y-0';

  return (
    <>
      {/* Desktop/XL TOC */}
      <aside className={desktopAsideClass}>
        {/* Animated header shows when user scrolls up (always visible in static mode) */}
        <div className={`mb-2 px-2 text-xs font-semibold text-slate-600 transition-all duration-200 ${headerAnimClass}`}>{title}</div>
  <nav className="p-1 rounded-xl bg-transparent max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
          <ul className="space-y-0.5">
            {items.map((it, idx) => (
              <li key={idx}>
                <Link
                  href={it.href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${idx === currentIndex ? 'text-slate-900 font-semibold' : 'text-slate-700 hover:text-slate-900'}`}
                  aria-current={idx === currentIndex ? 'page' : undefined}
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Mobile floating button and bottom sheet */}
  <button
        type="button"
        className="xl:hidden fixed bottom-6 left-6 z-30 rounded-full bg-slate-900 text-white px-4 py-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-haspopup="dialog"
        aria-expanded={mobileOpen}
        aria-controls="reader-toc-sheet"
        onClick={() => setMobileOpen(true)}
      >
        Daftar Materi
      </button>

      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          id="reader-toc-sheet"
          className="xl:hidden fixed inset-0 z-40"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="text-sm font-semibold text-slate-700">{title}</div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Tutup daftar materi"
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="px-2 pb-3 overflow-y-auto">
              <ul className="space-y-1">
                {items.map((it, idx) => (
                  <li key={idx}>
                    <Link
                      href={it.href}
                      className={`block rounded-lg px-3 py-3 text-sm transition-colors ${idx === currentIndex ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
                      aria-current={idx === currentIndex ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
