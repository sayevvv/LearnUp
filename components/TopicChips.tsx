"use client";
import { useEffect, useState } from 'react';

export default function TopicChips({ roadmapId }: { roadmapId: string }) {
  const [topics, setTopics] = useState<Array<{ slug: string; name: string; isPrimary: boolean }>>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/roadmaps/${roadmapId}/topics`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (active) setTopics((d?.topics || []).slice(0, 5));
      } catch {}
    })();
    return () => { active = false; };
  }, [roadmapId]);

  if (!topics.length) return null;

  return (
    <div className="flex items-center flex-wrap gap-2">
      {topics.map((t) => (
        <span
          key={t.slug}
          className={`px-2 py-0.5 text-xs rounded-full border ${
            t.isPrimary ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
          title={t.isPrimary ? 'Topik Utama' : 'Topik Sekunder'}
        >
          {t.name}
        </span>
      ))}
    </div>
  );
}
