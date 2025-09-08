"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'updated_desc', label: 'Terbaru (diperbarui)' },
  { value: 'updated_asc', label: 'Terlama (diperbarui)' },
  { value: 'created_desc', label: 'Terbaru (dibuat)' },
  { value: 'created_asc', label: 'Terlama (dibuat)' },
  { value: 'title_asc', label: 'Judul A → Z' },
  { value: 'title_desc', label: 'Judul Z → A' },
  { value: 'access_desc', label: 'Terakhir diakses' },
  { value: 'access_asc', label: 'Paling lama tidak diakses' },
  // Progress-based sorting available if needed later:
  // { value: 'progress_desc', label: 'Progress tertinggi' },
  // { value: 'progress_asc', label: 'Progress terendah' },
];

export default function RoadmapSortSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value) params.set('sort', value);
    else params.delete('sort');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-slate-600 dark:text-slate-300">Urutkan</span>
      <select
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-black dark:border-slate-700"
        value={current}
        onChange={(e) => onChange(e.target.value)}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
