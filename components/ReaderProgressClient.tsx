"use client";
import { useEffect, useRef, useState } from 'react';

export default function ReaderProgressClient({ roadmapId, m, s }: { roadmapId: string; m: number; s: number }) {
  const [marked, setMarked] = useState(false);
  const onceRef = useRef(false);

  useEffect(() => {
    const key = `readDone:${roadmapId}:m-${m}-t-${s}`;
    if (sessionStorage.getItem(key)) {
      setMarked(true);
      onceRef.current = true;
      return;
    }
    const el = document.getElementById('read-end-sentinel');
    if (!el) return;
    const io = new IntersectionObserver(async (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !onceRef.current) {
        onceRef.current = true;
        try {
          await fetch(`/api/roadmaps/${roadmapId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ milestoneIndex: m, taskIndex: s, done: true }),
            // Ensure the request isn't aborted if user navigates immediately
            keepalive: true,
          });
          setMarked(true);
          sessionStorage.setItem(key, '1');
        } catch {
          // silent fail
        }
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [roadmapId, m, s]);

  return (
    <div aria-live="polite" className="sr-only">{marked ? 'Ditandai selesai' : ''}</div>
  );
}
