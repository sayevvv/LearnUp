"use client";

import DashboardSidebar from '@/components/DashboardSidebar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-black">
      {/* Hide sidebar on mobile; show on md+ */}
      <div className="hidden md:block">
        <DashboardSidebar />
      </div>
      <main className="flex-1 overflow-hidden bg-white dark:bg-black">
        {children}
      </main>
    </div>
  );
}
