"use client";
import React from 'react';
import BrowseSignupModal from '@/components/BrowseSignupModal';
import Link from 'next/link';

export default function BrowseSignupClient() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-4 sticky top-24">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101010] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Mulai Simpan & Pantau Progres</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-neutral-300">Buat akun gratis untuk menyimpan roadmap favorit, melacak milestone, dan mendapatkan rekomendasi personal.</p>
        <button
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Daftar Gratis
        </button>
        <p className="mt-3 text-[11px] text-slate-500 dark:text-neutral-400">Sudah punya akun? <Link href="/login" className="font-medium text-slate-700 dark:text-neutral-200 hover:underline">Masuk</Link></p>
      </div>
      <BrowseSignupModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
