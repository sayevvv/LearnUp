"use client";
import { Fragment, useEffect, useState } from "react";
import { Transition } from "@headlessui/react";
import Link from "next/link";
import { createPortal } from "react-dom";

export default function LoginGateModal({ open, onClose, target = "/dashboard" }: { open: boolean; onClose: () => void; target?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open, mounted]);

  if (!mounted) return null;

  const modal = (
    <Transition as={Fragment} show={open} appear>
      <div className="fixed inset-0 z-[100]" aria-labelledby="login-gate-title" role="dialog" aria-modal="true">
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        </Transition.Child>
        <div className="absolute inset-0 grid place-items-center p-4">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <div className="w-[min(96vw,520px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f0f0f]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div id="login-gate-title" className="text-lg font-semibold text-slate-900 dark:text-white">Perlu Masuk</div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">Anda harus masuk untuk mengakses fitur ini.</p>
                </div>
                <button onClick={onClose} aria-label="Tutup" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="mt-6 flex gap-3">
                <Link href={`/login?callbackUrl=${encodeURIComponent(target)}`} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                  Masuk untuk Lanjut
                </Link>
                <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/10">Batal</button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </div>
    </Transition>
  );

  return createPortal(modal, document.body);
}
