'use client';

import { useEffect } from 'react';

export default function ThirdPartyNoiseGuard() {
  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      try {
        const msg = String((e as any)?.reason?.message || (e as any)?.reason || '');
        const stack = String((e as any)?.reason?.stack || '');
        if (msg.toLowerCase().includes('quillbot') || stack.includes('quillbot-content.js')) {
          e.preventDefault();
        }
      } catch {}
    };
    const onError = (e: ErrorEvent) => {
      try {
        const msg = String(e.message || '');
        const filename = String((e as any).filename || '');
        if (msg.toLowerCase().includes('quillbot') || filename.includes('quillbot-content.js')) {
          e.preventDefault();
        }
      } catch {}
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    window.addEventListener('error', onError, true);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandled);
      window.removeEventListener('error', onError, true);
    };
  }, []);
  return null;
}
