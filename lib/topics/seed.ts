// lib/topics/seed.ts
import { prisma } from '@/lib/prisma';
import { TOPIC_LIST } from './catalog';

// Upsert all topics from the static catalog
export async function seedTopics() {
  for (const t of TOPIC_LIST) {
    try {
      await (prisma as any).topic.upsert({
        where: { slug: t.slug },
        update: { name: t.name, aliases: t.aliases },
        create: { slug: t.slug, name: t.name, aliases: t.aliases },
      });
    } catch {}
  }
}

// Ensure required slugs exist; if not in DB, try from catalog; fallback to simple name from slug
export async function ensureTopics(slugs: string[]) {
  if (!slugs.length) return;
  const existing = await (prisma as any).topic.findMany({ where: { slug: { in: slugs } }, select: { slug: true } });
  const have = new Set(existing.map((t: any) => t.slug));
  const missing = slugs.filter((s) => !have.has(s));
  if (!missing.length) return;

  const bySlug = Object.fromEntries(TOPIC_LIST.map((t) => [t.slug, t]));
  for (const s of missing) {
    const def = bySlug[s];
    const name = def?.name || s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    const aliases = def?.aliases || [];
    try {
      await (prisma as any).topic.upsert({
        where: { slug: s },
        update: { name, aliases },
        create: { slug: s, name, aliases },
      });
    } catch {}
  }
}
