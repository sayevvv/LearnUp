"use client";

import { Fragment, useRef, useState, useEffect, useRef as useReactRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Map, Layers, Brain, Target, Sparkles, BookOpen, PlayCircle, Compass, LogIn } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function LidmInfoButton() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data: session } = useSession();
  const attemptedAutoOpen = useRef(false);

  // Auto open once for first-time unauthenticated visitors (skip if coming with a session)
  useEffect(() => {
    if (session) return; // don't auto show for logged-in users (e.g. redirect after login)
    if (attemptedAutoOpen.current) return;
    attemptedAutoOpen.current = true;
    try {
      if (typeof window === 'undefined') return;
      const seen = localStorage.getItem('lidmInfoShown');
      if (!seen) {
        setOpen(true);
        localStorage.setItem('lidmInfoShown', '1');
      }
    } catch {}
  }, [session]);

  // Persist flag when user manually opens (in case script blocked earlier)
  useEffect(() => {
    if (open) {
      try { if (typeof window !== 'undefined') localStorage.setItem('lidmInfoShown', '1'); } catch {}
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white/90 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/10 dark:focus:ring-offset-0"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="lidm-info-modal"
      >
        <Compass className="h-4 w-4 text-blue-600 dark:text-sky-400" />
        Panduan LIDM
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
                  className="w-full max-w-3xl transform overflow-hidden rounded-2xl border border-slate-200/70 bg-white text-left align-middle shadow-xl ring-1 ring-black/5 transition-all dark:border-white/10 dark:bg-[#0b0b0b]"
                >
                  {/* Header */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-700 to-sky-500 opacity-90 dark:opacity-80" />
                    <div className="relative px-6 py-5 flex items-start gap-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur text-white dark:bg-white/10">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <Dialog.Title className="text-base font-semibold text-white tracking-tight">
                          Panduan Singkat LearnUp
                        </Dialog.Title>
                        <p className="mt-1 text-xs md:text-[13px] text-sky-100/80 leading-relaxed">
                          Bangun rencana belajar terstruktur, konsumsi materi ringkas, dan uji pemahaman secara iteratif.
                        </p>
                      </div>
                      <button
                        ref={closeRef}
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
                        aria-label="Tutup"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-5 text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
                    {/* Overview */}
                    <div className="grid gap-5 md:grid-cols-3">
                      <div className="group relative rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-500/40">
                        <Map className="h-5 w-5 text-blue-600 dark:text-sky-400" />
                        <h3 className="mt-2 text-[13px] font-semibold text-slate-900 dark:text-white">Rencana Belajar Adaptif</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">Susun jalur belajar sesuai tujuan & tingkat kemampuan.</p>
                      </div>
                      <div className="group relative rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-500/40">
                        <Layers className="h-5 w-5 text-blue-600 dark:text-sky-400" />
                        <h3 className="mt-2 text-[13px] font-semibold text-slate-900 dark:text-white">Materi Per Milestone</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">Ringkasan, poin inti, mindmap & flashcard (jika tersedia).</p>
                      </div>
                      <div className="group relative rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-500/40">
                        <Brain className="h-5 w-5 text-blue-600 dark:text-sky-400" />
                        <h3 className="mt-2 text-[13px] font-semibold text-slate-900 dark:text-white">Latih Pemahaman</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">Kuis pilihan ganda & matching + analisis jawaban.</p>
                      </div>
                    </div>

                    {/* Flow Steps */}
                    <div className="mt-8">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Target className="h-4 w-4 text-blue-600 dark:text-sky-400" /> Alur Belajar</h3>
                      <ol className="mt-4 space-y-4">
                        {(
                          [
                            ...(!session ? [{
                              icon: <LogIn className='h-4 w-4' />, 
                              title: 'Masuk / Daftar', 
                              body: <>Login atau buat akun untuk menyimpan progres & skor kuis. <Link href="/login" className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300">Masuk</Link> / <Link href="/signup" className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300">Daftar</Link>.</>
                            }] : []),
                            {
                              icon: <BookOpen className='h-4 w-4' />, 
                              title: 'Buat Rencana Belajar', 
                              body: <>Mulai dari <Link href="/dashboard/new" className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300">Buat Rencana Belajar</Link> lalu tentukan topik / tujuan.</>
                            },
                            {
                              icon: <Sparkles className='h-4 w-4' />, 
                              title: 'Generate Milestone', 
                              body: <>Klik Generate saat membuka rencana belajar untuk mempersiapkan materi pertama. Bisa dibatalkan kapan saja jika tidak relevan.</>
                            },
                            {
                              icon: <Layers className='h-4 w-4' />, 
                              title: 'Pelajari Materi', 
                              body: 'Baca ringkasan, pahami poin inti, gunakan mindmap & flashcard (kalau ada) sebelum lanjut.'
                            },
                            {
                              icon: <PlayCircle className='h-4 w-4' />, 
                              title: 'Kerjakan Kuis', 
                              body: 'Jawab MCQ atau matching — skor & state tersimpan agar bisa dilanjutkan.'
                            },
                            {
                              icon: <Target className='h-4 w-4' />, 
                              title: 'Iterasi & Lanjut', 
                              body: 'Evaluasi jawaban → lanjut milestone berikut sampai rencana belajar selesai.'
                            }
                          ]
                        ).map((s, i) => (
                          <li key={i} className="relative pl-8">
                            <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-sky-500 text-white text-[11px] font-semibold shadow ring-2 ring-white dark:ring-slate-900/60">
                              {i + 1}
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 text-blue-700 dark:text-sky-400 hidden sm:block">
                                {s.icon}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white text-[13px] tracking-tight">{s.title}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">{s.body}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Tips */}
                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <div className="relative rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:from-white/10 dark:to-white/[0.03] dark:text-neutral-300">
                        <h4 className="mb-1 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white text-[13px]"><Sparkles className="h-4 w-4 text-blue-600 dark:text-sky-400" /> Tips Fokus</h4>
                        Fokus satu milestone per sesi. Catat pertanyaan. Regenerasi materi bila kurang relevan.
                      </div>
                      <div className="relative rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:from-white/10 dark:to-white/[0.03] dark:text-neutral-300">
                        <h4 className="mb-1 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white text-[13px]"><Brain className="h-4 w-4 text-blue-600 dark:text-sky-400" /> Maksimalkan Kuis</h4>
                        Cek analisis jawaban; ulangi hanya jika skor &lt; 80%. Konsolidasi konsep sebelum lanjut.
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8 rounded-xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.06]">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Compass className="h-4 w-4 text-blue-600 dark:text-sky-400" /> Aksi Cepat</h3>
                      {session ? (
                        <>
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <Link
                              href="/dashboard/new"
                              className="inline-flex flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-[1.08] focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={() => setOpen(false)}
                            >
                              Mulai Buat Rencana Belajar
                            </Link>
                            <Link
                              href="/dashboard/browse"
                              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                              onClick={() => setOpen(false)}
                            >
                              Jelajahi Contoh
                            </Link>
                          </div>
                          <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-neutral-400">Masukan & ide pengembangan? Kirimkan melalui fitur feedback (akan hadir segera).</p>
                        </>
                      ) : (
                        <>
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <Link
                              href="/login"
                              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                              onClick={() => setOpen(false)}
                            >
                              Masuk
                            </Link>
                            <Link
                              href="/signup"
                              className="inline-flex flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-[1.08] focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={() => setOpen(false)}
                            >
                              Daftar
                            </Link>
                          </div>
                          <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-neutral-400">Masuk untuk menyimpan progres & kuis kamu.</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 bg-slate-50/70 px-6 py-4 dark:border-white/10 dark:bg-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-white dark:text-black dark:hover:bg-white/90"
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
