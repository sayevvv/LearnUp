'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

type Props = {
  seed: string;
  width?: number;
  height?: number;
  className?: string;
};

export default function ReaderHeroImage({ seed, width = 1200, height = 480, className }: Props) {
  // Start deterministic on SSR to avoid hydration mismatch; switch to random after mount
  const [nonce, setNonce] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
    // Generate a per-mount random nonce only on client after hydration
    setNonce(String(Math.floor(Math.random() * 1e9)));
  }, [seed]);

  const src = useMemo(() => {
    // When nonce is null (SSR/initial hydration), keep deterministic URL
    const key = nonce ? `${seed}-${nonce}-${attempt}` : `${seed}-0-0`;
    const s = encodeURIComponent(key);
    return `https://picsum.photos/seed/${s}/${width}/${height}`;
  }, [seed, nonce, attempt, width, height]);

  return (
    <div className={`rounded-xl overflow-hidden bg-slate-100 ${className || ''}`}>
      {!loaded && <div className="h-40 md:h-56 w-full animate-pulse bg-slate-200" />}
      <Image
        key={src}
        src={src}
        alt="Gambar materi"
        width={width}
        height={height}
        sizes="(max-width: 768px) 100vw, 768px"
        className={`w-full h-40 md:h-56 object-cover ${loaded ? '' : 'hidden'}`}
        priority={false}
        onLoad={() => setLoaded(true)}
        // If loading fails or is too slow, try a couple of times
        onError={() => setAttempt((a) => (a < 3 ? a + 1 : a))}
        unoptimized={false}
      />
    </div>
  );
}
