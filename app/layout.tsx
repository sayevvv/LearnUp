// app/layout.tsx
import type { Metadata } from "next";
// Impor font baru dari Google Fonts
import { Space_Grotesk, Crimson_Pro } from "next/font/google";
import "./globals.css";
import React from 'react';
import { Providers } from "./providers";

// Konfigurasi font Space Grotesk untuk teks utama (sans-serif)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

// Konfigurasi font Crimson Pro untuk judul (serif)
const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ['400', '700'], // Impor ketebalan yang dibutuhkan
  variable: "--font-crimson-pro",
});

export const metadata: Metadata = {
  title: "NextStep - AI Self-Paced Learning Roadmap",
  description: "Buat jalur belajar terstruktur dengan AI",
  icons: {
  // Add version query to bust caches across deploys
  icon: { url: "/assets/mascot.png?v=2", type: "image/png" },
  shortcut: { url: "/assets/mascot.png?v=2", type: "image/png" },
  apple: { url: "/assets/mascot.png?v=2", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
  <link rel="preload" as="image" href="/assets/login.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const saved = localStorage.getItem('theme'); const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const enableDark = saved ? saved === 'dark' : prefersDark; const el = document.documentElement; if (enableDark) el.classList.add('dark'); else el.classList.remove('dark'); } catch {} })();`,
          }}
        />
  {/* Cache-bust the favicon links as well */}
  <link rel="icon" href="/assets/mascot.png?v=2" type="image/png" />
  <link rel="apple-touch-icon" href="/assets/mascot.png?v=2" />
  <link rel="preconnect" href="https://picsum.photos" crossOrigin="" />
  <link rel="dns-prefetch" href="https://picsum.photos" />
  <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
  <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      {/* Terapkan variabel font ke tag body */}
  <body className={`${spaceGrotesk.variable} ${crimsonPro.variable} font-sans antialiased bg-white text-slate-900 dark:bg-black dark:text-neutral-200`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
