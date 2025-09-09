"use client";
import React, { useEffect, useState } from 'react';
import MatchingGame from './MatchingGame';
import { chooseQuizType, getCachedMaterial, cacheMaterial, deriveMatchingPairs, QuizType } from '@/lib/quiz';
import MCQInline, { MCQQuestion } from './MCQInline';

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

  // Enhanced MCQ fallback: attempt to synthesize local MCQs if renderMCQ not tailored
  try {
    const synthesized: MCQQuestion[] = [];
    // Strategy: if glossary exists, make each term a question asking definition selection
    if (Array.isArray(material?.glossary)) {
      for (const g of material.glossary.slice(0,5)) {
        const term = String(g.term||'').trim();
        const correct = String(g.def||'').trim();
        if (!term || !correct) continue;
        // distractors: other definitions
        const defs = material.glossary.map((x:any)=>String(x.def||'').trim()).filter((d:string)=>d && d!==correct);
        const shuffled = [...defs.sort(()=>Math.random()-0.5).slice(0,3), correct].sort(()=>Math.random()-0.5);
        const answer = shuffled.indexOf(correct);
        if (answer === -1) continue;
        synthesized.push({ q: `Apa definisi dari: ${term}?`, choices: shuffled, answer });
      }
    }
    // If not enough, derive from points (format Term: definisi)
    if (synthesized.length < 3 && Array.isArray(material?.points)) {
      for (const p of material.points) {
        if (synthesized.length >= 5) break;
        if (typeof p !== 'string') continue;
        const parts = p.split(/[:\-–]\s+/);
        if (parts.length >= 2) {
          const term = parts[0].trim();
          const def = parts.slice(1).join(' - ').trim();
          if (!term || !def) continue;
          // choices: correct + random other point fragments
            const others = material.points.filter((x:any)=>x!==p && typeof x==='string').map((x:string)=>{
              const ps = x.split(/[:\-–]\s+/); return ps.slice(1).join(' - ').trim();
            }).filter((x:string)=>x && x!==def);
          const choices = [...others.sort(()=>Math.random()-0.5).slice(0,3), def].sort(()=>Math.random()-0.5);
          const answer = choices.indexOf(def);
          if (answer !== -1) synthesized.push({ q: `Apa arti: ${term}?`, choices, answer });
        }
      }
    }
    if (synthesized.length >= 3) {
      return <MCQInline questions={synthesized} />;
    }
  } catch {}

  return <>{renderMCQ(material)}</>;
}
