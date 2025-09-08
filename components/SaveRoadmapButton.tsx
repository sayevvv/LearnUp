"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { Bookmark } from "lucide-react";
import { useSession } from "next-auth/react";
import LoginGateModal from "./LoginGateModal";

export default function SaveRoadmapButton({ roadmapId }: { roadmapId: string }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openGate, setOpenGate] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const { show } = useToast();

  // Hydrate initial saved state
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/roadmaps/${roadmapId}/save`, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({} as any));
        if (!ignore) setSaved(!!data?.saved);
      } catch {}
    })();
    return () => { ignore = true; };
  }, [roadmapId]);

  async function handleSave() {
    try {
    if (!session) { setOpenGate(true); return; }
      setLoading(true);
      const res = await fetch(`/api/roadmaps/${roadmapId}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!res.ok) {
        if (res.status === 401) {
      setOpenGate(true);
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan roadmap');
      }
      const data = await res.json().catch(() => ({} as any));
      setSaved(true);
      show({ type: 'success', title: 'Tersimpan', message: 'Roadmap berhasil disimpan.' });
      // If cloneId returned, redirect to private tracker so user can start immediately
      if (data?.cloneId) {
        router.push(`/dashboard/roadmaps/${data.cloneId}?from=browse`);
        return;
      }
    } catch (e) {
      console.error(e);
      show({ type: 'error', title: 'Gagal', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsave() {
    try {
    if (!session) { setOpenGate(true); return; }
      setLoading(true);
      const res = await fetch(`/api/roadmaps/${roadmapId}/save`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 401) {
      setOpenGate(true);
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menghapus simpanan');
      }
      setSaved(false);
      show({ type: 'info', title: 'Dihapus', message: 'Roadmap dihapus dari tersimpan.' });
    } catch (e) {
      console.error(e);
      show({ type: 'error', title: 'Gagal', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {saved ? (
        <button onClick={handleUnsave} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 disabled:opacity-50">
          <Bookmark className="h-4 w-4" />
          {loading ? 'Menghapus…' : 'Tersimpan'}
        </button>
      ) : (
        <button onClick={handleSave} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          <Bookmark className="h-4 w-4" />
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      )}
      <LoginGateModal open={openGate} onClose={() => setOpenGate(false)} target={typeof window !== 'undefined' ? window.location.pathname : '/dashboard'} />
    </>
  );
}
