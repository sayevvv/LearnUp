'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

type Props = {
  primarySrc: string;
  fallbackSrc: string; // external fallback
  localFallbackSrc?: string; // final local fallback in /public
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  alt?: string;
};

export default function ImageWithFallback({ primarySrc, fallbackSrc, localFallbackSrc = '/assets/fallback.jpg', width, height, sizes = '(max-width: 768px) 100vw, 768px', className = '', alt = '' }: Props) {
  const sources = useMemo(() => [primarySrc, fallbackSrc, localFallbackSrc], [primarySrc, fallbackSrc, localFallbackSrc]);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[Math.min(idx, sources.length - 1)] || primarySrc;
  return (
    <div className={`relative ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
      <Image
        key={src}
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={`w-full h-40 md:h-56 object-cover ${loaded ? '' : 'opacity-0'}`}
        unoptimized
        onLoad={() => setLoaded(true)}
        onError={() => setIdx((i) => Math.min(i + 1, sources.length - 1))}
      />
    </div>
  );
}
