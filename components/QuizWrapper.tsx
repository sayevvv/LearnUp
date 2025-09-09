"use client";
import React, { useEffect, useState } from 'react';
import MatchingGame from './MatchingGame';
import { chooseQuizType, getCachedMaterial, cacheMaterial, deriveMatchingPairs, QuizType } from '@/lib/quiz';

interface QuizWrapperProps {
  topicKey: string;               // unique key for subsection (e.g. node:streams:intro)
  fetchMaterial: () => Promise<any>; // function to fetch/generate material (AI or API) if not cached
  renderMCQ: (material: any) => React.ReactNode; // renderer for MCQ variant
}

export default function QuizWrapper({ topicKey, fetchMaterial, renderMCQ }: QuizWrapperProps) {
  const [material, setMaterial] = useState<any>(null);
  const [quizType, setQuizType] = useState<QuizType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        // 1. Load cached material if exists
        let mat = getCachedMaterial(topicKey);
        if (!mat) {
          mat = await fetchMaterial();
          cacheMaterial(topicKey, mat);
        }
        if (abort) return;
        setMaterial(mat);
        // 2. Decide quiz type (persisted) once
        const meta = chooseQuizType(topicKey);
        setQuizType(meta.type);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [topicKey, fetchMaterial]);

  if (loading) return <div className="p-6 text-sm text-slate-500">Memuat kuis…</div>;
  if (!quizType || !material) return <div className="p-6 text-sm text-red-600">Gagal memuat kuis.</div>;

  if (quizType === 'matching') {
    const pairs = deriveMatchingPairs(material);
    // Fallback: if no pairs derivable, downgrade to MCQ renderer
    if (Object.keys(pairs).length >= 2) {
      return <MatchingGame pairs={pairs} />;
    }
  }

  return <>{renderMCQ(material)}</>;
}
