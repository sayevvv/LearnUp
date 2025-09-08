// app/dashboard/roadmaps/[id]/loading/page.tsx
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RoadmapPreparingPage({ params }: any) {
  const { id } = params as { id: string };
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/roadmaps/${id}/prepare-materials`, { method: 'POST' });
        if (!res.ok) throw new Error('Gagal menyiapkan materi');
        if (!active) return;
        router.replace(`/dashboard/roadmaps/${id}?from=prepared`);
      } catch (e: any) {
        if (!active) return;
        setError(e.message || 'Gagal menyiapkan materi');
      }
    })();
    return () => { active = false; };
  }, [id, router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-sm text-slate-500">Menyiapkan materi belajar…</div>
        <div className="mt-3 h-2 w-64 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-blue-600 animate-pulse" />
        </div>
        {error ? <div className="mt-3 text-red-600">{error}</div> : null}
      </div>
    </div>
  );
}
