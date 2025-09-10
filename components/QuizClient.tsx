"use client";

import React from 'react';
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

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const total = questions.length || 0;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answer) correct += 1; });
    const sc = total ? Math.round((correct / total) * 100) : (pairs ? 100 : 0); // matching skor dihitung di komponen terpisah (TODO)
    setScore(sc);
    setSubmitted(true);
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
          if (Array.isArray(ej?.explanations)) setExplanations(ej.explanations);
        }
      } catch {}
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-slate-500">Membuat kuis…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (type === 'mcq' && !questions.length) return <div className="text-slate-500">Kuis belum tersedia.</div>;

  if (type === 'match' && pairs) {
    return (
      <MatchingGame
        pairs={pairs}
        onDone={async (correct, total) => {
          const sc = total ? Math.round((correct / total) * 100) : 0;
          setScore(sc);
          setSubmitted(true);
          try {
            const resp = await fetch(`/api/roadmaps/${roadmapId}/quiz`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ milestoneIndex, score: sc, passed: sc >= 60 })
            });
            if (resp?.ok) setLastSavedScore(sc);
          } catch {}
        }}
      />
    );
  }

  return (
    <div>
      <ol className="space-y-6">
        {questions.map((q, i) => (
          <li key={i} className="border border-slate-200 rounded-lg p-4">
            <div className="font-medium text-slate-800">{i + 1}. {q.q}</div>
            <div className="mt-3 grid gap-2">
              {q.choices.map((c, ci) => (
                <label key={ci} className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer ${answers[i] === ci ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name={`q-${i}`} className="accent-blue-600" checked={answers[i] === ci} onChange={() => setAnswers((m) => ({ ...m, [i]: ci }))} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            {submitted && explanations && explanations[i] && (
              <div className="mt-3 rounded-md bg-green-50 text-green-800 p-3 text-sm">
                <div className="font-semibold mb-1">Penjelasan</div>
                <p>{explanations[i]}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!submitted && (
          <button onClick={submit} disabled={submitting} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Menyimpan…' : 'Kumpulkan'}</button>
        )}
        {submitted && (
          <>
            <button onClick={() => { setSubmitted(false); setScore(null); setExplanations(null); }} className="rounded-lg bg-slate-200 text-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-300">Coba Lagi</button>
            <button onClick={() => { setAnswers({}); setSubmitted(false); setScore(null); setExplanations(null); }} className="rounded-lg bg-slate-200 text-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-300">Reset Jawaban</button>
          </>
        )}
        {nextHref && (
          <a href={nextHref} className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-700">
            Ke Materi {nextTopic ? nextTopic : 'Berikutnya'}
          </a>
        )}
        {submitted && score !== null && (
          <div className={`text-sm font-semibold ${score >= 60 ? 'text-green-600' : 'text-slate-700'}`}>Skor: {score}%</div>
        )}
        {!submitted && lastSavedScore !== null && (
          <div className="text-sm font-semibold text-slate-700">Skor Terakhir: {lastSavedScore}%</div>
        )}
      </div>
    </div>
  );
}
