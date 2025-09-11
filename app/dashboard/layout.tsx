// app/dashboard/layout.tsx
"use client";

import DashboardSidebar from '@/components/DashboardSidebar';
import { usePathname } from 'next/navigation';
import BottomNav from '../../components/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = /^\/dashboard\/roadmaps\/[^/]+\/(read|quiz)$/.test(pathname || '');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-black">
  {!isReader && (
        // Hide sidebar on small screens; show on lg+ only
        <div className="shrink-0 hidden lg:block">
          <DashboardSidebar />
        </div>
      )}
      {/* min-w-0 prevents flex overflow when children use max-width containers */}
      {/* Add bottom padding on mobile to avoid BottomNav overlap */}
      <main className="min-w-0 min-h-0 flex-1 overflow-hidden bg-white dark:bg-black pb-16 lg:pb-0">
        {children}
      </main>
  {!isReader && (
        // Mobile bottom navbar
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
