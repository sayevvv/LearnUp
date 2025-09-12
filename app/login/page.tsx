"use client";
// app/login/page.tsx
import LoginCard from "@/components/LoginCard";
import LoginRightPanel from "@/components/LoginRightPanel";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Space_Mono } from 'next/font/google';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Accent monospace font to match landing page Swiss design
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If already authenticated, redirect on client to avoid SSR crashes when auth is misconfigured in prod.
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  return (
    <div className={`h-screen w-full overflow-hidden bg-white ${spaceMono.variable}`}>
      {/* Swiss Grid Layout */}
      <div className="h-screen lg:grid lg:grid-cols-12">
  {/* Navigation */}
  <div className="fixed top-0 left-0 right-0 z-20 h-16 flex items-center px-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-3 text-sm font-medium text-slate-800 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white transition-all duration-200 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="tracking-wide">Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Main Content Area - Left Side */}
        <div className="lg:col-span-5 flex flex-col justify-center p-6 pt-20 lg:p-10 xl:p-12 overflow-y-auto lg:overflow-hidden min-h-[calc(100vh-4rem)]">
          <div className="max-w-md mx-auto w-full">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]">
              {/* Simple header */}
              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400">Masuk</span>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100">Selamat datang kembali</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">Masuk untuk melanjutkan belajar.</p>
              </div>

              {/* Login Form */}
              <div>
                <LoginCard />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Mesh Gradient Background with rotating subjects/quotes */}
        <div className="hidden lg:block lg:col-span-7 relative overflow-hidden bg-[#061326]">
          {/* Mesh Gradient Layers */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 [background:linear-gradient(115deg,#051021,#071c34_40%,#082a52_78%),radial-gradient(circle_at_18%_28%,rgba(59,130,246,0.55),transparent_62%),radial-gradient(circle_at_82%_32%,rgba(14,165,233,0.55),transparent_60%),radial-gradient(circle_at_45%_78%,rgba(29,78,216,0.55),transparent_65%),radial-gradient(circle_at_68%_70%,rgba(56,189,248,0.35),transparent_60%)]" />
            {/* Subtle top + bottom vignette to keep text readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#021226]/60 via-transparent to-[#01070d]/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#061326] via-transparent to-[#061326]/40" />
          </div>
          {/* Content with transitions (kept above gradients) */}
          <LoginRightPanel />
          {/* Bottom Accent Line */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </div>
      </div>
    </div>
  );
}
