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
  const out: Record<string,string> = {};
  if (!material) return out;

  // 1. Prioritaskan glossary langsung jika tersedia
  if (Array.isArray(material.glossary)) {
    for (const g of material.glossary.slice(0, 12)) {
      const term = (g?.term || '').trim();
      const def = (g?.def || '').trim();
      if (term && def && !out[term]) out[term] = def.slice(0, 120);
    }
  }

  // 2. Jika tidak ada glossary, coba ekstrak dari points (bullet list) format "Istilah: Deskripsi"
  if (Object.keys(out).length < 4 && Array.isArray(material.points)) {
    for (const p of material.points) {
      if (typeof p !== 'string') continue;
      const parts = p.split(/[:\-–]\s+/); // pisah di titik dua atau dash
      if (parts.length >= 2) {
        const term = parts[0].trim();
        const def = parts.slice(1).join(' - ').trim();
        if (term && def && !out[term]) out[term] = def.slice(0, 120);
      }
      if (Object.keys(out).length >= 12) break;
    }
  }

  // 3. Jika masih kurang, coba dari body: cari pola "Istilah adalah ..." atau "Istilah merupakan ..."
  if (Object.keys(out).length < 4 && typeof material.body === 'string') {
    const sentences = material.body.split(/(?<=[.!?])\s+/).slice(0, 40); // batasi
    for (const s of sentences) {
      const m = s.match(/^([A-Z0-9][A-Za-z0-9 _-]{2,40})\s+(adalah|merupakan)\s+(.{10,160})$/i);
      if (m) {
        const term = m[1].trim();
        const def = m[3].trim();
        if (term && def && !out[term]) out[term] = def.slice(0, 120);
      }
      if (Object.keys(out).length >= 8) break;
    }
  }

  // Normalisasi: jika definisi terlalu pendek / sama dengan term, hapus
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (!v || v.length < 4 || v.toLowerCase() === k.toLowerCase()) delete out[k];
  }

  // Minimum 2 pair agar game valid
  if (Object.keys(out).length < 2) return {};
  return out;
}
