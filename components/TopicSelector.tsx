"use client";
import { useEffect, useMemo, useState } from 'react';

type Topic = { id: string; slug: string; name: string };

export default function TopicSelector({ roadmapId, onSaved }: { roadmapId: string; onSaved?: () => void }) {
  const [all, setAll] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/topics', { cache: 'no-store' });
        const d = await r.json();
        if (active && Array.isArray(d?.topics)) setAll(d.topics);
      } catch {}
    })();
    return () => { active = false };
  }, []);

  // Prefill from roadmap's current topics (AI or author), marking primary
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/roadmaps/${roadmapId}/topics`, { cache: 'no-store' });
        const d = await r.json();
        if (!active) return;
        if (Array.isArray(d?.topics) && d.topics.length) {
          const ids = d.topics.map((t: any) => t.id).filter(Boolean);
          const primaryRow = d.topics.find((t: any) => t.isPrimary);
          setSelected(ids);
          setPrimary(primaryRow?.id);
        }
      } catch {}
    })();
    return () => { active = false };
  }, [roadmapId]);

  const canSave = selected.length > 0 && (!primary || selected.includes(primary));
  const primaryOptions = useMemo(() => all.filter(t => selected.includes(t.id)), [all, selected]);
  const primaryName = useMemo(() => all.find(t => t.id === primary)?.name || '', [all, primary]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter(x => x !== id) : [...prev, id];
      if (has && primary === id) setPrimary(undefined);
      return next;
    });
  };

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/roadmaps/${roadmapId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicIds: selected, primaryId: primary || null }),
      });
      if (res.ok) onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-slate-600">Pilih topik untuk roadmap ini (opsional, Anda juga bisa biarkan AI mengklasifikasikan otomatis).</div>
      <div className="flex flex-wrap gap-2">
        {all.map(t => {
          const active = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`relative px-2 py-1 rounded-full border text-xs ${active ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {t.name}
              {selected.length > 1 && primary === t.id && (
                <span className="ml-1 inline-flex items-center rounded-full bg-blue-600 text-white px-1.5 py-0.5 text-[10px]">Utama</span>
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 1 && (
        <div className="text-[12px] text-slate-600">
          Topik utama saat ini: <span className="font-semibold">{primary ? primaryName : 'Belum dipilih'}</span>
        </div>
      )}

      {selected.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Topik Utama:</label>
          <select
            className="text-sm border rounded px-2 py-1"
            value={primary || ''}
            onChange={(e) => setPrimary(e.target.value || undefined)}
          >
            <option value="">— Tidak ada —</option>
            {primaryOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button disabled={!canSave || saving} onClick={submit} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Simpan Topik'}
        </button>
      </div>
    </div>
  );
}
