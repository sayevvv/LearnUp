// components/LoginRightPanel.tsx
"use client";

import { useEffect, useState } from "react";

type Slide = {
  id: string;
  subject: string;
  quote: string;
  author: string;
};

const SLIDES: Slide[] = [
  {
    id: "01",
    subject: "Belajar Tanpa Batas",
    quote:
      "Pendidikan adalah senjata paling ampuh yang dapat Anda gunakan untuk mengubah dunia.",
    author: "Nelson Mandela",
  },
  {
    id: "02",
    subject: "Desain Dengan Presisi",
    quote: "Desain adalah hubungan yang tepat antara elemen-elemen.",
    author: "Josef Müller-Brockmann",
  },
  {
    id: "03",
    subject: "Belajar Lebih Cerdas",
    quote: "Sederhanakan, lalu tambahkan ringan.",
    author: "Colin Chapman",
  },
];

const INTERVAL_MS = 6500;

export default function LoginRightPanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-10 h-full flex flex-col justify-center p-16 xl:p-24">
      {/* Slide container */}
      <div className="relative h-[360px] sm:h-[400px]">
        {SLIDES.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              className={
                "absolute inset-0 transition-all duration-700 ease-out " +
                (active
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none")
              }
              aria-hidden={!active}
            >
              <div className="text-9xl font-black text-white/30 leading-none tracking-tighter select-none">
                {s.id}
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight mt-4 text-balance">
                {s.subject}
              </h2>
              <div className="space-y-6 mt-6">
                <p className="text-xl text-white/90 leading-relaxed font-light max-w-xl text-balance">
                  “{s.quote}”
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-0.5 bg-white/50"></div>
                  <span className="text-sm font-medium text-white/70 tracking-widest uppercase font-mono">
                    {s.author}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress dots */}
      <div className="mt-10 flex gap-2">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={
              "h-1.5 rounded-full transition-all duration-500 " +
              (i === index ? "w-8 bg-white" : "w-3 bg-white/40")
            }
          />
        ))}
      </div>

      {/* Swiss Design Elements */}
      <div className="grid grid-cols-3 gap-8 mt-16 text-white">
        <div className="space-y-2">
          <div className="text-3xl font-black">AI</div>
          <div className="text-sm text-white/80 leading-relaxed">
            Personalisasi pembelajaran dengan AI
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-3xl font-black">∞</div>
          <div className="text-sm text-white/80 leading-relaxed">
            Akses ke materi berkualitas
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-3xl font-black">⚡</div>
          <div className="text-sm text-white/80 leading-relaxed">
            Metodologi efektif dan cepat
          </div>
        </div>
      </div>
    </div>
  );
}
