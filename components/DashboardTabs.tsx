"use client";
import { useState } from 'react';
import RoadmapCard from './RoadmapCard';
import { Flame } from 'lucide-react';

type Item = { id: string; title: string; slug: string; avgStars?: number; ratingsCount?: number; verified?: boolean };

export default function DashboardTabs({ forYou, popular }: { forYou: Item[]; popular: Item[] }) {
  const [activeTab, setActiveTab] = useState<'popular' | 'forYou'>('popular');

  return (
    <div className="mt-6">
      {/* Tabs header - underline style */}
      <div role="tablist" aria-label="Dashboard sections" className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-700">
        <button
          role="tab"
          aria-selected={activeTab === 'popular'}
          aria-controls="popular-panel"
          id="popular-tab"
          onClick={() => setActiveTab('popular')}
          className={`-mb-px inline-flex items-center gap-2 border-b-2 px-1.5 pb-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'popular'
              ? 'border-slate-900 font-semibold text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <Flame className="h-4 w-4" />
          Popular
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'forYou'}
          aria-controls="forYou-panel"
          id="forYou-tab"
          onClick={() => setActiveTab('forYou')}
          className={`-mb-px inline-flex items-center border-b-2 px-1.5 pb-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'forYou'
              ? 'border-slate-900 font-semibold text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          For You
        </button>
      </div>

      {/* Tab panels */}
      {activeTab === 'popular' ? (
        <div
          role="tabpanel"
          id="popular-panel"
          aria-labelledby="popular-tab"
          className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr"
          key="popular-panel"
        >
          {popular.length === 0 ? (
            <div className="text-sm text-slate-500">Belum ada konten populer.</div>
          ) : (
            popular.map((i: any) => (
              <div key={`popular-${i.id}`} className="h-full">
                <RoadmapCard item={i} bottomMetaAlign />
              </div>
            ))
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          id="forYou-panel"
          aria-labelledby="forYou-tab"
          className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr"
          key="forYou-panel"
        >
          {forYou.length === 0 ? (
            <div className="text-sm text-slate-500">Belum ada rekomendasi personal. Mulai buat atau pelajari roadmap untuk melihat rekomendasi.</div>
          ) : (
            forYou.map((i: any) => (
              <div key={`foryou-${i.id}`} className="h-full">
                <RoadmapCard item={i} bottomMetaAlign />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
