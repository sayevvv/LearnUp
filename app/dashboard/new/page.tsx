// app/dashboard/new/page.tsx

"use client";

import { useState, useEffect, useRef, FormEvent, Fragment } from "react";
import { useToast } from '@/components/ui/ToastProvider';
import { z } from "zod";
import RoadmapGraph from "@/components/RoadmapGraph";
import RoadmapPlaceholder from "@/components/RoadmapPlaceholder"; // Impor komponen baru
import { Transition } from "@headlessui/react";
import { useSession } from "next-auth/react";
import { cn } from '@/lib/utils';
import { GitBranch, LayoutList, BookOpen, Hammer, Dumbbell, FilePlus2 } from 'lucide-react';

// --- Skema Zod ---
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

// mindmap and AI explanation are no longer used in this page

type Milestone = RoadmapData["milestones"][0];

// Chat UI components
const ChatBubble = ({ role, content }: { role: 'user'|'assistant'; content: string }) => {
  const isUser = role === 'user';
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm',
        isUser ? 'bg-blue-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'
      )}>
        {content}
      </div>
    </div>
  );
};

const TypingBubble = () => (
  <div className="flex justify-start">
    <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md px-3 py-2 text-sm shadow-sm">
      <span className="inline-flex gap-1">
        <span className="size-1.5 rounded-full bg-slate-500 animate-pulse" />
        <span className="size-1.5 rounded-full bg-slate-500 animate-pulse [animation-delay:120ms]" />
        <span className="size-1.5 rounded-full bg-slate-500 animate-pulse [animation-delay:240ms]" />
      </span>
    </div>
  </div>
);

// --- Modal Detail Node (tanpa AI & mindmap) ---
const NodeDetailModal = ({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) => (
  <Transition as={Fragment} show={true} appear>
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
        <div className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm" onClick={onClose} />
      </Transition.Child>
      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
        <div className="relative bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl w-[min(92vw,720px)] max-h-[80vh] flex flex-col overflow-hidden">
          <header className="flex items-center justify-between flex-shrink-0 p-4 border-b border-slate-200 dark:border-[#1f1f1f]">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-widest uppercase text-blue-600 truncate">{milestone.timeframe || 'Tahap'}</div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white" id="modal-title">{milestone.topic}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-neutral-400">
                {milestone.estimated_dates ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#121212] px-2 py-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 11h5v5H7z"></path><path fillRule="evenodd" d="M6 1.5a.75.75 0 0 1 .75.75V4h10.5V2.25a.75.75 0 0 1 1.5 0V4H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1.75V2.25A.75.75 0 0 1 6 1.5Zm14 6H4v10a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V7.5Z" clipRule="evenodd"/></svg>
                    {milestone.estimated_dates}
                  </span>
                ) : null}
                {milestone.daily_duration ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#121212] px-2 py-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.75a.75.75 0 0 1 .75.75v9.19l4.28 2.47a.75.75 0 1 1-.75 1.3l-4.75-2.75A.75.75 0 0 1 11.25 12V2.5A.75.75 0 0 1 12 1.75Z"/><path fillRule="evenodd" d="M12 22.5c5.8 0 10.5-4.7 10.5-10.5S17.8 1.5 12 1.5 1.5 6.2 1.5 12 6.2 22.5 12 22.5Zm0-1.5a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" clipRule="evenodd"/></svg>
                    {milestone.daily_duration}/hari
                  </span>
                ) : null}
              </div>
            </div>
            <button onClick={onClose} className="p-1 transition-colors rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]" aria-label="Close modal">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-5">
            <h3 className="font-semibold text-slate-800 dark:text-neutral-200 text-sm">Subbab</h3>
            {Array.isArray((milestone as any).subbab) && (milestone as any).subbab.length ? (
              <ol className="mt-2 space-y-2 text-sm list-decimal list-inside text-slate-700 dark:text-neutral-300">
                {(milestone as any).subbab.map((title: string, ti: number) => (
                  <li key={ti} className="leading-relaxed">{title}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Belum ada rincian subbab untuk materi ini.</p>
            )}
          </div>
        </div>
      </Transition.Child>
    </div>
  </Transition>
);

// --- Komponen Halaman Buat Roadmap Baru ---
export default function NewRoadmapPage() {
  const { data: session, status } = useSession();
  const { show } = useToast();
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [genActive, setGenActive] = useState(false); // cross-tab gate: sedang generate
  const [error, setError] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [nodeSummary, setNodeSummary] = useState<string | null>(null);
  const [promptMode, setPromptMode] = useState<'simple' | 'advanced'>('simple');
  const [topic, setTopic] = useState("");
  const [simpleDetails, setSimpleDetails] = useState("");
  const [availableDays, setAvailableDays] = useState('all');
  const [dailyDuration, setDailyDuration] = useState(2);
  const [finalGoal, setFinalGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'pro'>('beginner');
  const [enableTimeOptions, setEnableTimeOptions] = useState(false);
  const [showTextView, setShowTextView] = useState(false);
  const [roadmapTitle, setRoadmapTitle] = useState('');
  // Snapshot of the topic used to generate the currently loaded roadmap (for stable display)
  const [activeTopic, setActiveTopic] = useState('');
  // Snapshot of the prompt mode used to generate the current roadmap (stabilize timestamps display)
  const [activePromptMode, setActivePromptMode] = useState<'simple' | 'advanced'>('simple');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // Model selection: default uses Gemini; alt uses Gpt-5-mini
  const [useAltModel, setUseAltModel] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  // Chat-like AI edit state (now lives in the left panel after roadmap exists)
  const [chatMessages, setChatMessages] = useState<{ role: 'user'|'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [useAdvancedContext, setUseAdvancedContext] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const isSessionLoading = status === "loading";

  // Draft cache key per-user (or anon)
  const getDraftKey = () => `draft:roadmap:new:${(session as any)?.user?.id || 'anon'}`;

  // Client-only redirect to mobile-optimized page on small viewports
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const redirectIfMobile = () => {
      try {
        if (window.innerWidth < 1024) {
          const qs = window.location.search || '';
          window.location.replace(`/dashboard/new/mobile${qs}`);
        }
      } catch {}
    };
    redirectIfMobile();
  }, []);

  // Cross-tab generation gate helpers
  const GEN_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL to clear stale locks
  const getGenKey = () => `gen:roadmap:${(session as any)?.user?.id || 'anon'}`;
  const refreshGenActive = () => {
    try {
      const key = getGenKey();
      const val = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (!val) { setGenActive(false); return; }
      const ts = Number(val);
      if (Number.isFinite(ts)) {
        const age = Date.now() - ts;
        if (age > GEN_TTL_MS) {
          localStorage.removeItem(key);
          setGenActive(false);
        } else {
          setGenActive(true);
        }
      } else {
        // unexpected value; clear
        localStorage.removeItem(key);
        setGenActive(false);
      }
    } catch { setGenActive(false); }
  };

  useEffect(() => { refreshGenActive(); }, [status]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const key = getGenKey();
      if (e.key === key) refreshGenActive();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleNodeClick = (milestone: Milestone) => {
    // Open modal showing only the selected node's existing details
    setSelectedMilestone(milestone);
    // Load concise explanation from cache or API
    try {
      const keyDetails = Array.isArray((milestone as any).subbab) ? (milestone as any).subbab.join(" | ") : '';
      const cacheKey = `nodeSummary:${milestone.topic}:${keyDetails}`;
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        setNodeSummary(cached);
      } else {
        setNodeSummary(null);
        fetch('/api/generate-explanation-short', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: milestone.topic, details: keyDetails })
        })
          .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal generate ringkasan'))))
          .then((j) => {
            const summary = (j?.explanation || '').toString();
            if (summary) {
              setNodeSummary(summary);
              try { localStorage.setItem(cacheKey, summary); } catch {}
            }
          })
          .catch(() => {});
      }
    } catch {}
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Gate: if a generation is already running for this user, block and notify
    if (genActive) {
      show({ type: 'info', title: 'Sedang generate', message: 'Sedang membuat roadmap, mohon menunggu hingga selesai.' });
      return;
    }
    // If replacing an existing roadmap, run cancel-like reset but without confirmation; show warning toast
    if (roadmapData) {
      try { show({ type: 'info', title: 'Mengganti Roadmap', message: 'Roadmap sebelumnya dibuang. Membuat yang baru…' }); } catch {}
      setChatMessages([]);
      setChatInput('');
      setChatLoading(false);
  setSelectedMilestone(null);
      setShowTextView(false);
      setRoadmapTitle('');
      setNewFormOpen(false);
    }
    setIsLoading(true);
  // Mark local generation lock
  try { localStorage.setItem(getGenKey(), String(Date.now())); } catch {}
  setError(null);
  // Do not wipe draft cache on state clear; keep UI state empty while new gen runs
  setRoadmapData(null);
  setIsSaved(false);
    const topicToSend = (promptMode === 'simple' ? simpleDetails : topic).trim();
    const details = (promptMode === 'advanced')
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
    if (promptMode === 'simple') {
      // simpan juga ke state topic untuk fallback judul/simpan
      setTopic(topicToSend);
    }
    try {
      const endpoint = useAltModel ? '/api/generate-roadmap-gh' : '/api/generate-roadmap';
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topicToSend, details, promptMode }), });
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
      const data = await response.json();
      const parsedData = roadmapSchema.safeParse(data);
      if (parsedData.success) {
        setRoadmapData(parsedData.data);
  setIsSaved(false);
        // Snapshot the topic used for this roadmap to keep header stable while drafting a new one
        setActiveTopic(topicToSend);
  // Snapshot the prompt mode used to generate this roadmap so left panel toggles won't affect graph display
  setActivePromptMode(promptMode);
        // Generate title automatically from topic and details
        try {
          const titleRes = await fetch('/api/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topicToSend, details }),
          });
          if (titleRes.ok) {
            const tdata = await titleRes.json();
            if (tdata?.title) setRoadmapTitle(tdata.title);
          }
  } catch {
          console.warn('Gagal membuat judul otomatis, fallback ke topik.');
        }
      } else { console.error("Validation Error:", parsedData.error); throw new Error("Struktur data dari server tidak valid."); }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
  // Clear generation lock (best-effort)
  try { localStorage.removeItem(getGenKey()); setGenActive(false); } catch {}
    }
  };

  const handleSaveRoadmap = async () => {
  if (saving) return;
    if (!session) {
  show({ type: 'info', title: 'Perlu Login', message: 'Silakan login untuk menyimpan roadmap Anda.' });
      window.location.href = '/login?callbackUrl=/dashboard/new';
      return;
    }
    if (!roadmapData) {
  show({ type: 'error', title: 'Tidak Bisa Menyimpan', message: 'Tidak ada roadmap untuk disimpan!' });
      return;
    }
    try {
      setSaving(true);
  const response = await fetch('/api/roadmaps/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: roadmapTitle || activeTopic, content: roadmapData, }), });
      if (!response.ok) throw new Error("Gagal menyimpan roadmap.");
  const saved = await response.json();
  show({ type: 'success', title: 'Tersimpan', message: 'Roadmap berhasil disimpan!' });
      setIsSaved(true);
  // Remove cached draft after successful save
  try { localStorage.removeItem(getDraftKey()); } catch {}
      // Klasifikasi topik di background
      try {
        const payload = {
          title: roadmapTitle || activeTopic || 'Roadmap',
          summary: '',
          milestones: Array.isArray(roadmapData?.milestones) ? roadmapData!.milestones.map(m => m.topic) : [],
        };
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(`/api/roadmaps/${saved.id}/classify`, blob);
        } else {
          fetch(`/api/roadmaps/${saved.id}/classify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
        }
      } catch {}
  // Redirect langsung ke halaman roadmap untuk menyiapkan materi di dalam halaman
  window.location.href = `/dashboard/roadmaps/${saved.id}?prepare=1`;
    } catch (err: any) {
      setError(err.message);
  show({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan.' });
    } finally { setSaving(false); }
  };

  // Batalkan pembuatan/penyuntingan roadmap dan reset seluruh state ke awal
  const handleCancel = () => {
    const somethingToLose = !!(
      simpleDetails.trim() || topic.trim() || finalGoal.trim() || startDate || endDate ||
      promptMode === 'advanced' || availableDays !== 'all' || dailyDuration !== 2 ||
      roadmapData
    );
    if (somethingToLose) {
      const ok = window.confirm('Batalkan pembuatan roadmap ini? Semua perubahan akan hilang.');
      if (!ok) return;
    }
    // Reset form inputs
    setPromptMode('simple');
    setSimpleDetails('');
    setTopic('');
    setAvailableDays('all');
    setDailyDuration(2);
    setStartDate('');
    setEndDate('');
    setFinalGoal('');
    setError(null);
    setIsLoading(false);
    setShowTextView(false);
    // Reset generated & chat state
    setRoadmapData(null);
    setRoadmapTitle('');
  setActiveTopic('');
  setActivePromptMode('simple');
    setChatMessages([]);
    setChatInput('');
    setChatLoading(false);
    setUseAdvancedContext(false);
    setListKey((k) => k + 1);
    setSelectedMilestone(null);
  // clear only selection; no AI/mindmap state to reset anymore
    // Mark as saved to silence unsaved guard
    setIsSaved(true);
    try { show({ type: 'info', title: 'Dibatalkan', message: 'Pembuatan roadmap dibatalkan.' }); } catch {}
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!roadmapData || !chatInput.trim()) return;
    const userMsg = { role: 'user' as const, content: chatInput.trim() };
    setChatMessages((m) => [...m, userMsg]);
    setChatLoading(true);
    try {
  const constraints = useAdvancedContext ? { availableDays, dailyDuration, startDate, endDate, finalGoal, userLevel } : undefined;
      const res = await fetch('/api/roadmaps/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: roadmapData,
          instruction: chatInput.trim(),
          promptMode: useAdvancedContext ? 'advanced' : 'simple',
          constraints,
        }),
      });
      if (!res.ok) throw new Error('Gagal mengedit roadmap');
      const data = await res.json();
      const parsed = roadmapSchema.safeParse(data.updated);
      if (parsed.success) {
        setRoadmapData(parsed.data);
        setIsSaved(false); // any edit makes it unsaved again
        setChatMessages((m) => [...m, { role: 'assistant', content: data.summary || 'Perubahan diterapkan.' }]);
      } else {
        setChatMessages((m) => [...m, { role: 'assistant', content: 'Maaf, perubahan tidak dapat diterapkan (validasi gagal).' }]);
      }
    } catch (err: any) {
      setChatMessages((m) => [...m, { role: 'assistant', content: err.message || 'Terjadi kesalahan.' }]);
    } finally {
      setChatLoading(false);
      setChatInput('');
      setListKey((k) => k + 1);
    }
  };

  // no explicit startNewRoadmap; use icon toggle to open the initial form

  // Prefill form from URL params (support simple/advanced coming from HomeStartBox)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const mode = sp.get('mode');
      if (mode === 'advanced') {
        setPromptMode('advanced');
        const t = sp.get('topic') || '';
        if (t) setTopic(t);
        const lvl = sp.get('level');
        if (lvl) {
          // Map 'expert' (from HomeStartBox) to internal 'pro'
          const mapped = lvl === 'expert' ? 'pro' : (lvl === 'beginner' || lvl === 'intermediate' ? lvl : 'beginner');
          setUserLevel(mapped as 'beginner' | 'intermediate' | 'pro');
        }
        const g = sp.get('goal') || '';
        if (g) setFinalGoal(g);
        // Time settings
        const enableTime = sp.get('enableTime');
        if (enableTime === '1') {
          setEnableTimeOptions(true);
          const ad = sp.get('availableDays');
          if (ad === 'all' || ad === 'weekdays' || ad === 'weekends') setAvailableDays(ad);
          const dd = sp.get('dailyDuration');
          if (dd && !Number.isNaN(Number(dd))) setDailyDuration(Number(dd));
          const sd = sp.get('startDate');
          if (sd) setStartDate(sd);
          const ed = sp.get('endDate');
          if (ed) setEndDate(ed);
        }
      } else if (mode === 'simple') {
        const q = sp.get('q') || '';
        if (q) {
          setPromptMode('simple');
          setSimpleDetails(q);
        }
      }
    } catch {}
  }, []);

  // Auto-start generation when navigated from Home with params filled
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const mode = sp.get('mode');
    if (mode === 'simple' && simpleDetails.trim()) {
      // Slight defer to ensure state is applied
      const t = setTimeout(() => {
        // Avoid duplicate submits
        if (!isLoading && !roadmapData) {
          const evt = new Event('submit');
          // Manually call handleSubmit instead of dispatching form event
          handleSubmit({ preventDefault: () => {} } as any);
        }
      }, 0);
      return () => clearTimeout(t);
    }
    if (mode === 'advanced' && (topic.trim() || finalGoal.trim())) {
      const t = setTimeout(() => {
        if (!isLoading && !roadmapData) {
          handleSubmit({ preventDefault: () => {} } as any);
        }
      }, 0);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simpleDetails, topic, finalGoal, enableTimeOptions, availableDays, dailyDuration, startDate, endDate]);

  // Remove unsaved-progress warnings: rely on local draft cache instead

  // Draft cache: restore once on load (per user) and persist on changes
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (typeof window === 'undefined') return;
    if (isLoading || roadmapData) return; // don't override active gen or loaded roadmap
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
        setIsSaved(false);
        restoredRef.current = true;
      }
    } catch {}
  // re-run when session becomes available so key can change
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
      // Do not clear when roadmapData is null to keep last good draft
    } catch {}
  }, [roadmapData, roadmapTitle, activeTopic, activePromptMode, showTextView, status]);

  // Text View component to render roadmap as clickable list
  const RoadmapTextView = ({ data, onClick }: { data: RoadmapData; onClick: (m: Milestone) => void }) => (
    <div className="h-full overflow-y-auto p-6 sm:p-8">
      <ol className="space-y-4">
        {data.milestones.map((m, idx) => (
          <li key={`${idx}-${m.topic}`}>
            <button
              type="button"
              onClick={() => onClick(m)}
              className="w-full text-left group"
            >
              <div className="rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold tracking-widest uppercase text-blue-600">{m.timeframe || `Tahap ${idx + 1}`}</div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900 group-hover:text-blue-700">{m.topic}</h3>
                  </div>
                  <div className="flex-shrink-0 text-sm text-slate-500">{m.estimated_dates || ''}</div>
                </div>
                {Array.isArray((m as any).subbab) && (m as any).subbab.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {(m as any).subbab.map((title: string, ti: number) => (
                      <li key={ti} className="leading-relaxed list-disc list-inside text-slate-700">{title}</li>
                    ))}
                  </ul>
                ) : null}
                {m.daily_duration && (
                  <div className="mt-3 text-xs text-slate-500">Durasi harian: {m.daily_duration}</div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    isSessionLoading ? (
      <div className="flex h-full items-center justify-center"><p>Loading session...</p></div>
    ) : (
  <div className="flex h-full flex-col lg:flex-row">
  <div className="w-full lg:w-[400px] bg-white dark:bg-black p-4 sm:p-6 lg:p-8 flex flex-col flex-shrink-0 lg:min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
        {!roadmapData || newFormOpen ? (
          <>
            <header className={"flex items-center justify-between gap-3"}>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">Buat Roadmap Baru</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 truncate">Isi detail di bawah untuk memulai.</p>
              </div>
              {roadmapData ? (
                <button
                  type="button"
                  onClick={() => setNewFormOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  title="Kembali ke Edit AI"
                >
                  <FilePlus2 className="h-4 w-4" />
                </button>
              ) : null}
            </header>
            {genActive && (
              <div className="mt-4 p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 dark:bg-[#0b1a24] dark:border-[#0e2635] dark:text-sky-300 flex items-center gap-2">
                <span className="h-4 w-4 inline-block rounded-full border-2 border-blue-600 border-t-transparent animate-spin" aria-hidden />
                <span>Sedang membuat roadmap, mohon menunggu…</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0 mt-8">
              {/* Pilih mode prompt */}
              <div className="flex p-1 mb-6 bg-slate-100 rounded-lg">
                <button type="button" disabled={genActive} onClick={() => setPromptMode('simple')} className={`w-1/2 p-2 text-sm font-semibold rounded-md transition-colors ${promptMode === 'simple' ? 'bg-white shadow text-blue-600' : 'text-slate-500'} ${genActive ? 'opacity-60 cursor-not-allowed' : ''}`}>Simple</button>
                <button type="button" disabled={genActive} onClick={() => setPromptMode('advanced')} className={`w-1/2 p-2 text-sm font-semibold rounded-md transition-colors ${promptMode === 'advanced' ? 'bg-white shadow text-blue-600' : 'text-slate-500'} ${genActive ? 'opacity-60 cursor-not-allowed' : ''}`}>Advanced</button>
              </div>
              <div className="mt-4 flex-grow overflow-y-auto pr-2 min-h-0 no-scrollbar">
                {promptMode === 'simple' ? (
                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1.5">Apa yang ingin kamu pelajari?</label>
                    <textarea id="prompt" disabled={genActive} value={simpleDetails} onChange={(e) => setSimpleDetails(e.target.value)} required placeholder="Contoh: Belajar Next.js dari nol untuk bikin portfolio. Waktu luang 1-2 jam per hari." className="w-full h-28 px-3 py-2 transition-colors border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"/>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 1. Topik Utama */}
                    <div>
                      <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1.5">Topik Utama</label>
                      <input id="topic" disabled={genActive} type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Contoh: Belajar Next.js dari Dasar" className="w-full px-3 py-2 transition-colors border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" required/>
                    </div>
                    {/* 2. Level Pengguna */}
                    <div>
                      <label htmlFor="userLevel" className="block text-sm font-medium text-slate-700 mb-1.5">Level Pengguna</label>
                      <select disabled={genActive}
                        id="userLevel"
                        value={userLevel}
                        onChange={(e) => setUserLevel(e.target.value as any)}
                        className="w-full px-3 py-2 transition-colors border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      >
                        <option value="beginner">Baru mulai dari nol</option>
                        <option value="intermediate">{`Sudah paham dasar-dasar ${topic || 'topik ini'}`}</option>
                        <option value="pro">Profesional yang ingin menambah skill</option>
                      </select>
                    </div>
                    {/* 3. Tujuan Akhir */}
                    <div>
                      <label htmlFor="goal" className="block text-sm font-medium text-slate-700 mb-1.5">Tujuan Akhir <span className="text-slate-400">(Opsional)</span></label>
                      <input id="goal" disabled={genActive} type="text" value={finalGoal} onChange={(e) => setFinalGoal(e.target.value)} placeholder="Contoh: Lulus ujian sertifikasi" className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"/>
                    </div>
                    {/* 4. Pengaturan Waktu (toggle) */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Pengaturan Waktu</span>
                        <label className="inline-flex items-center gap-2">
                          <input disabled={genActive}
                            type="checkbox"
                            checked={enableTimeOptions}
                            onChange={(e) => setEnableTimeOptions(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700">Aktif</span>
                        </label>
                      </div>
                      {enableTimeOptions && (
                        <div className="mt-3 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Hari Tersedia</label>
                            <div className="grid grid-cols-3 gap-2 text-xs text-center">
                              <button type="button" disabled={genActive} onClick={() => setAvailableDays('all')} className={`p-2 border rounded-md ${availableDays === 'all' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'} ${genActive ? 'opacity-60 cursor-not-allowed' : ''}`}>Semua</button>
                              <button type="button" disabled={genActive} onClick={() => setAvailableDays('weekdays')} className={`p-2 border rounded-md ${availableDays === 'weekdays' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'} ${genActive ? 'opacity-60 cursor-not-allowed' : ''}`}>Kerja</button>
                              <button type="button" disabled={genActive} onClick={() => setAvailableDays('weekends')} className={`p-2 border rounded-md ${availableDays === 'weekends' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'} ${genActive ? 'opacity-60 cursor-not-allowed' : ''}`}>Akhir Pekan</button>
                            </div>
                          </div>
                          <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1.5">Durasi Belajar per Hari</label>
                            <div className="flex items-center gap-2">
                              <input id="duration" disabled={genActive} type="range" min="1" max="8" value={dailyDuration} onChange={(e) => setDailyDuration(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-60"/>
                              <span className="text-sm font-semibold text-slate-600 w-16 text-right">{dailyDuration} jam</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1.5">Tgl Mulai <span className="text-slate-400">(Opsional)</span></label>
                              <input id="startDate" disabled={genActive} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"/>
                            </div>
                            <div>
                              <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1.5">Tgl Selesai <span className="text-slate-400">(Opsional)</span></label>
                              <input id="endDate" disabled={genActive} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"/>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-black pt-6 pb-2">
                {/* Model drop-up */}
                <div className="mb-3 relative">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Model AI</div>
                  <button
                    type="button"
                    disabled={genActive}
                    aria-haspopup="listbox"
                    aria-expanded={modelMenuOpen}
                    onClick={() => setModelMenuOpen((v)=>!v)}
                    className={`w-full justify-between inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 ${genActive ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <span className="truncate">{useAltModel ? 'Gpt-5-mini' : 'Gemini 1.5 Flash'}</span>
                    <svg className={`h-4 w-4 transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                  </button>
                  {modelMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 z-20 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                      <ul role="listbox" className="py-1 text-sm">
                        <li>
                          <button
                            type="button"
                            role="option"
                            aria-selected={!useAltModel}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 ${!useAltModel ? 'text-blue-600 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}
                            onClick={() => { setUseAltModel(false); setModelMenuOpen(false); }}
                          >Gemini 1.5 Flash</button>
                        </li>
                        <li>
                          <button
                            type="button"
                            role="option"
                            aria-selected={useAltModel}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 ${useAltModel ? 'text-blue-600 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}
                            onClick={() => { setUseAltModel(true); setModelMenuOpen(false); }}
                          >Gpt-5-mini</button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={isLoading || genActive} className="w-full px-4 py-3 font-semibold text-white transition-all duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed">{(isLoading || genActive) ? 'Membuat Roadmap...' : 'Buat Roadmap'}</button>
              </div>
            </form>
            {error && (<div className="p-3 mt-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg"><strong>Oops!</strong> {error}</div>)}
          </>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Roadmap Dengan AI</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 truncate">Gunakan instruksi untuk memodifikasi roadmap Anda.</p>
              </div>
              <button
                type="button"
                onClick={() => setNewFormOpen((v)=>!v)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                title="Buat Roadmap Baru"
                aria-pressed={newFormOpen}
              >
                <FilePlus2 className="h-4 w-4" />
              </button>
            </header>
            <div className="mt-4">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input type="checkbox" className="rounded" checked={useAdvancedContext} onChange={(e)=>setUseAdvancedContext(e.target.checked)} />
                Advanced
              </label>
            </div>
            <div key={listKey} className="flex-1 overflow-y-auto px-1 py-3 space-y-2">
              {chatMessages.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">Ketik instruksi, misal: &quot;Tambahkan milestone untuk interview&quot; atau &quot;Selesaikan dalam 6 minggu&quot;.</div>
              ) : (
                chatMessages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} content={m.content} />
                ))
              )}
              {chatLoading && <TypingBubble />}
            </div>
            <form onSubmit={handleChatSubmit} className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e)=>setChatInput(e.target.value)}
                placeholder="Tulis instruksi edit…"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button disabled={chatLoading || !chatInput.trim()} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium disabled:bg-slate-400">
                Kirim
              </button>
            </form>
          </>
        )}
      </div>
  <div className="relative flex-grow min-h-[50vh] bg-slate-50 dark:bg-black flex flex-col">
        {/* Fixed title header after roadmap exists */}
        {roadmapData && (
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Judul Roadmap</div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">{roadmapTitle || activeTopic}</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1.5 sm:px-3 sm:py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  title="Batalkan"
                >
                  Batal
                </button>
                {/* View toggle (match old roadmap UI) */}
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTextView(false)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm ${!showTextView ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`}
                    title="Lihat Grafik"
                    aria-pressed={!showTextView}
                  >
                    <GitBranch className="h-4 w-4" />
                    <span className="hidden sm:inline">Graph</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTextView(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm ${showTextView ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`}
                    title="Lihat Teks"
                    aria-pressed={showTextView}
                  >
                    <LayoutList className="h-4 w-4" />
                    <span className="hidden sm:inline">Checklist</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveRoadmap}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                  title={saving ? 'Menyimpan…' : 'Simpan Roadmap'}
                >
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={cn(
          "relative flex-1 min-h-0 overflow-hidden"
        )}>
          {/* Konten utama: Graph atau Teks */}
          {roadmapData ? (
            showTextView ? (
              <RoadmapTextView data={roadmapData} onClick={handleNodeClick} />
            ) : (
              <RoadmapGraph data={roadmapData} onNodeClick={handleNodeClick} promptMode={activePromptMode} />
            )
          ) : (
            <RoadmapPlaceholder isLoading={isLoading} />
          )}
        </div>
  {/* Topic selection moved to publish flow */}
      </div>
      
  {selectedMilestone && (
    <Transition as={Fragment} show={true} appear>
      <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMilestone(null)} />
        </Transition.Child>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
          <div className="relative bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl w-[min(92vw,720px)] max-h-[80vh] flex flex-col overflow-hidden">
            <header className="flex items-center justify-between flex-shrink-0 p-4 border-b border-slate-200 dark:border-[#1f1f1f]">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-widest uppercase text-blue-600 truncate">{selectedMilestone.timeframe || 'Tahap'}</div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white" id="modal-title">{selectedMilestone.topic}</h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-neutral-400">
                  {selectedMilestone.estimated_dates ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#121212] px-2 py-1">{selectedMilestone.estimated_dates}</span>
                  ) : null}
                  {selectedMilestone.daily_duration ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#121212] px-2 py-1">{selectedMilestone.daily_duration}/hari</span>
                  ) : null}
                </div>
              </div>
              <button onClick={() => setSelectedMilestone(null)} className="p-1 transition-colors rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]" aria-label="Close modal">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">
              {/* AI concise summary */}
              <div className="mb-4">
                <div className="text-xs font-semibold tracking-wider text-slate-500 mb-1">Ringkasan Singkat</div>
                {nodeSummary ? (
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300 whitespace-pre-wrap">{nodeSummary}</p>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3.5 bg-slate-200/70 rounded w-5/6 animate-pulse"></div>
                    <div className="h-3.5 bg-slate-200/70 rounded w-full animate-pulse"></div>
                    <div className="h-3.5 bg-slate-200/70 rounded w-4/6 animate-pulse"></div>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-neutral-200 text-sm">Subbab</h3>
              {Array.isArray((selectedMilestone as any).subbab) && (selectedMilestone as any).subbab.length ? (
                <ol className="mt-2 space-y-2 text-sm list-decimal list-inside text-slate-700 dark:text-neutral-300">
                  {(selectedMilestone as any).subbab.map((title: string, ti: number) => (
                    <li key={ti} className="leading-relaxed">{title}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Belum ada rincian subbab untuk materi ini.</p>
              )}
            </div>
          </div>
        </Transition.Child>
      </div>
    </Transition>
  )}
    </div>
    )
  );
}
