// app/page.tsx (Swiss Design Landing Page)
import Link from 'next/link';
import Image from 'next/image';
import { Grid3X3, BookOpen, BarChart3, Users, Target, Clock3, Share2, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { Space_Mono, Space_Grotesk } from 'next/font/google';
// import { prisma } from '@/lib/prisma';
import LandingHeader from '@/components/LandingHeader';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/auth.config';
import { StartLearningCTA } from '@/components/StartLearningCTA';

// Swiss design monospace font for accents
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

// Space Grotesk for mobile landing hero
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

// Metric display component following Swiss design principles
const MetricCard = ({ number, label, delay = 0 }: { number: string; label: string; delay?: number }) => (
  <div className={`${spaceMono.variable}`} style={{ animationDelay: `${delay}ms` }}>
    <div className="border-l-2 border-slate-300 dark:border-slate-500 pl-6">
      <div className="font-mono text-3xl font-bold text-slate-500 tracking-tight dark:text-slate-700">{number}</div>
      <div className="text-sm uppercase tracking-wide text-slate-500 mt-1 dark:text-slate-700">{label}</div>
    </div>
  </div>
);

// Swiss-style feature component with minimal design
const FeatureBlock = ({ icon: Icon, title, description, number }: { icon: React.ElementType; title: string; description: string; number: string; }) => (
  <div className="group">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0">
        {/* Brand accent: blue background for feature icons */}
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#4B85B8] text-white">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="flex-1">
        <div className={`text-xs uppercase tracking-wider text-slate-500 mb-2 ${spaceMono.variable} font-mono dark:text-slate-400`}>
          {number}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3 dark:text-slate-100">{title}</h3>
        <p className="text-slate-600 leading-relaxed dark:text-slate-300">{description}</p>
      </div>
    </div>
  </div>
);

// Small value-prop card used in About section
const AboutCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#4B85B8]/10 text-[#4B85B8] dark:bg-white/5 dark:text-[#FCA142]">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">{desc}</p>
      </div>
    </div>
  </div>
);

export default async function LandingPage() {
  // Redirect root to dashboard as the new home
  // Lightweight client-agnostic redirect to avoid serving landing at /
  // Note: Keep existing landing content accessible on a separate route if needed in the future.
  // Using Next.js recommended pattern: immediate redirect on server
  // eslint-disable-next-line @next/next/no-server-import-in-page
  const { redirect } = await import('next/navigation');
  redirect('/dashboard');
}

/*
  Archived landing content below for reference. If you want to keep a marketing page,
  move this component to app/landing/page.tsx or similar and link to it from the footer.
*/
export async function LegacyLandingPage() {
  // Fail-soft fetch to public API to avoid crashing landing
  async function getLatestPublishedSafely() {
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const res = await fetch(`${base}/api/public/roadmaps?limit=12`, { next: { revalidate: 60, tags: ['public-roadmaps'] } });
      if (!res.ok) throw new Error('non-200');
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  }
  const latest = await getLatestPublishedSafely();

  const hasLatest = Array.isArray(latest) && latest.length > 0;
  const placeholders = [
    { id: 'p1', slug: 'sample-web-dev', title: 'Roadmap Pengembangan Web Pemula', user: { name: 'Nadia Pratama' } },
    { id: 'p2', slug: 'sample-data-science', title: 'Dasar-dasar Data Science', user: { name: 'Rizky Saputra' } },
    { id: 'p3', slug: 'sample-mobile', title: 'Dasar Pengembangan Aplikasi Mobile', user: { name: 'Intan Maharani' } },
    { id: 'p4', slug: 'sample-ui-ux', title: 'Jalur Awal Desain UI/UX', user: { name: 'Bagas Wicaksono' } },
    { id: 'p5', slug: 'sample-devops', title: 'Esensial DevOps', user: { name: 'Ayu Lestari' } },
    { id: 'p6', slug: 'sample-ml', title: 'Pengantar Machine Learning', user: { name: 'Dimas Prakoso' } },
  ] as any[];
  const marqueeItems = hasLatest ? latest : placeholders;

  // Team members (use local placeholder image for now)
  const team = [
    {
      name: 'Abdullah Shamil Basayev',
      role: 'Developer',
      photo: '/assets/team/shamil.jpg',
      desc: 'Merancang arsitektur AI untuk personalisasi roadmap dan pembuatan materi otomatis yang relevan dengan kebutuhan pengguna.'
    },
    {
      name: 'Dwi Ahmad Khairy',
      role: 'Developer',
      photo: '/assets/team/dwik.jpg',
      desc: 'Membangun antarmuka NextStep yang cepat, responsif, dan nyaman digunakan di perangkat mobile maupun web.'
    },
    {
      name: 'Yefta Octavianus Santo',
      role: 'Designer',
      photo: '/assets/team/yefta.jpg',
      desc: 'Merancang pengalaman belajar yang jelas dan fokus melalui desain yang minimalis, informatif, dan mudah diikuti.'
    },
  ];

  return (
    <div className={`min-h-screen light:bg-white dark:bg-black ${spaceMono.variable}`}>
      <LandingHeader />

      <main className="pt-16">
        {/* Hero Section - Mobile: Full screen, Desktop: MacbookScroll */}
        
        {/* Mobile Hero: Full screen height with centered content */}
        <section className="block md:hidden relative overflow-hidden light:bg-white dark:bg-black min-h-screen">
          <div className={`h-screen flex flex-col justify-center items-start max-w-7xl mx-auto px-6 ${spaceGrotesk.className}`}>
            <div className="text-slate-900 dark:text-white">
              <span className="block text-5xl font-bold tracking-tight leading-tight">
                Belajar Lebih{' '}
                <span className="inline-block bg-gradient-to-r from-[#4B85B8] to-[#FCA142] bg-clip-text text-transparent">Lanjut</span>,
              </span>
              <span className="block text-5xl font-bold tracking-tight leading-tight mt-2">
                Lebih{' '}
                <span className="inline-block bg-gradient-to-r from-[#4B85B8] to-[#FCA142] bg-clip-text text-transparent">Jauh</span>
              </span>
              <span className="block mt-6 text-lg font-normal tracking-wide text-slate-600 dark:text-slate-300 max-w-md">
                Bentuk Rencana Belajarmu Sendiri.
              </span>
            </div>
            <div className="mt-8 flex flex-col items-stretch gap-4 w-full max-w-sm">
              <StartLearningCTA forceLogin className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#4B85B8] px-6 py-3 text-lg font-medium text-white hover:opacity-85 transition-colors" />
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-lg font-medium text-[#4B85B8] hover:bg-[#FCA142]/10 dark:text-[#FCA142] dark:hover:bg-white/5 transition-colors"
              >
                Pelajari Lebih Lanjut
              </a>
            </div>
          </div>
        </section>

        {/* Desktop Hero: MacbookScroll */}
        <section className="hidden md:block relative overflow-hidden light:bg-white dark:bg-black">
          <MacbookScroll
            title={
              <span className="text-slate-900 dark:text-white">
                <span className="block text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                  Belajar Lebih{' '}
                  <span className="inline-block bg-gradient-to-r from-[#4B85B8] to-[#FCA142] bg-clip-text text-transparent">Lanjut</span>,
                </span>
                <span className="block text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                  Lebih{' '}
                  <span className="inline-block bg-gradient-to-r from-[#4B85B8] to-[#FCA142] bg-clip-text text-transparent">Jauh</span>
                </span>
                <span className="block mt-3 text-sm sm:text-base font-normal tracking-wide text-slate-600 dark:text-slate-300">Bentuk Rencana Belajarmu Sendiri.</span>
              </span>
            }
            badge={<HeroBadge className="h-10 w-10 -rotate-12 transform" />}
            src="/assets/heroimg.jpg"
            showGradient={false}
            cta={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10">
                {/* Primary CTA with brand blue */}
                <StartLearningCTA forceLogin className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#4B85B8] px-5 py-2.5 text-white font-medium hover:opacity-85 transition-colors" />
                <a
                  href="#features"
                  className="rounded-xl border px-5 py-2.5 text-sm font-medium text-[#4B85B8] hover:bg-[#FCA142]/10 dark:text-[#FCA142] dark:hover:bg-white/5"
                >
                  Pelajari Lebih Lanjut
                </a>
              </div>
            }
          />
        </section>

        {/* Marquee */}
        <section aria-label="Roadmap Terbit" className="border-y border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-0 sm:px-6">
            <div className="group pause-on-hover relative overflow-hidden py-4">
              <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r light:from-white to-transparent dark:from-black" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l light:from-white to-transparent dark:from-black" />
              <div className="flex w-max animate-scroll-x will-change-transform">
                <ul className="shrink-0 flex items-center gap-3 pr-3">
                  {marqueeItems.map((r: any) => (
                    <li key={`a-${r.id}`} className="shrink-0">
                      <Link
                        href={`/login`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0f0f0f] px-3 py-1.5 text-sm text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] hover:border-slate-300 dark:hover:border-[#3a3a3a] transition-colors"
                      >
                        <span className="font-semibold truncate max-w-[16rem]">{r.title}</span>
                        <span className="text-xs text-slate-500 dark:text-neutral-400">• oleh {r.user?.name ?? 'Komunitas'}</span>
                        {/* Placeholder badge removed intentionally to mimic real items */}
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="shrink-0 flex items-center gap-3 pr-3" aria-hidden="true">
                  {marqueeItems.map((r: any) => (
                    <li key={`b-${r.id}`} className="shrink-0">
                      <Link
                        href={`/login`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0f0f0f] px-3 py-1.5 text-sm text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] hover:border-slate-300 dark:hover:border-[#3a3a3a] transition-colors"
                      >
                        <span className="font-semibold truncate max-w-[16rem]">{r.title}</span>
                        <span className="text-xs text-slate-500 dark:text-neutral-400">• oleh {r.user?.name ?? 'Komunitas'}</span>
                        {/* Placeholder badge removed intentionally to mimic real items */}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

  {/* Metrics removed as requested */}

        {/* Features */}
        <section id="features" className="py-24 sm:py-32 scroll-mt-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <p className={`text-xs uppercase tracking-wider text-slate-500 mb-3 font-mono dark:text-neutral-400`}>Fitur Unggulan</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight max-w-4xl dark:text-neutral-100">
                Pembelajaran personal, adaptif, dan relevan dengan dunia kerja
              </h2>
              <p className="mt-4 text-slate-600 dark:text-neutral-300 max-w-2xl">
                NextStep memungkinkan pengguna belajar efisien dan fokus lewat roadmap AI, penjadwalan fleksibel, dan tujuan belajar terintegrasi.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
              <FeatureBlock
                icon={Grid3X3}
                number="01"
                title="Metode Personalisasi"
                description="Roadmap belajar dinamis dan adaptif yang disusun otomatis oleh AI berdasarkan tujuan, waktu, dan tingkat pengetahuan pengguna."
              />
              <FeatureBlock
                icon={BookOpen}
                number="02"
                title="Pembuatan Konten"
                description="Materi dari berbagai sumber (konten terbuka, materi mitra) yang dirangkai secara terstruktur oleh AI."
              />
              <FeatureBlock
                icon={BarChart3}
                number="03"
                title="Dukungan Belajar"
                description="Chatbot kontekstual (berbasis RAG) yang memahami materi yang dipelajari serta pembuatan kuis dan flashcard otomatis."
              />
              <FeatureBlock
                icon={Users}
                number="04"
                title="Fleksibilitas Kurikulum"
                description="Sangat fleksibel—roadmap dapat dimodifikasi, diperbarui dinamis, dan di-fork/dibagikan ke pengguna lain."
              />
            </div>

            {/* Best practice callouts */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Kejelasan</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">Targetnya jelas, penjelasannya mudah dimengerti, dan tugasnya spesifik agar Anda betah belajar.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Berbasis bukti</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">Latihan soal dan evaluasi diri membantu kemampuan benar-benar melekat, bukan hanya menyelesaikan daftar.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Publikasi dan Riwayat</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">Anda bisa mengekspor roadmap dan riwayat kapan pun. Data belajar sepenuhnya milik Anda.</p>
              </div>
            </div>
          </div>
        </section>

        {/* About (redesigned) */}
        <section id="about" className="py-24 sm:py-32 border-t border-slate-200 dark:border-[#1f1f1f] scroll-mt-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-12 sm:mb-16">
              <p className={`text-xs uppercase tracking-wider text-slate-500 mb-3 font-mono dark:text-slate-400`}>Tentang NextStep</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight max-w-4xl dark:text-neutral-100">
                Belajar yang terarah, adaptif, dan berfokus hasil
              </h2>
              <p className="mt-4 text-slate-600 dark:text-neutral-300 max-w-2xl">
                Kami merancang NextStep agar Anda bisa membuat rencana belajar yang jelas, fleksibel, dan konsisten—tanpa kehilangan fokus pada hasil yang ingin dicapai.
              </p>
            </div>

            {/* Value props */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              <AboutCard icon={<Sparkles className="h-5 w-5" />} title="Personalisasi AI" desc="Roadmap dibuat otomatis sesuai tujuan, waktu tersedia, dan tingkat kemampuan Anda." />
              <AboutCard icon={<Clock3 className="h-5 w-5" />} title="Jadwal Adaptif" desc="Sinkron dengan ritme harian Anda—sesi singkat namun konsisten untuk kemajuan nyata." />
              <AboutCard icon={<Target className="h-5 w-5" />} title="Fokus Hasil" desc="Setiap bagian punya output dan kriteria selesai sehingga progres terasa konkret." />
              <AboutCard icon={<Share2 className="h-5 w-5" />} title="Kolaboratif" desc="Publikasikan, fork, dan sesuaikan roadmap bersama komunitas." />
            </div>

            {/* Principles + Privacy */}
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Prinsip NextStep</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-neutral-300">
                  <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-4 w-4 text-[#4B85B8]" /><span>Jelas dan terukur — tujuan, output, dan alur belajar tidak ambigu.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-4 w-4 text-[#4B85B8]" /><span>Ringkas namun padat — materi inti didahulukan, praktik memandu penguasaan.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-4 w-4 text-[#4B85B8]" /><span>Fleksibel — mudah menyesuaikan waktu, prioritas, dan tingkat kedalaman.</span></li>
                </ul>
                <div className="mt-6 rounded-lg bg-slate-50 p-4 text-slate-700 dark:bg-[#111] dark:text-neutral-200">
                  Rekomendasi: alokasikan 25–50 menit per sesi, tandai bagian sulit, dan evaluasi fokus setiap akhir pekan.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#4B85B8] text-white"><Shield className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Keamanan & Privasi</h3>
                    <p className="mt-2 text-sm text-slate-700 dark:text-neutral-300">Data belajar Anda tetap milik Anda. Kami menerapkan praktik terbaik untuk perlindungan data dan kontrol publikasi.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-white/10 dark:bg-[#111] dark:text-neutral-300">
                  Tip: Anda bisa menyimpan roadmap sebagai privat, mengontrol topik publikasi, dan menghapus data kapan saja.
                </div>
              </div>
            </div>
          </div>
        </section>

  {/* Process */}
  <section id='process' className="py-24 bg-[#FCA142] dark:bg-[#FCA142] transition-colors text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className={`text-xs uppercase tracking-wider text-slate-400 mb-6 font-mono`}>
                  Cara Kerja
                </div>
                <h2 className="text-4xl font-bold mb-8 leading-tight">
                  Tiga langkah untuk belajar lebih cerdas
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-white text-slate-900 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Tentukan Tujuan Anda</h3>
                      <p className="text-slate-100 leading-relaxed">
                        Beritahu AI kami apa yang ingin Anda pelajari dan tingkat kemampuan Anda saat ini.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-white text-slate-900 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Dapatkan Roadmap Anda</h3>
                      <p className="text-slate-100 leading-relaxed">
                        Dapatkan jalur belajar personal dengan tonggak yang terstruktur.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-white text-slate-900 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Belajar & Pantau</h3>
                      <p className="text-slate-100 leading-relaxed">
                        Ikuti roadmap Anda dan pantau progres dengan alat interaktif.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500"></div>
                <div className="relative p-8 bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-neutral-100">
                  <div className={`text-xs uppercase tracking-wider text-slate-500 mb-4 font-mono dark:text-slate-400`}>
                    Contoh Output yang Dihasilkan
                  </div>
                  <div className="space-y-4">
                    <div className="border-l-2 border-slate-900 pl-4">
                      <div className="font-bold">Minggu 1-2: Dasar-dasar</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Konsep dan prinsip dasar</div>
                    </div>
                    <div className="border-l-2 border-slate-300 pl-4">
                      <div className="font-bold">Minggu 3-4: Penerapan Praktis</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Proyek dan latihan langsung</div>
                    </div>
                    <div className="border-l-2 border-slate-300 pl-4">
                      <div className="font-bold">Minggu 5-6: Topik Lanjutan</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Pendalaman materi yang kompleks</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section id="team" className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className={`text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 font-mono`}>Tim Pengembang</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Berkenalan dengan tim di balik NextStep
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                Kami membangun pengalaman belajar yang personal, adaptif, dan relevan—dengan perhatian pada detail dan kegunaan.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((m) => (
                <div key={m.name} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
                  <div className="flex items-center gap-4">
                    <Image
                      src={m.photo}
                      alt={m.name}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-[#4B85B8]/10"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{m.name}</h3>
                      <p className="text-sm font-medium text-[#4B85B8] dark:text-[#FCA142]">{m.role}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-slate-600 dark:text-neutral-300">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <div className={`text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 font-mono`}>
                Siap Memulai?
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-8">
                Melangkah Bersama Kami!
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-12">
                Mulai langkah baru dengan NextStep—rancang roadmap personal dan capai tujuan belajar Anda.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <StartLearningCTA forceLogin className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#4B85B8] px-12 py-4 text-white font-medium hover:opacity-85 transition-colors" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-6">
              <Link href="/" className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                NextStep
              </Link>
              <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
                Platform pembelajaran mandiri berbasis AI untuk menyusun roadmap personal, penjadwalan belajar, dan tujuan terintegrasi.
              </p>
              <div className={`mt-6 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono`}>
                MADE WITH PRECISION
              </div>
            </div>
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {/* <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide text-sm">Produk</h4>
                  <ul className="space-y-3 text-sm">
                    <li><Link href="#features" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Fitur</Link></li>
                    <li><Link href="#metrics" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Metrik</Link></li>
                    <li><Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Dasbor</Link></li>
                  </ul>
                </div> */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide text-sm">Tim Pengembang</h4>
                  <ul className="space-y-3 text-sm">
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Tentang</Link></li>
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Blog</Link></li>
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Karier</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide text-sm">Dukungan</h4>
                  <ul className="space-y-3 text-sm">
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Pusat Bantuan</Link></li>
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Kontak</Link></li>
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Komunitas</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide text-sm">Legal</h4>
                  <ul className="space-y-3 text-sm">
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Privasi</Link></li>
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Ketentuan</Link></li>
                    <li><Link href="#" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Keamanan</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className={`text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider`}>
                © {new Date().getFullYear()} NextStep
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Local badge icon used in hero (renamed to avoid name collisions)
const HeroBadge = ({ className }: { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M56 28C56 43.464 43.464 56 28 56C12.536 56 0 43.464 0 28C0 12.536 12.536 0 28 0C43.464 0 56 12.536 56 28Z" fill="#00AA45"></path>
      <path fillRule="evenodd" clipRule="evenodd" d="M28 54C42.3594 54 54 42.3594 54 28C54 13.6406 42.3594 2 28 2C13.6406 2 2 13.6406 2 28C2 42.3594 13.6406 54 28 54ZM28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#219653"></path>
      <path fillRule="evenodd" clipRule="evenodd" d="M27.0769 12H15V46H24.3846V38.8889H27.0769C34.7305 38.8889 41 32.9048 41 25.4444C41 17.984 34.7305 12 27.0769 12ZM24.3846 29.7778V21.1111H27.0769C29.6194 21.1111 31.6154 23.0864 31.6154 25.4444C31.6154 27.8024 29.6194 29.7778 27.0769 29.7778H24.3846Z" fill="#24292E"></path>
      <path fillRule="evenodd" clipRule="evenodd" d="M18 11H29.0769C36.2141 11 42 16.5716 42 23.4444C42 30.3173 36.2141 35.8889 29.0769 35.8889H25.3846V43H18V11ZM25.3846 28.7778H29.0769C32.1357 28.7778 34.6154 26.39 34.6154 23.4444C34.6154 20.4989 32.1357 18.1111 29.0769 18.1111H25.3846V28.7778Z" fill="white"></path>
      <path fillRule="evenodd" clipRule="evenodd" d="M17 10H29.0769C36.7305 10 43 15.984 43 23.4444C43 30.9048 36.7305 36.8889 29.0769 36.8889H26.3846V44H17V10ZM19 12V42H24.3846V34.8889H29.0769C35.6978 34.8889 41 29.7298 41 23.4444C41 17.1591 35.6978 12 29.0769 12H19ZM24.3846 17.1111H29.0769C32.6521 17.1111 35.6154 19.9114 35.6154 23.4444C35.6154 26.9775 32.6521 29.7778 29.0769 29.7778H24.3846V17.1111ZM26.3846 19.1111V27.7778H29.0769C31.6194 27.7778 33.6154 25.8024 33.6154 23.4444C33.6154 21.0864 31.6194 19.1111 29.0769 19.1111H26.3846Z" fill="#24292E"></path>
    </svg>
  );
};
