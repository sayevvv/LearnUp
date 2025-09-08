"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, ListChecks, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import LoginGateModal from './LoginGateModal';

export default function BottomNav() {
  const { data: session } = useSession();
  const pathname = usePathname() || '';
  const [gateTarget, setGateTarget] = useState<string | null>(null);
  const isActive = (href: string, exact = false) => exact ? pathname === href : pathname.startsWith(href);
  const Item = ({ href, icon: Icon, label, exact = false, guard = false }: { href: string; icon: any; label: string; exact?: boolean; guard?: boolean }) => {
    const className = `flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
      isActive(href, exact)
        ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-[#0f0f0f]'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-[#0f0f0f]'
    }`;
    if (guard && !session) {
      return (
        <button type="button" onClick={() => setGateTarget(href)} className={className} aria-label={label}>
          <Icon className="h-6 w-6" />
          <span className="text-[11px] mt-1">{label}</span>
        </button>
      );
    }
    return (
      <Link href={href} className={className} aria-label={label}>
        <Icon className="h-6 w-6" />
        <span className="text-[11px] mt-1">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-black/95 border-t border-slate-200 dark:border-[#1f1f1f] backdrop-blur supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-black/80">
      <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Item href="/dashboard" icon={Home} label="Beranda" exact />
          <Item href="/dashboard/browse" icon={Search} label="Jelajah" />
          <Item href="/dashboard/new" icon={PlusSquare} label="Buat" guard />
          <Item href="/dashboard/roadmaps" icon={ListChecks} label="Saya" guard />
          <Item href="/dashboard/profile" icon={User} label="Profil" guard />
        </div>
      </div>
      <LoginGateModal open={!!gateTarget} onClose={() => setGateTarget(null)} target={gateTarget || '/dashboard'} />
    </nav>
  );
}
