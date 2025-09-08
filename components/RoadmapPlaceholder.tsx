// components/RoadmapPlaceholder.tsx
"use client";

// Komponen ini menampilkan placeholder SVG untuk roadmap
// dan memiliki animasi "shining" saat isLoading bernilai true.
export default function RoadmapPlaceholder({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
      <div className="relative w-full max-w-lg overflow-hidden">
        {/* SVG Placeholder yang Diperbarui */}
        <svg
          className="w-full text-slate-200"
          viewBox="0 0 400 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Jalur utama roadmap */}
          <path d="M 20 100 C 80 20, 120 20, 180 100 S 280 180, 380 100" />
          
          {/* Node pada jalur (diubah menjadi kotak rounded yang lebih besar dan terisi warna) */}
          <rect x="4" y="84" width="32" height="32" rx="6" fill="currentColor" />
          <rect x="84" y="31" width="32" height="32" rx="6" fill="currentColor" />
          <rect x="164" y="84" width="32" height="32" rx="6" fill="currentColor" />
          <rect x="264" y="137" width="32" height="32" rx="6" fill="currentColor" />
          <rect x="364" y="84" width="32" height="32" rx="6" fill="currentColor" />
        </svg>

        {/* Efek Shining Animation */}
        {isLoading && (
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background:
                "linear-gradient(100deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 80%)",
              animation: "shimmer 2s infinite",
            }}
          />
        )}
      </div>

      {/* Teks di bawah placeholder */}
      <div className="mt-6">
        {isLoading ? (
          <>
            <h2 className="text-lg font-semibold text-slate-700">
              Menganalisis & Membangun Roadmap...
            </h2>
            <p className="mt-1 text-sm text-slate-500">Mohon tunggu sebentar, AI sedang bekerja.</p>
          </>
        ) : (
          <>
            <h2 className="font-medium text-slate-500">Roadmap Anda akan muncul di sini</h2>
            <p className="mt-1 text-sm">Isi formulir di samping untuk memulai perjalanan belajar Anda.</p>
          </>
        )}
      </div>
      
      {/* Keyframes untuk animasi shimmer */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
