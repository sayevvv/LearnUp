"use client";

import React from 'react';

type Question = {
  q: string;
  choices: string[];
  answer: number; // index of correct answer
};

export default function QuizClient({ roadmapId, milestoneIndex, topic, nextHref, nextTopic }: { roadmapId: string; milestoneIndex: number; topic: string; nextHref?: string; nextTopic?: string }) {
  const [loading, setLoading] = React.useState(true);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [score, setScore] = React.useState<number | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [lastSavedScore, setLastSavedScore] = React.useState<number | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/roadmaps/${roadmapId}/quiz?m=${milestoneIndex}`);
        if (!res.ok) throw new Error('Gagal membuat kuis');
        const data = await res.json();
        if (!active) return;
        setQuestions(data.questions || []);
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
    const total = questions.length || 0;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answer) correct += 1; });
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
  };

  if (loading) return <div className="text-slate-500">Membuat kuis…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!questions.length) return <div className="text-slate-500">Kuis belum tersedia.</div>;

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
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button onClick={submit} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">Kumpulkan</button>
        {nextHref && (
          <a href={nextHref} className={`rounded-lg px-4 py-2 text-sm font-semibold ${ (score ?? lastSavedScore ?? 0) >= 60 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed' }`} aria-disabled={(score ?? lastSavedScore ?? 0) < 60} onClick={(e) => { if ((score ?? lastSavedScore ?? 0) < 60) e.preventDefault(); }}>
            Ke Materi {nextTopic ? nextTopic : 'Berikutnya'}
          </a>
        )}
        {submitted && score !== null && (
          <div className={`text-sm font-semibold ${score >= 60 ? 'text-green-600' : 'text-red-600'}`}>Skor: {score}% {score >= 60 ? '(Lulus)' : '(Belum Lulus)'}</div>
        )}
        {!submitted && lastSavedScore !== null && (
          <div className={`text-sm font-semibold ${lastSavedScore >= 60 ? 'text-green-600' : 'text-red-600'}`}>Skor Terakhir: {lastSavedScore}% {lastSavedScore >= 60 ? '(Lulus)' : '(Belum Lulus)'}</div>
        )}
      </div>
    </div>
  );
}
