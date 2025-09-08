"use client";
import { useState } from 'react';
import RoadmapGraph from '@/components/RoadmapGraph';

export default function PublicRoadmapClient({ content }: { content: any }) {
  const [startDate, setStartDate] = useState<string>('');
  return (
    <div className="p-8">
      <div className="text-slate-700 dark:text-slate-300">
        <div className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">Durasi</div>
        <div className="font-semibold dark:text-slate-100">{content?.duration || '-'}</div>
      </div>
      <div className="mt-4 flex items-end gap-3">
        <div>
          <label htmlFor="startDatePublic" className="block text-xs font-medium text-slate-600 dark:text-slate-300">Mulai dari Tanggal</label>
          <input id="startDatePublic" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="mt-1 w-52 px-3 py-1.5 text-sm border rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Tanggal di setiap milestone akan menyesuaikan.</div>
      </div>
      <div className="mt-6 h-[70vh] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <RoadmapGraph data={{ milestones: content?.milestones || [] }} onNodeClick={()=>{}} promptMode={'advanced'} startDate={startDate || undefined} />
      </div>
    </div>
  );
}
