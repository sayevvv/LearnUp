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

        {/* Right Side - Background image with rotating subjects/quotes */}
        <div className="hidden lg:block lg:col-span-7 relative overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: "url('/assets/login.jpg')" }}
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-slate-900/60" />
          {/* Content with transitions */}
          <LoginRightPanel />
          {/* Bottom Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-white/0 via-white/20 to-white/0"></div>
        </div>
      </div>
    </div>
  );
}
