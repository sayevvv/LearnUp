"use client";
import { useEffect, useState } from 'react';
import DashboardTabs from './DashboardTabs';
import InProgressScroller from './InProgressScroller';

type Item = any;

export default function DashboardHydrator({ initialPopular = [], initialTopics = [] }: { initialPopular: Item[]; initialTopics: Item[] }) {
  const [loading, setLoading] = useState(true);
  const [popular, setPopular] = useState<Item[]>(initialPopular);
  const [forYou, setForYou] = useState<Item[]>([]);
  const [inProgress, setInProgress] = useState<Item[]>([]);
  const [topics, setTopics] = useState<Item[]>(initialTopics);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (abort) return;
        setPopular(json.popular || []);
        setTopics(json.topics || []);
        setInProgress(json.inProgress || []);
        setForYou(json.forYou || []);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  return (
    <div>
      {inProgress.length > 0 && (
        <div className="mt-4">
          <InProgressScroller items={inProgress} />
        </div>
      )}
      <div className="mt-6">
        <DashboardTabs popular={popular} forYou={forYou} />
      </div>
    </div>
  );
}
