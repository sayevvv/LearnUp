// components/DeveloperChoiceSidebar.tsx
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function DeveloperChoiceSidebar() {
  try {
    const items = await (prisma as any).roadmap.findMany({
      where: { published: true, verified: true },
      select: { id: true, title: true, slug: true, user: { select: { name: true } } },
      take: 24,
      orderBy: { createdAt: 'desc' },
    });

    if (!items?.length) return null;

    // Optional: could fetch aggregates to sort by bayesianScore if desired
    // Keeping it simple and fast here; adjust later if needed

    const top = items.slice(0, 6);

    return (
      <div className="mt-6 rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Developer’s Choice</h3>
          <span className="text-slate-400" title="Dipilih oleh admin">i</span>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {top.map((it: any) => (
            <li key={it.id} className="text-slate-700">
              <Link href={`/r/${it.slug}`} className="hover:underline">
                {it.title}
              </Link>
              <div className="text-xs text-slate-400">oleh {it.user?.name || 'Pengguna'}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  } catch {
    return null;
  }
}
