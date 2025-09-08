// lib/topics/classifier.ts
import { TOPIC_LIST } from './catalog';

type Input = { title: string; summary?: string; milestones?: string[] };
type Output = { primary: string; secondary: string[]; confidence: { primary: number; secondary: Record<string, number> } };

export function classifyHeuristic(input: Input): Output {
  const { title, summary = '', milestones = [] } = input;
  const text = [title, summary, ...milestones].join(' \n ').toLowerCase();

  const scores = TOPIC_LIST.map(t => ({
    slug: t.slug,
    s: scoreTopic(text, [t.slug.replace('-', ' '), ...t.aliases]),
  }));

  // Light keyword nudges
  if (/(\b|_)(html|css|react|next|frontend|ui|ux)(\b|_)/.test(text)) bump('frontend', scores);
  if (/(\b|_)(api|node|express|server|database|sql|auth)(\b|_)/.test(text)) bump('backend', scores);
  if (/(\b|_)(docker|kubernetes|ci|cd|devops)(\b|_)/.test(text)) bump('devops', scores);
  if (/(\b|_)(ml|machine learning|deep learning|llm|genai|ai)(\b|_)/.test(text)) bump('ai-ml', scores);
  if (/(\b|_)(android|ios|mobile|flutter|react native|swift|kotlin)(\b|_)/.test(text)) bump('mobile', scores);

  const sorted = scores.sort((a,b)=>b.s-a.s);
  const top = sorted[0];
  const sum = sorted.reduce((acc,x)=>acc+x.s, 0);
  const primary = top && top.s > 0 ? top.slug : 'other';

  const secondaries = sorted
    .filter(x => x.slug !== primary && x.s >= (top?.s ?? 0) * 0.6 && x.s > 0)
    .slice(0, 2)
    .map(x => x.slug);

  const confPrimary = sum > 0 ? (top?.s ?? 0) / sum : 0;
  const confSecondary: Record<string, number> = {};
  for (const s2 of secondaries) {
    const sc = scores.find(x => x.slug === s2)?.s ?? 0;
    confSecondary[s2] = (top?.s ?? 0) ? sc / (top!.s) : 0;
  }

  return { primary, secondary: secondaries, confidence: { primary: confPrimary, secondary: confSecondary } };
}

function scoreTopic(text: string, aliases: string[]) {
  const lower = text.toLowerCase();
  let s = 0;
  for (const a of aliases) {
    const term = a.toLowerCase();
    const parts = lower.split(term);
    const matches = Math.max(0, parts.length - 1);
    if (matches > 0) s += matches;
  }
  return s;
}

function bump(slug: string, arr: Array<{ slug: string; s: number }>) {
  const t = arr.find(x => x.slug === slug);
  if (t) t.s += 2;
}
