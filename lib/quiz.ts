import { randomUUID } from 'crypto';

// Types
export type QuizType = 'matching' | 'mcq';
export interface GeneratedQuizMeta {
  id: string;
  type: QuizType;
  createdAt: number;
  topicKey: string; // e.g. nodejs:streams:subsection
  seed: string; // deterministic reference
}

const QUIZ_KEY_PREFIX = 'quizmeta:'; // localStorage / KV prefix

// Pick quiz type once per topic/subsection and persist
export function chooseQuizType(topicKey: string): GeneratedQuizMeta {
  if (!topicKey) throw new Error('topicKey required');
  // Try localStorage (browser)
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(QUIZ_KEY_PREFIX + topicKey);
    if (raw) {
      try { return JSON.parse(raw) as GeneratedQuizMeta; } catch {}
    }
  }
  const type: QuizType = Math.random() < 0.5 ? 'matching' : 'mcq';
  const meta: GeneratedQuizMeta = {
    id: randomUUID(),
    type,
    createdAt: Date.now(),
    topicKey,
    seed: Math.random().toString(36).slice(2, 12),
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(QUIZ_KEY_PREFIX + topicKey, JSON.stringify(meta));
  }
  return meta;
}

// In-memory cache for generated study material / quiz content
const materialCache = new Map<string, any>();

export function cacheMaterial(topicKey: string, material: any) {
  materialCache.set(topicKey, material);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem('material:' + topicKey, JSON.stringify(material)); } catch {}
  }
}

export function getCachedMaterial(topicKey: string): any | null {
  if (materialCache.has(topicKey)) return materialCache.get(topicKey);
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('material:' + topicKey);
    if (raw) { try { return JSON.parse(raw); } catch {} }
  }
  return null;
}

// Example helper to derive matching pairs from material (placeholder)
export function deriveMatchingPairs(material: any): Record<string,string> {
  // TODO: implement real extraction: e.g. take key-value glossary from subsection
  if (!material || !material.glossary) return {};
  const out: Record<string,string> = {};
  for (const g of material.glossary.slice(0,8)) {
    if (g.term && g.def) out[g.term] = g.def;
  }
  return out;
}
