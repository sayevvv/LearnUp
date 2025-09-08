"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RoadmapCard from "./RoadmapCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type InProgressItem = {
  id: string;
  title: string;
  slug?: string | null;
  published?: boolean;
  user?: { name?: string | null; image?: string | null } | null;
  progress?: { percent?: number | null } | null;
  avgStars?: number | null;
  ratingsCount?: number | null;
  verified?: boolean;
  topics?: Array<{ slug: string; name: string; isPrimary?: boolean }>;
};

export default function InProgressScroller({ items }: { items: InProgressItem[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="mt-2">
      <h3 className="text-sm font-semibold text-slate-900">Sedang Dipelajari</h3>
      {/* Mobile: keep horizontal scroller with all items */}
      <div className="md:hidden overflow-x-auto overscroll-x-contain no-scrollbar">
        <div className="mt-3 flex gap-3 snap-x snap-mandatory pb-2">
          {items.map((i) => (
            <CardWithProgress key={i.id} item={i} className="w-[300px] shrink-0 snap-start" />
          ))}
        </div>
      </div>

      {/* Desktop: limited width with working arrows */}
      <DesktopScroller items={items} />
    </div>
  );
}

function DesktopScroller({ items }: { items: InProgressItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const recalc = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setCanLeft(left);
    setCanRight(right);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    recalc();
    const onScroll = () => recalc();
    el.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll as any);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const step = 312; // 300 card + 12 gap
  const scrollBy = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative hidden md:block">
      {/* Left Arrow */}
      <button
        type="button"
        aria-label="Scroll ke kiri"
        onClick={() => scrollBy(-step)}
        disabled={!canLeft}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden xl:flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-opacity ${
          canLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Right Arrow */}
      <button
        type="button"
        aria-label="Scroll ke kanan"
        onClick={() => scrollBy(step)}
        disabled={!canRight}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden xl:flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-opacity ${
          canRight ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="mt-3 max-w-[924px] overflow-x-auto overscroll-x-contain pr-2 no-scrollbar" ref={scrollerRef}>
        <div className="flex gap-3 snap-x snap-mandatory pb-2">
          {items.slice(0, 5).map((i) => (
            <CardWithProgress key={i.id} item={i} className="w-[300px] shrink-0 snap-start" />
          ))}
          {items.length >= 5 ? (
            <div className="shrink-0 snap-end flex items-center">
              <Link
                href="/dashboard/browse"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                aria-label="Jelajahi roadmap"
              >
                Jelajahi
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CardWithProgress({ item, className = "" }: { item: InProgressItem; className?: string }) {
  const pct = Math.max(0, Math.min(100, item?.progress?.percent ?? 0));
  return (
    <div className={className}>
      <div>
        <RoadmapCard item={item as any} hideInlineTopics own compact forcePrivateLink bottomMetaAlign hideRatings={!item.published} />
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-500">{pct}% selesai</div>
      </div>
    </div>
  );
}
