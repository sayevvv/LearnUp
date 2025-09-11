"use client";
import { Fragment, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import SignupCard from './SignupCard';

export default function BrowseSignupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  return (
    <Transition show={open} as={Fragment} appear>
      <div className="fixed inset-0 z-[110]" aria-modal="true" role="dialog" aria-labelledby="browse-signup-title">
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        </Transition.Child>
        <div className="absolute inset-0 grid place-items-center p-4">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <div className="w-[min(96vw,560px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#101010]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="browse-signup-title" className="text-lg font-semibold text-slate-900 dark:text-white">Buat Akun Gratis</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">Simpan roadmap favorit dan lacak progres belajar kamu.</p>
                </div>
                <button onClick={onClose} aria-label="Tutup" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-white/10">
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M6 18L18 6M6 6l12 12'/></svg>
                </button>
              </div>
              <div className="mt-6">
                <SignupCard />
              </div>
            </div>
          </Transition.Child>
        </div>
      </div>
    </Transition>
  );
}
