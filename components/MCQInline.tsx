"use client";
import React from 'react';

export interface MCQQuestion {
  q: string;
  choices: string[];
  answer: number;
}

interface MCQInlineProps {
  questions: MCQQuestion[];
  onSubmit?: (score: number, correct: number, total: number) => void;
  minPassPercent?: number;
  showImmediateResult?: boolean; // if true, show correctness after submit
  compact?: boolean;
}

export default function MCQInline({ questions, onSubmit, minPassPercent = 60, showImmediateResult = true, compact }: MCQInlineProps) {
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [score, setScore] = React.useState<number | null>(null);

  if (!Array.isArray(questions) || !questions.length) {
    return <div className="text-slate-500 text-sm">Tidak ada soal.</div>;
  }

  const submit = () => {
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answer) correct += 1; });
    const sc = Math.round((correct / questions.length) * 100);
    setSubmitted(true);
    setScore(sc);
    onSubmit?.(sc, correct, questions.length);
  };

  return (
    <div className={compact ? 'space-y-4' : ''}>
      <ol className="space-y-6">
        {questions.map((q, i) => {
          const selected = answers[i];
          const correct = q.answer;
          return (
            <li key={i} className="border border-slate-200 rounded-lg p-4">
              <div className="font-medium text-slate-800">{i + 1}. {q.q}</div>
              <div className="mt-3 grid gap-2">
                {q.choices.map((c, ci) => {
                  const isChosen = selected === ci;
                  const isCorrect = submitted && showImmediateResult && ci === correct;
                  const isWrongChosen = submitted && showImmediateResult && isChosen && ci !== correct;
                  return (
                    <label key={ci} className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm
                      ${isCorrect ? 'border-green-500 bg-green-50' : ''}
                      ${isWrongChosen ? 'border-red-500 bg-red-50' : ''}
                      ${!submitted ? (isChosen ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300') : ''}`}> 
                      <input type="radio" name={`q-${i}`} className="accent-blue-600" disabled={submitted} checked={isChosen} onChange={() => setAnswers(m => ({ ...m, [i]: ci }))} />
                      <span>{c}</span>
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!submitted && (
          <button onClick={submit} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">Kumpulkan</button>
        )}
        {submitted && score !== null && (
          <div className={`text-sm font-semibold ${score >= minPassPercent ? 'text-green-600' : 'text-red-600'}`}>Skor: {score}% {score >= minPassPercent ? '(Lulus)' : '(Belum Lulus)'}</div>
        )}
      </div>
    </div>
  );
}
