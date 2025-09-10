"use client";

import { Fragment, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import Link from "next/link";

export default function LidmInfoButton() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-white dark:bg-white/5 dark:text-white dark:ring-white/10"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="lidm-info-modal"
      >
        LIDM
      </button>

      <Transition.Root show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          initialFocus={closeRef}
          onClose={setOpen}
          open={open}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel
                  id="lidm-info-modal"
                  className="w-full max-w-2xl transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all dark:border-white/10 dark:bg-[#0b0b0b]"
                >
                  <div className="flex items-start justify-between">
                    <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">
                      Tentang Aplikasi & Tutorial Singkat
                    </Dialog.Title>
                    <button
                      ref={closeRef}
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
                      aria-label="Tutup"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700 dark:text-neutral-300">
                    <p>
                      LearnUp membantu kamu menyusun rencana belajar yang terstruktur, membuat materi per milestone, dan menyediakan kuis untuk memperkuat pemahaman. Semua terkonsolidasi dalam satu alur agar progresmu terukur.
                    </p>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cara menggunakan</h3>
                      <ol className="mt-2 list-decimal space-y-2 pl-5">
                        <li>
                          Mulai dari <Link href="/dashboard/new" className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white">Buat Rencana Belajar</Link> dan pilih topik atau tujuanmu.
                        </li>
                        <li>
                          Buka roadmap yang dibuat, lalu klik Generate Milestone untuk menyiapkan materi pertama. Kamu bisa membatalkan proses kapan saja.
                        </li>
                        <li>
                          Baca materi per subbab. Gunakan ringkasan, poin inti, dan mindmap (jika tersedia) untuk memahami konsep.
                        </li>
                        <li>
                          Uji pemahaman dengan kuis: tipe pilihan ganda atau matching. Skor tersimpan di progres roadmap.
                        </li>
                        <li>
                          Lanjutkan ke milestone berikutnya. Pantau progres di halaman dashboard dan roadmap.
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
                      Tips: fokus pada satu milestone per sesi, gunakan tombol Buka/G iroadmap untuk navigasi cepat, dan manfaatkan tombol batal jika generasi materi tidak relevan.
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      Mengerti
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
