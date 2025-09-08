'use client';

import { useEffect } from 'react';

type Props = {
  deps: any[];
  targetId?: string;
  behavior?: ScrollBehavior;
};

export default function ReaderScrollReset({ deps, targetId = 'reader-scroller', behavior = 'auto' }: Props) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el && 'scrollTo' in el) {
      try {
        (el as HTMLElement).scrollTo({ top: 0, behavior });
        return;
      } catch {
        // fallback to immediate
      }
    }
    if (el) (el as HTMLElement).scrollTop = 0;
    else window.scrollTo({ top: 0, behavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}
