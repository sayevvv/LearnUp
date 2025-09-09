// components/DashboardSidebar.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PlusSquare, ListChecks, Settings as SettingsIcon, Search, User as UserIcon, ChevronLeft, ChevronRight, Home as HomeIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ThemeToggle from './ui/ThemeToggle';
import LoginGateModal from './LoginGateModal';

// Komponen internal untuk tautan di sidebar
const SidebarLink = ({ href, icon: Icon, label, expanded, exact = false }: { href: string; icon: React.ElementType; label: string; expanded: boolean; exact?: boolean }) => {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={label}
      className={`${expanded ? 'flex h-10 w-full items-center gap-3 rounded-lg px-3' : 'flex h-12 w-12 items-center justify-center rounded-lg'} transition-colors group ${
        isActive
          ? 'bg-slate-100 text-slate-900 dark:bg-[#0f0f0f] dark:text-white'
          : 'text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-[#0f0f0f] hover-text-glow hover-icon-glow'
      }`}
    >
      <Icon className="h-6 w-6" />
      {expanded && <span className="text-sm font-medium truncate">{label}</span>}
    </Link>
  );
};

export default function DashboardSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [gateOpen, setGateOpen] = useState<null | string>(null);

  // Load persisted state and set sensible default based on viewport
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('sidebarExpanded') : null;
      if (saved !== null) {
        setExpanded(saved === '1');
      } else if (typeof window !== 'undefined') {
        setExpanded(window.innerWidth >= 1024); // default expanded on large screens
      }
    } catch {}
    // observe theme changes
    try {
      const el = document.documentElement;
      const update = () => setIsDark(el.classList.contains('dark'));
      update();
      const mo = new MutationObserver(update);
      mo.observe(el, { attributes: true, attributeFilter: ['class'] });
      return () => mo.disconnect();
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarExpanded', expanded ? '1' : '0');
      }
    } catch {}
  }, [expanded]);

  return (
  <aside id="dashboard-sidebar" className={`${expanded ? 'w-64' : 'w-20'} shrink-0 relative bg-white dark:bg-black border-r border-slate-200 dark:border-[#1f1f1f] p-4 flex flex-col ${expanded ? 'items-start' : 'items-center'} h-full transition-[width] duration-200 ease-in-out`}>
      <div className={`flex w-full ${expanded ? 'items-center' : 'items-center'} justify-between`}>
        <Link href="/" title="Beranda" className={`${expanded ? 'flex items-center gap-2' : ''}`}>
          <Image
            key={isDark ? 'light' : 'dark'}
            src={isDark ? '/logo/light.png' : '/logo/dark.png'}
            alt='logo belajar yuk'
            width={120}
            height={24}
            priority
          />
        </Link>
      </div>
      <nav className={`flex flex-col gap-2 mt-4 w-full ${expanded ? 'items-stretch' : 'items-center'}`}>
  <SidebarLink expanded={expanded} href="/dashboard" icon={HomeIcon} label="Beranda" exact />
        {session ? (
          <SidebarLink expanded={expanded} href="/dashboard/new" icon={PlusSquare} label="Buat Roadmap" />
        ) : (
          <button
            type="button"
            onClick={() => setGateOpen('/dashboard/new')}
            className={`${expanded ? 'flex h-10 w-full items-center gap-3 rounded-lg px-3' : 'flex h-12 w-12 items-center justify-center rounded-lg'} text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-[#0f0f0f]`}
            title="Buat Roadmap"
          >
            <PlusSquare className="h-6 w-6" />
            {expanded && <span className="text-sm font-medium truncate">Buat Roadmap</span>}
          </button>
        )}
        <SidebarLink expanded={expanded} href="/dashboard/browse" icon={Search} label="Jelajahi" />
        {session ? (
          <SidebarLink expanded={expanded} href="/dashboard/roadmaps" icon={ListChecks} label="Roadmap Saya" />
        ) : (
          <button
            type="button"
            onClick={() => setGateOpen('/dashboard/roadmaps')}
            className={`${expanded ? 'flex h-10 w-full items-center gap-3 rounded-lg px-3' : 'flex h-12 w-12 items-center justify-center rounded-lg'} text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-[#0f0f0f]`}
            title="Roadmap Saya"
          >
            <ListChecks className="h-6 w-6" />
            {expanded && <span className="text-sm font-medium truncate">Roadmap Saya</span>}
          </button>
        )}
      </nav>
  <nav className={`mt-auto flex flex-col ${expanded ? 'items-stretch' : 'items-center'} gap-2 w-full`}>
  {/* Profile avatar moved to global header (see dashboard pages). Removed from sidebar for cleaner layout. */}
        {/* Hide Settings and Theme toggle on mobile; they move into Profile page */}
        <div className="hidden lg:block">
          <SidebarLink expanded={expanded} href="/dashboard/settings" icon={SettingsIcon} label="Settings" />
          <div className={`${expanded ? 'flex justify-between items-center px-1' : ''}`}>
            <ThemeToggle className={expanded ? '' : ''} expanded={expanded} />
          </div>
        </div>
      </nav>

      {/* Centered toggle on the divider between sidebar and content */}
      <button
        type="button"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-controls="dashboard-sidebar"
        onClick={() => setExpanded(v => !v)}
        className="absolute right-[-18px] top-1/2 z-30 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-600 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#1f1f1f] dark:bg-black dark:text-neutral-300 dark:hover:bg-[#0f0f0f]"
      >
        {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>
  <LoginGateModal open={!!gateOpen} onClose={() => setGateOpen(null)} target={gateOpen || '/dashboard'} />
    </aside>
  );
}
