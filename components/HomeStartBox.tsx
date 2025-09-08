"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';

export default function HomeStartBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'expert'>('beginner');
  const [goal, setGoal] = useState('');
  const [enableTimeOptions, setEnableTimeOptions] = useState(false);
  const [availableDays, setAvailableDays] = useState<'all' | 'weekdays' | 'weekends'>('all');
  const [dailyDuration, setDailyDuration] = useState(2);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const goSimple = () => {
    const query = new URLSearchParams({ mode: 'simple', q: q.trim() }).toString();
    router.push(`/dashboard/new?${query}`);
  };

  const goAdvanced = () => {
    const sp = new URLSearchParams({ mode: 'advanced', topic: topic.trim(), level, goal: goal.trim() });
    if (enableTimeOptions) {
      sp.set('enableTime', '1');
      sp.set('availableDays', availableDays);
      sp.set('dailyDuration', String(dailyDuration));
      if (startDate) sp.set('startDate', startDate);
      if (endDate) sp.set('endDate', endDate);
    }
    router.push(`/dashboard/new?${sp.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <h2 className="text-base font-semibold text-slate-900">Mau Mulai Belajar Apa Hari ini?</h2>
      {/* Toggle row under input area */}
      {!advanced ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') goSimple(); }}
              className="flex-1 h-11 rounded-xl bg-slate-100 border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Tulis topik atau tujuan belajarmu..."
            />
            <button
              onClick={goSimple}
              aria-label="Mulai"
              className="h-11 aspect-square grid place-items-center rounded-lg bg-blue-600 text-white"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-[13px] text-slate-600 flex items-center">
            <button
              type="button"
              onClick={() => setAdvanced(true)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300"
              aria-pressed={advanced}
              aria-label="Aktifkan Advanced"
            >
              <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-1" />
            </button>
            <span className="ml-2 cursor-pointer select-none" onClick={() => setAdvanced(true)}>Advanced</span>
          </div>
        </>
      ) : (
  <>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Topik Utama</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="cth: React untuk Pemula"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Level Pengguna</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tujuan Akhir</label>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="cth: Siap interview Frontend"
              />
            </div>
            {/* Pengaturan Waktu - gunakan checkbox untuk on/off */}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700" htmlFor="timeSettingToggle">Pengaturan Waktu</label>
                <label className="inline-flex items-center gap-2">
                  <input
                    id="timeSettingToggle"
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
                      <button type="button" onClick={() => setAvailableDays('all')} className={`p-2 border rounded-md ${availableDays === 'all' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'}`}>Semua</button>
                      <button type="button" onClick={() => setAvailableDays('weekdays')} className={`p-2 border rounded-md ${availableDays === 'weekdays' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'}`}>Kerja</button>
                      <button type="button" onClick={() => setAvailableDays('weekends')} className={`p-2 border rounded-md ${availableDays === 'weekends' ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold' : 'border-slate-300'}`}>Akhir Pekan</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Durasi Belajar per Hari</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="1" max="8" value={dailyDuration} onChange={(e) => setDailyDuration(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                      <span className="text-sm font-semibold text-slate-600 w-16 text-right">{dailyDuration} jam</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Tgl Mulai <span className="text-slate-400">(Opsional)</span></label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Tgl Selesai <span className="text-slate-400">(Opsional)</span></label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[13px] text-slate-600 flex items-center">
                <button
                  type="button"
                  onClick={() => setAdvanced(false)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600"
                  aria-pressed={advanced}
                  aria-label="Matikan Advanced"
                >
                  <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-5" />
                </button>
                <span className="ml-2 cursor-pointer select-none" onClick={() => setAdvanced(false)}>Advanced</span>
              </div>
              <button
                onClick={goAdvanced}
                aria-label="Lanjutkan"
    className="h-11 aspect-square grid place-items-center rounded-lg bg-blue-600 text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
