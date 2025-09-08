'use client';

import { useEffect } from 'react';

export default function PrefetchImage({ src }: { src?: string }) {
  useEffect(() => {
    if (!src) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch {}
    };
  }, [src]);
  return null;
}
