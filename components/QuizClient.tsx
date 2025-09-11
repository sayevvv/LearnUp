"use client";

import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import MatchingGame from './MatchingGame';

type Question = {
  q: string;
  choices: string[];
  answer: number; // index of correct answer
};

export default function QuizClient({ roadmapId, milestoneIndex, topic, nextHref, nextTopic }: { roadmapId: string; milestoneIndex: number; topic: string; nextHref?: string; nextTopic?: string }) {
  const [loading, setLoading] = React.useState(true);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [pairs, setPairs] = React.useState<Record<string, string> | null>(null);
  const [type, setType] = React.useState<'mcq' | 'match'>('mcq');
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [score, setScore] = React.useState<number | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [lastSavedScore, setLastSavedScore] = React.useState<number | null>(null);
  const [explanations, setExplanations] = React.useState<string[] | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [attemptId] = React.useState(() => crypto.randomUUID());
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [analysisText, setAnalysisText] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [locked, setLocked] = React.useState(false);
  const [regenLoading, setRegenLoading] = React.useState(false);
  const [regenError, setRegenError] = React.useState<string | null>(null);
  // storage key for persisting quiz state per roadmap+milestone
  const storageKey = React.useMemo(() => `quizState:${roadmapId}:${milestoneIndex}`, [roadmapId, milestoneIndex]);
  const restoredRef = React.useRef(false);

  const allAnswered = React.useMemo(() => {
    if (!questions.length) return false;
    for (let i = 0; i < questions.length; i++) {
      if (typeof answers[i] !== 'number') return false;
    }
    return true;
  }, [answers, questions]);

  const MAX_WORDS = 120;
  const truncateWords = (text: string, maxWords = MAX_WORDS) => {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text.trim();
    return words.slice(0, maxWords).join(' ') + '…';
  };
  const buildAnalysisMCQ = (qs: Question[], ans: Record<number, number>, exps: string[] | null, sc: number) => {
    const total = qs.length;
    const correctIdx: number[] = [];
    const wrongIdx: number[] = [];
    qs.forEach((q, i) => {
      if (ans[i] === q.answer) correctIdx.push(i); else wrongIdx.push(i);
    });
    const parts: string[] = [];
    parts.push(`Ringkasan: kamu menjawab ${correctIdx.length}/${total} benar (${sc}%).`);
    if (correctIdx.length) parts.push(`Tepat pada nomor: ${correctIdx.map(i => i + 1).join(', ')}.`);
    if (wrongIdx.length) {
      const hints = wrongIdx.slice(0, 3).map(i => {
        const stem = qs[i]?.q || '';
        const hint = exps && exps[i] ? exps[i] : '';
        const stemShort = stem.replace(/\s+/g, ' ').slice(0, 80);
        const hintShort = hint ? ' — ' + hint.replace(/\s+/g, ' ').slice(0, 120) : '';
        return `(${i + 1}) ${stemShort}${hintShort}`;
      });
      parts.push(`Perlu ditinjau: ${hints.join('; ')}.`);
    }
    parts.push('Saran: fokus pada konsep dasar yang keliru, lalu ulangi kuis untuk menguatkan pemahaman.');
    return truncateWords(parts.join(' '), MAX_WORDS);
  };
  const buildAnalysisMatch = (correct: number, total: number) => {
    const sc = total ? Math.round((correct / total) * 100) : 0;
    const base = `Ringkasan: kamu menjodohkan ${correct}/${total} pasangan dengan benar (${sc}%).`;
    const tip = 'Saran: perhatikan definisi yang mirip dan kata kunci pembeda; baca ulang ringkasan/glossary pada materi.';
    return truncateWords(`${base} ${tip}`, MAX_WORDS);
  };

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/roadmaps/${roadmapId}/quiz?m=${milestoneIndex}`);
        if (!res.ok) throw new Error('Gagal membuat kuis');
        const data = await res.json();
        if (!active) return;
        if (data.type === 'match') {
          const arr: any[] = Array.isArray(data.pairs) ? data.pairs : [];
          const obj: Record<string,string> = {};
          for (const it of arr) {
            if (it && typeof it.term === 'string' && typeof it.definition === 'string') {
              obj[it.term] = it.definition;
            }
          }
          setPairs(obj);
          setType('match');
          setQuestions([]);
        } else {
          setType('mcq');
          setPairs(null);
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
        }
        // Attempt to restore previous state from storage (once)
        try {
          if (!restoredRef.current) {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
            if (raw) {
              const saved = JSON.parse(raw);
              if (saved && saved.type === 'mcq' && Array.isArray(data.questions)) {
                setAnswers(saved.answers || {});
                if (saved.submitted) {
                  setSubmitted(true);
                  setLocked(true);
                  const sc = typeof saved.score === 'number' ? saved.score : 0;
                  setScore(sc);
                  // quick local analysis without explanations
                  try { setAnalysisText(buildAnalysisMCQ(Array.isArray(data.questions) ? data.questions : [], saved.answers || {}, null, sc)); } catch {}
                  setAnalysisLoading(false);
                }
              }
              if (saved && saved.type === 'match') {
                if (saved.submitted) {
                  setSubmitted(true);
                  setLocked(true);
                  const sc = typeof saved.score === 'number' ? saved.score : 0;
                  setScore(sc);
                  const totalPairs = data && Array.isArray(data.pairs) ? data.pairs.length : (pairs ? Object.keys(pairs).length : 0);
                  const approxCorrect = Math.max(0, Math.min(totalPairs, Math.round((sc / 100) * (totalPairs || 0))));
                  try { setAnalysisText(buildAnalysisMatch(approxCorrect, totalPairs || 0)); } catch {}
                  setAnalysisLoading(false);
                }
                // answers for matching are not persisted granularly; keeping score & status is enough
              }
            }
            restoredRef.current = true;
          }
        } catch {}
        // Load previous score if exists on progress
        try {
          const p = await fetch(`/api/roadmaps/${roadmapId}/progress`);
          if (p.ok) {
            const pj = await p.json();
            const prev = pj?.completedTasks?.[`quiz-m-${milestoneIndex}`]?.score;
            if (typeof prev === 'number') setLastSavedScore(prev);
          }
        } catch {}
      } catch (e: any) {
        if (!active) return; setError(e.message || 'Gagal memuat kuis');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [roadmapId, milestoneIndex]);

  // Persist state changes to localStorage
  React.useEffect(() => {
    if (loading) return;
    try {
      const payload: any = { type, submitted, locked, score };
      if (type === 'mcq') payload.answers = answers;
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [loading, storageKey, type, answers, submitted, locked, score]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
  // Start analysis immediately with a quick local summary; refine after explanations load
  setAnalysisText(null);
  setAnalysisLoading(true);
  setLocked(true); // lock answers as soon as submit is confirmed
    const total = questions.length || 0;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answer) correct += 1; });
    const sc = total ? Math.round((correct / total) * 100) : (pairs ? 100 : 0); // matching skor dihitung di komponen terpisah (TODO)
    setScore(sc);
    setSubmitted(true);
  // Show initial analysis immediately (without per-question explanations)
  try { setAnalysisText(buildAnalysisMCQ(questions, answers, null, sc)); } catch {}
    // Save answers and score (no pass gating)
    try {
      const resp = await fetch(`/api/roadmaps/${roadmapId}/quiz`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneIndex, score: sc, passed: true, answers, attemptId })
      });
      if (resp?.ok) setLastSavedScore(sc);
    } catch {}

    // Fetch explanations for MCQ using Gemini
    if (type === 'mcq') {
      try {
        const ex = await fetch(`/api/roadmaps/${roadmapId}/quiz/explanations`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneIndex })
        });
        if (ex.ok) {
          const ej = await ex.json();
          if (Array.isArray(ej?.explanations)) {
            setExplanations(ej.explanations);
            setAnalysisText(buildAnalysisMCQ(questions, answers, ej.explanations, sc));
          } else {
            setAnalysisText(buildAnalysisMCQ(questions, answers, null, sc));
          }
        }
      } catch {}
      finally {
        setAnalysisLoading(false);
      }
    }
    setSubmitting(false);
  };

  const resetAll = React.useCallback(() => {
    setSubmitted(false);
    setScore(null);
    setExplanations(null);
    setAnalysisText(null);
    setAnalysisLoading(false);
    setLocked(false);
    setAnswers({});
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  if (loading) return <div className="text-slate-500">Membuat kuis…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (type === 'mcq' && !questions.length) return <div className="text-slate-500">Kuis belum tersedia.</div>;

  if (type === 'match' && pairs) {
    const pairsCount = Object.keys(pairs).length;
    const regenerateMatch = async () => {
      if (regenLoading) return;
      setRegenLoading(true);
      setRegenError(null);
      try {
        const res = await fetch(`/api/roadmaps/${roadmapId}/quiz?m=${milestoneIndex}`);
        if (!res.ok) throw new Error('Gagal generate ulang kuis');
        const data = await res.json();
        if (data.type === 'match') {
          const arr: any[] = Array.isArray(data.pairs) ? data.pairs : [];
          const obj: Record<string, string> = {};
          for (const it of arr) {
            if (it && typeof it.term === 'string' && typeof it.definition === 'string') obj[it.term] = it.definition;
          }
          setPairs(obj);
          // reset attempt state when new content arrives
          setSubmitted(false); setScore(null); setExplanations(null); setAnalysisText(null); setAnalysisLoading(false); setLocked(false); setAnswers({});
          try { localStorage.removeItem(storageKey); } catch {}
        } else if (data.type === 'mcq') {
          // In rare cases parity shifts or fallback returns MCQ; reflect that
          setType('mcq');
          setPairs(null);
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
          setSubmitted(false); setScore(null); setExplanations(null); setAnalysisText(null); setAnalysisLoading(false); setLocked(false); setAnswers({});
          try { localStorage.removeItem(storageKey); } catch {}
        }
      } catch (e: any) {
        setRegenError(e?.message || 'Gagal generate ulang kuis');
      } finally {
        setRegenLoading(false);
      }
    };
    return (
      <div>
        {!submitted ? (
          <MatchingGame
            pairs={pairs}
            onDone={async (correct, total) => {
              const sc = total ? Math.round((correct / total) * 100) : 0;
              setScore(sc);
              setSubmitted(true);
              setAnalysisLoading(true);
              try {
                const resp = await fetch(`/api/roadmaps/${roadmapId}/quiz`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ milestoneIndex, score: sc, passed: sc >= 60 })
                });
                if (resp?.ok) setLastSavedScore(sc);
              } catch {}
              setAnalysisText(buildAnalysisMatch(correct, total));
              setAnalysisLoading(false);
            }}
          />
        ) : (
          <div className="mb-4 rounded-xl border border-slate-200 p-4 shadow-sm bg-white/90 dark:border-white/10 dark:bg-white/5">
            <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Hasil kuis tersimpan</div>
            {typeof score === 'number' && (
              <div className={`text-sm font-semibold ${score >= 60 ? 'text-green-600' : 'text-slate-700'}`}>Skor: {score}%</div>
            )}
            {analysisText && (
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-neutral-300">{analysisText}</p>
            )}
            <div className="mt-3">
              <button onClick={resetAll} className="rounded-lg bg-slate-200 text-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-300">Coba Lagi</button>
            </div>
          </div>
        )}
        {pairsCount < 2 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              onClick={regenerateMatch}
              disabled={regenLoading}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {regenLoading ? 'Menghasilkan…' : 'Generate ulang kuis'}
            </button>
            {regenError && <div className="text-sm text-red-600">{regenError}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Confirm Submit Modal */}
      <Transition.Root show={confirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setConfirmOpen}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left align-middle shadow-xl transition-all dark:border-white/10 dark:bg-[#0b0b0b]">
                  <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">Kumpulkan Jawaban?</Dialog.Title>
                  <div className="mt-2 text-sm text-slate-600 dark:text-neutral-300">
                    Menekan Submit akan mengunci jawabanmu, menampilkan hasil kuis, dan menonaktifkan pilihan jawaban.
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={() => setConfirmOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-white/5">Batal</button>
                    <button
                      onClick={() => { setConfirmOpen(false); submit(); }}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Submit
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {submitted && (
        <div className="mb-6">
          {analysisLoading ? (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 p-4 dark:border-white/10 dark:from-white/5 dark:via-white/10 dark:to-white/5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-11/12 rounded bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-10/12 rounded bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
          ) : analysisText ? (
            <div className="rounded-xl border border-slate-200 p-4 shadow-sm bg-white/90 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 inline-flex items-center gap-2 text-slate-900 dark:text-white">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Analisis Ringkas</span>
              </div>
              <p className="text-sm leading-6 text-slate-700 dark:text-neutral-300">{analysisText}</p>
            </div>
          ) : null}
        </div>
      )}

      <ol className="space-y-6">
        {questions.map((q, i) => (
          <li key={i} className="border border-slate-200 rounded-lg p-4">
            <div className="font-medium text-slate-800">{i + 1}. {q.q}</div>
            <div className="mt-3 grid gap-2">
              {q.choices.map((c, ci) => (
                <label key={ci} className={`flex items-center gap-2 rounded-lg border p-2 ${locked || submitted ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${answers[i] === ci ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name={`q-${i}`} className="accent-blue-600" checked={answers[i] === ci} disabled={locked || submitted} onChange={() => setAnswers((m) => ({ ...m, [i]: ci }))} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            {submitted && (
              (() => {
                const isCorrect = answers[i] === q.answer;
                const scheme = isCorrect
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-red-50 text-red-800 border-red-200';
                return (
                  <div className={`mt-3 rounded-md border p-3 text-sm ${scheme}`}>
                    <div className="font-semibold mb-1">{isCorrect ? 'Benar' : 'Salah'}</div>
                    <p className="mb-1"><span className="font-medium">Kunci:</span> {q.choices[q.answer]}</p>
                    {explanations && explanations[i] && (
                      <p>{explanations[i]}</p>
                    )}
                  </div>
                );
              })()
            )}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {!submitted && (
            <button onClick={() => { if (allAnswered) setConfirmOpen(true); }} disabled={submitting || !allAnswered} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">Selesai</button>
          )}
          {submitted && (
            <>
              <button onClick={resetAll} className="rounded-lg bg-slate-200 text-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-300">Coba Lagi</button>
            </>
          )}
          {submitted && score !== null && (
            <div className={`text-sm font-semibold ${score >= 60 ? 'text-green-600' : 'text-slate-700'}`}>Skor: {score}%</div>
          )}
          {!submitted && lastSavedScore !== null && (
            <div className="text-sm font-semibold text-slate-700">Skor Terakhir: {lastSavedScore}%</div>
          )}
          {!submitted && !allAnswered && questions.length > 0 && (
            <div className="text-xs font-medium text-amber-600">Jawab semua pertanyaan untuk melanjutkan.</div>
          )}
        </div>
        <div className="shrink-0">
          {nextHref && (
            <a href={nextHref} className="group inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-700">
              <span>Ke Materi {nextTopic ? nextTopic : 'Berikutnya'}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
