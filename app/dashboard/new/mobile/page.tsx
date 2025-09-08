"use client";

import { useEffect, useMemo, useRef, useState, FormEvent, Fragment } from "react";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { Transition } from "@headlessui/react";
import { GitBranch, LayoutList, Sparkles, FilePlus2 } from "lucide-react";
import { cn } from "@/lib/utils";
import RoadmapGraph from "@/components/RoadmapGraph";
import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";
import { useToast } from "@/components/ui/ToastProvider";

// Schema must match desktop
const roadmapSchema = z.object({
  duration: z.string(),
  milestones: z.array(
    z.object({
      timeframe: z.string(),
      topic: z.string(),
      subbab: z.array(z.string()),
      estimated_dates: z.string().optional(),
      daily_duration: z.string().optional(),
    })
  ),
});

type RoadmapData = z.infer<typeof roadmapSchema>;

type Milestone = RoadmapData["milestones"][0];

export default function NewRoadmapMobilePage() {
  const { data: session, status } = useSession();
  const { show } = useToast();

  const [promptMode, setPromptMode] = useState<"simple" | "advanced">("simple");
  const [simpleDetails, setSimpleDetails] = useState("");
  const [topic, setTopic] = useState("");
  const [userLevel, setUserLevel] = useState<"beginner" | "intermediate" | "pro">("beginner");
  const [finalGoal, setFinalGoal] = useState("");
  const [enableTimeOptions, setEnableTimeOptions] = useState(false);
  const [availableDays, setAvailableDays] = useState("all");
  const [dailyDuration, setDailyDuration] = useState(2);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [useAltModel, setUseAltModel] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [activePromptMode, setActivePromptMode] = useState<"simple" | "advanced">("simple");
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [showTextView, setShowTextView] = useState(false);
  const [saving, setSaving] = useState(false);
  // FAB actions & AI edit flow
  const [fabOpen, setFabOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isSessionLoading = status === "loading";

  // Draft cache key per-user (or anon)
  const getDraftKey = () => `draft:roadmap:new:${(session as any)?.user?.id || 'anon'}`;

  // When on large screens, send users back to desktop page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        const qs = window.location.search || "";
        window.location.replace(`/dashboard/new${qs}`);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Draft cache: restore once (avoid overriding a fresh generation)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (typeof window === 'undefined') return;
    if (isLoading || roadmapData) return;
    try {
      const raw = localStorage.getItem(getDraftKey());
      if (!raw) return;
      const draft = JSON.parse(raw);
      const parsed = roadmapSchema.safeParse(draft?.roadmapData);
      if (parsed.success) {
        setRoadmapData(parsed.data);
        setRoadmapTitle(typeof draft?.roadmapTitle === 'string' ? draft.roadmapTitle : '');
        setActiveTopic(typeof draft?.activeTopic === 'string' ? draft.activeTopic : '');
        setActivePromptMode(draft?.activePromptMode === 'advanced' ? 'advanced' : 'simple');
        setShowTextView(Boolean(draft?.showTextView));
        restoredRef.current = true;
      }
    } catch {}
  }, [status, isLoading, roadmapData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (roadmapData) {
        const draft = {
          v: 1,
          at: Date.now(),
          roadmapData,
          roadmapTitle,
          activeTopic,
          activePromptMode,
          showTextView,
        };
        localStorage.setItem(getDraftKey(), JSON.stringify(draft));
      }
    } catch {}
  }, [roadmapData, roadmapTitle, activeTopic, activePromptMode, showTextView, status]);

  // Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setRoadmapData(null);
    setIsLoading(true);

    const topicToSend = (promptMode === "simple" ? simpleDetails : topic).trim();
    const details = (promptMode === "advanced")
      ? (() => {
          const levelLabel = userLevel === 'beginner'
            ? 'Baru mulai dari nol'
            : userLevel === 'intermediate'
              ? `Sudah paham dasar-dasar ${topic || 'topik ini'}`
              : 'Profesional yang ingin menambah skill';
          const parts: string[] = [];
          parts.push(`Level Pengguna: ${levelLabel}.`);
          parts.push(`Tujuan Akhir: ${finalGoal || 'Menguasai topik secara fundamental'}.`);
          if (enableTimeOptions) {
            const dayMapping: { [key: string]: string } = { all: 'Setiap Hari (Kerja & Akhir Pekan)', weekdays: 'Hanya Hari Kerja', weekends: 'Hanya Akhir Pekan' };
            parts.push(`Ketersediaan Waktu: ${dayMapping[availableDays]}.`);
            parts.push(`Durasi Belajar Maksimal: ${dailyDuration} jam per hari.`);
            parts.push(`Periode Belajar: Dari ${startDate || 'sekarang'} sampai ${endDate || 'tidak ditentukan'}.`);
          }
          return parts.join(' ').trim();
        })()
      : '';

    if (!topicToSend) {
      setIsLoading(false);
      setError('Mohon isi deskripsi topik.');
      return;
    }

    try {
      const endpoint = useAltModel ? '/api/generate-roadmap-gh' : '/api/generate-roadmap';
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topicToSend, details, promptMode }), });
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
      const data = await response.json();
      const parsedData = roadmapSchema.safeParse(data);
      if (parsedData.success) {
        setRoadmapData(parsedData.data);
        setActiveTopic(topicToSend);
        setActivePromptMode(promptMode);
        try {
          const titleRes = await fetch('/api/generate-title', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topicToSend, details }),
          });
          if (titleRes.ok) {
            const tdata = await titleRes.json();
            if (tdata?.title) setRoadmapTitle(tdata.title);
          }
        } catch {}
      } else {
        throw new Error("Struktur data dari server tidak valid.");
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRoadmap = async () => {
    if (!session) {
      show({ type: 'info', title: 'Perlu Login', message: 'Silakan login untuk menyimpan roadmap Anda.' });
      window.location.href = '/login?callbackUrl=/dashboard/new/mobile';
      return;
    }
    if (!roadmapData) return;
    try {
      setSaving(true);
      const response = await fetch('/api/roadmaps/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: roadmapTitle || activeTopic, content: roadmapData }) });
      if (!response.ok) throw new Error('Gagal menyimpan roadmap.');
      const saved = await response.json();
      show({ type: 'success', title: 'Tersimpan', message: 'Roadmap berhasil disimpan!' });
      // classify background
  try { localStorage.removeItem(getDraftKey()); } catch {}
      try {
        const payload = { title: roadmapTitle || activeTopic || 'Roadmap', summary: '', milestones: Array.isArray(roadmapData?.milestones) ? roadmapData!.milestones.map(m => m.topic) : [] };
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(`/api/roadmaps/${saved.id}/classify`, blob);
        } else {
          fetch(`/api/roadmaps/${saved.id}/classify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
        }
      } catch {}
      window.location.href = `/dashboard/roadmaps/${saved.id}?prepare=1`;
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
      show({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan.' });
    } finally { setSaving(false); }
  };

  // Submit AI edit (single-instruction flow)
  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!roadmapData || !editInstruction.trim()) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch('/api/roadmaps/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: roadmapData,
          instruction: editInstruction.trim(),
          promptMode: 'simple',
          constraints: undefined,
        }),
      });
      if (!res.ok) throw new Error('Gagal mengedit roadmap');
      const data = await res.json();
      const parsed = roadmapSchema.safeParse(data.updated);
      if (parsed.success) {
        setRoadmapData(parsed.data);
        setEditOpen(false);
        setEditInstruction("");
        try { show({ type: 'success', title: 'Perubahan Diterapkan', message: data.summary || 'Roadmap diperbarui.' }); } catch {}
      } else {
        setEditError('Perubahan tidak dapat diterapkan (validasi gagal).');
      }
    } catch (err: any) {
      setEditError(err.message || 'Terjadi kesalahan.');
    } finally {
      setEditLoading(false);
    }
  };

  const FormPanel = (
    <form id="new-roadmap-form" onSubmit={handleSubmit} className="flex flex-col max-w-md mx-auto w-full">
      <header className="pt-6 pb-2 px-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">Buat Roadmap Baru</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">Isi detail di bawah untuk memulai.</p>
      </header>
  <div className="px-4 pb-8">
        {promptMode === 'simple' ? (
          <div className="mt-4">
            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1.5">Apa yang ingin kamu pelajari?</label>
            <textarea id="prompt" value={simpleDetails} onChange={(e)=>setSimpleDetails(e.target.value)} required placeholder="Contoh: Belajar Next.js dari nol untuk bikin portfolio. Waktu luang 1-2 jam per hari." className="w-full h-28 px-3 py-2 transition-colors border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1.5">Topik Utama</label>
              <input id="topic" type="text" value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="Contoh: Belajar Next.js dari Dasar" className="w-full px-3 py-2 transition-colors border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label htmlFor="userLevel" className="block text-sm font-medium text-slate-700 mb-1.5">Level Pengguna</label>
              <select id="userLevel" value={userLevel} onChange={(e)=>setUserLevel(e.target.value as any)} className="w-full px-3 py-2 transition-colors border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
                <option value="beginner">Baru mulai dari nol</option>
                <option value="intermediate">{`Sudah paham dasar-dasar ${topic || 'topik ini'}`}</option>
                <option value="pro">Profesional yang ingin menambah skill</option>
              </select>
            </div>
            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-slate-700 mb-1.5">Tujuan Akhir <span className="text-slate-400">(Opsional)</span></label>
              <input id="goal" type="text" value={finalGoal} onChange={(e)=>setFinalGoal(e.target.value)} placeholder="Contoh: Lulus ujian sertifikasi" className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Pengaturan Waktu</span>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={enableTimeOptions} onChange={(e)=>setEnableTimeOptions(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  <span className="text-sm text-slate-700">Aktif</span>
                </label>
              </div>
              {enableTimeOptions && (
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Hari Tersedia</label>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <button type="button" onClick={()=>setAvailableDays('all')} className={`p-2 border rounded-md ${availableDays === 'all' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'}`}>Semua</button>
                      <button type="button" onClick={()=>setAvailableDays('weekdays')} className={`p-2 border rounded-md ${availableDays === 'weekdays' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'}`}>Kerja</button>
                      <button type="button" onClick={()=>setAvailableDays('weekends')} className={`p-2 border rounded-md ${availableDays === 'weekends' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'}`}>Akhir Pekan</button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1.5">Durasi Belajar per Hari</label>
                    <div className="flex items-center gap-2">
                      <input id="duration" type="range" min="1" max="8" value={dailyDuration} onChange={(e)=>setDailyDuration(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                      <span className="text-sm font-semibold text-slate-600 w-16 text-right">{dailyDuration} jam</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1.5">Tgl Mulai <span className="text-slate-400">(Opsional)</span></label>
                      <input id="startDate" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1.5">Tgl Selesai <span className="text-slate-400">(Opsional)</span></label>
                      <input id="endDate" type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Small inline model toggle above submit */}
        <div className="mt-4 flex items-center">
          <button
            type="button"
            onClick={() => setModelModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-300 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#151515]"
            aria-haspopup="dialog"
            aria-expanded={modelModalOpen}
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Model:</span>
            <span className="truncate">{useAltModel ? 'GitHub' : 'Gemini'}</span>
          </button>
        </div>
        {/* Submit button in normal flow (not floating) */}
        <div className="mt-5">
          <button type="submit" disabled={isLoading} className="w-full px-4 py-3 font-semibold text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60">
            {isLoading ? 'Menganalisis…' : 'Buat Roadmap'}
          </button>
        </div>
  {/* Spacer to keep submit visible above bottom navbar on mobile */}
  <div aria-hidden className="h-24" style={{ height: 'calc(88px + env(safe-area-inset-bottom))' }} />
      </div>
      {/* The submit above handles keyboard enter naturally */}
      {error && (<div className="px-4 pt-3 pb-4 text-sm text-red-700 bg-red-100 border-t border-red-200"><strong>Oops!</strong> {error}</div>)}
    </form>
  );

  const HeaderWithActions = (
    <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="px-4 py-3 max-w-3xl mx-auto flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Judul Roadmap</div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{roadmapTitle || activeTopic}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] overflow-hidden">
            <button type="button" onClick={() => setShowTextView(false)} className={`flex items-center gap-2 px-3 py-1.5 text-sm ${!showTextView ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`} title="Lihat Grafik" aria-pressed={!showTextView}>
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Graph</span>
            </button>
            <button type="button" onClick={() => setShowTextView(true)} className={`flex items-center gap-2 px-3 py-1.5 text-sm ${showTextView ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`} title="Lihat Teks" aria-pressed={showTextView}>
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </button>
          </div>
          <button type="button" onClick={handleSaveRoadmap} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50" title={saving ? 'Menyimpan…' : 'Simpan Roadmap'}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-white dark:bg-black">
      {isSessionLoading ? (
        <div className="flex h-[100svh] items-center justify-center"><p>Loading session...</p></div>
      ) : (
        <div className="mx-auto w-full max-w-3xl">
          {!roadmapData ? (
            <div className="relative flex h-[100svh] flex-col overflow-y-auto overscroll-contain">
              {/* Minimal sticky top tabs (text-only with underline) */}
              <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur">
                <div className="max-w-3xl mx-auto px-4 pt-2 pb-1 flex justify-center">
                  <nav role="tablist" aria-label="Mode Input" className="flex items-center gap-6">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={promptMode === 'simple'}
                      onClick={() => setPromptMode('simple')}
                      className={`text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 ${
                        promptMode === 'simple'
                          ? 'text-slate-900 dark:text-white font-semibold underline decoration-2 underline-offset-8 decoration-blue-600'
                          : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={promptMode === 'advanced'}
                      onClick={() => setPromptMode('advanced')}
                      className={`text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 ${
                        promptMode === 'advanced'
                          ? 'text-slate-900 dark:text-white font-semibold underline decoration-2 underline-offset-8 decoration-blue-600'
                          : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Advanced
                    </button>
                  </nav>
                </div>
              </div>
              {/* Scrollable content area */}
              <div className="flex-1 min-h-0 flex justify-center px-4 overflow-y-auto" style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>
                <div className="w-full max-w-md">
                  {FormPanel}
                </div>
              </div>
              {/* Submit button lives inside the form; no floating button or footer selector */}
              {/* Full-screen shimmering placeholder during generation */}
              {isLoading && (
                <div className="fixed inset-0 z-30 bg-white dark:bg-black">
                  <div className="h-full max-w-lg mx-auto flex items-center justify-center p-6">
                    <RoadmapPlaceholder isLoading={true} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col min-h-[100svh]">
              {HeaderWithActions}
              <div className={cn("relative flex-1 min-h-0 overflow-hidden bg-slate-50 dark:bg-black")}> 
                {showTextView ? (
                  <div className="absolute inset-0 overflow-y-auto p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
                    <ol className="space-y-4">
                      {roadmapData.milestones.map((m, idx) => (
                        <li key={`${idx}-${m.topic}`} className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="text-xs font-semibold tracking-widest uppercase text-blue-600">{m.timeframe || `Tahap ${idx + 1}`}</div>
                          <h3 className="mt-1 text-lg font-bold text-slate-900">{m.topic}</h3>
                          {Array.isArray((m as any).subbab) && (m as any).subbab.length ? (
                            <ul className="mt-3 space-y-2 text-sm text-slate-700">
                              {(m as any).subbab.map((title: string, ti: number) => (
                                <li key={ti} className="leading-relaxed list-disc list-inside text-slate-700">{title}</li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div className="absolute inset-0">
                    <RoadmapGraph data={roadmapData} onNodeClick={()=>{}} promptMode={activePromptMode} />
                  </div>
                )}
              </div>
              {/* Floating actions button */}
              {roadmapData && !editOpen && (
                <>
                  <button
                    type="button"
                    onClick={() => setFabOpen((v)=>!v)}
                    className="fixed right-4 z-[45] inline-flex items-center justify-center rounded-full shadow-lg bg-blue-600 text-white h-14 w-14 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
                    aria-haspopup="menu"
                    aria-expanded={fabOpen}
                    aria-label="Aksi Roadmap"
                  >
                    <Sparkles className="h-6 w-6" />
                  </button>
                  <Transition appear show={fabOpen} as={Fragment}>
                    <div className="fixed inset-x-0 z-[44] pointer-events-none" style={{ bottom: 'calc(148px + env(safe-area-inset-bottom))' }}>
                      <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-150"
                        enterFrom="opacity-0 translate-y-2"
                        enterTo="opacity-100 translate-y-0"
                        leave="ease-in duration-100"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-2"
                      >
                        <div className="mx-auto max-w-3xl px-4 pointer-events-auto">
                          <div className="ml-auto w-[min(320px,90%)] rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] shadow-xl overflow-hidden">
                            <button
                              type="button"
                              onClick={() => { setFabOpen(false); setEditOpen(true); setEditInstruction(''); setEditError(null); }}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-[#151515]"
                            >
                              <Sparkles className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="text-sm font-semibold">Edit dengan AI</div>
                                <div className="text-xs text-slate-500">Berikan instruksi singkat untuk memodifikasi roadmap.</div>
                              </div>
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-[#2a2a2a]" />
                            <button
                              type="button"
                              onClick={() => { setFabOpen(false); setRoadmapData(null); setRoadmapTitle(''); setActiveTopic(''); setActivePromptMode('simple'); }}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-[#151515]"
                            >
                              <FilePlus2 className="h-5 w-5 text-slate-700" />
                              <div>
                                <div className="text-sm font-semibold">Buat Baru</div>
                                <div className="text-xs text-slate-500">Mulai dari formulir untuk membuat roadmap baru.</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </Transition.Child>
                    </div>
                  </Transition>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {/* Model selection modal */}
      <Transition appear show={modelModalOpen} as={Fragment}>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" onClick={() => setModelModalOpen(false)} />
          </Transition.Child>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95">
            <div className="relative w-full sm:w-[420px] bg-white dark:bg-[#0f0f0f] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-[#1f1f1f]">
                <h3 className="text-sm font-semibold">Pilih Model</h3>
              </div>
              <div className="p-3">
                <div className="space-y-2">
                  <button type="button" onClick={() => { setUseAltModel(false); setModelModalOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md border ${!useAltModel ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-[#0e223a]' : 'border-slate-200 dark:border-[#2a2a2a]'} hover:bg-slate-50 dark:hover:bg-[#151515]`}>Gemini 1.5 Flash</button>
                  <button type="button" onClick={() => { setUseAltModel(true); setModelModalOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md border ${useAltModel ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-[#0e223a]' : 'border-slate-200 dark:border-[#2a2a2a]'} hover:bg-slate-50 dark:hover:bg-[#151515]`}>Gpt-5-mini</button>
                </div>
              </div>
              <div className="p-3 border-t border-slate-200 dark:border-[#1f1f1f] flex justify-end">
                <button type="button" onClick={() => setModelModalOpen(false)} className="px-3 py-1.5 text-sm rounded-md bg-slate-100 dark:bg-[#151515] hover:bg-slate-200 dark:hover:bg-[#1a1a1a]">Tutup</button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Transition>

      {/* AI Edit full-screen flow */}
      <Transition appear show={editOpen} as={Fragment}>
        <div className="fixed inset-0 z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="absolute inset-0 bg-black/40" onClick={() => (!editLoading ? setEditOpen(false) : null)} />
          </Transition.Child>
          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0" leave="ease-in duration-100" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2">
            <div className="absolute inset-x-0 bottom-0 top-0 bg-white dark:bg-black rounded-t-2xl sm:rounded-none sm:top-0">
              <div className="sticky top-0 z-10 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-black/80 backdrop-blur flex items-center justify-between">
                <div className="text-base font-semibold">Edit dengan AI</div>
                <button type="button" onClick={() => setEditOpen(false)} disabled={editLoading} className="text-sm px-3 py-1.5 rounded-md bg-slate-100 dark:bg-[#151515] hover:bg-slate-200 disabled:opacity-50">Tutup</button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
                <div>
                  <label htmlFor="ai-instruction" className="block text-sm font-medium text-slate-700 mb-1.5">Instruksi</label>
                  <textarea id="ai-instruction" value={editInstruction} onChange={(e)=>setEditInstruction(e.target.value)} placeholder="Contoh: Ringkas jadi 6 minggu dan tambah materi interview." className="w-full h-28 px-3 py-2 border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                {editError && (
                  <div className="text-sm text-red-700 bg-red-100 border border-red-200 rounded-md px-3 py-2">{editError}</div>
                )}
                <div className="pt-2">
                  <button type="submit" disabled={editLoading || !editInstruction.trim()} className="w-full px-4 py-3 font-semibold text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60">
                    {editLoading ? 'Mengedit…' : 'Terapkan Edit'}
                  </button>
                </div>
              </form>
              {editLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/60">
                  <div className="w-full max-w-sm px-4">
                    <RoadmapPlaceholder isLoading={true} />
                  </div>
                </div>
              )}
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </div>
  );
}

// Floating Action Button (FAB) submit for minimal mobile UX
// Rendered outside the page content so it doesn't obstruct the form layout
// Appears only on the form step, hidden during loading and after roadmap is generated
