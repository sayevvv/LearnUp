"use client";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';

export default function VerifyRoadmapButton({ roadmapId, verified: initial }: { roadmapId: string; verified: boolean }) {
  const [verified, setVerified] = useState<boolean>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch(`/api/roadmaps/${roadmapId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verified: !verified }),
          });
          if (res.ok) {
            setVerified(v => !v);
            router.refresh();
          }
        });
      }}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${ verified ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100' : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'} disabled:opacity-60`}
      title={verified ? 'Batalkan verifikasi' : 'Verifikasi sebagai Developer’s Choice'}
    >
      <BadgeCheck className="h-4 w-4" />
      {verified ? 'Terverifikasi' : 'Verifikasi'}
    </button>
  );
}
