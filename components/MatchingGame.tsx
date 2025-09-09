'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- Tipe Data untuk TypeScript ---
type Item = string;
// Menyimpan pasangan yang dibuat oleh pengguna
type Matches = Record<Item, Item | null>; 

// --- Pasangan Data untuk Game ---
const INITIAL_PAIRS: Record<Item, Item> = {
  'Jawa Barat': 'Bandung',
  'Jawa Timur': 'Surabaya',
  'Jawa Tengah': 'Semarang',
  'Sumatera Utara': 'Medan',
  'Sulawesi Selatan': 'Makassar',
  'Kalimantan Timur': 'Samarinda',
  'Papua': 'Jayapura',
  'Bali': 'Denpasar',
};

// --- Palet Warna untuk Menyorot Pasangan ---
const HIGHLIGHT_COLORS = [
  'bg-amber-100 border-amber-300',
  'bg-rose-100 border-rose-300',
  'bg-sky-100 border-sky-300',
  'bg-emerald-100 border-emerald-300',
  'bg-violet-100 border-violet-300',
  'bg-pink-100 border-pink-300',
  'bg-lime-100 border-lime-300',
  'bg-cyan-100 border-cyan-300',
];

// --- Fungsi Utilitas untuk Mengacak Array ---
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

// --- Komponen Utama Aplikasi ---
export default function MatchingGame({ pairs }: { pairs?: Record<Item, Item> }) {
  // --- State Management ---
  const [leftItems, setLeftItems] = useState<Item[]>([]);
  const [rightItems, setRightItems] = useState<Item[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Matches>({}); // Menyimpan pasangan tentatif
  const [gamePhase, setGamePhase] = useState<'pairing' | 'results'>('pairing'); // Fase permainan: memasangkan atau melihat hasil
  const [results, setResults] = useState<Record<Item, 'correct' | 'incorrect'>>({}); // Menyimpan hasil koreksi

  // --- Memoization untuk Efisiensi ---
  const solution = useMemo(() => pairs || INITIAL_PAIRS, [pairs]);
  const totalPairs = useMemo(() => Object.keys(solution).length, [solution]);
  const pairedCount = useMemo(() => Object.keys(matches).length, [matches]);
  const allItemsPaired = useMemo(() => pairedCount === totalPairs, [pairedCount, totalPairs]);
  const correctCount = useMemo(() => Object.values(results).filter(r => r === 'correct').length, [results]);

  // Membuat peta warna yang konsisten untuk setiap item di sisi kiri
  const itemColorMap = useMemo(() => {
    const map: Record<Item, string> = {};
    Object.keys(solution).forEach((item, index) => {
      map[item] = HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
    });
    return map;
  }, [solution]);

  // --- Inisialisasi & Reset Game ---
  const initializeGame = () => {
    const left = Object.keys(solution);
    const right = Object.values(solution);

    setLeftItems(left);
    setRightItems(shuffleArray(right));
    setSelectedLeft(null);
    setMatches({});
    setResults({});
    setGamePhase('pairing');
  };

  useEffect(() => {
    initializeGame();
  }, [solution]);

  // --- Logika untuk Menangani Pilihan ---
  const handleLeftSelect = (item: Item) => {
    // Aksi hanya bisa dilakukan pada fase 'pairing' dan jika item belum dipasangkan
    if (gamePhase !== 'pairing' || matches[item]) return;
    setSelectedLeft(item);
  };

  const handleRightSelect = (item: Item) => {
    // Memasangkan jika ada item kiri yang dipilih dan item kanan ini belum jadi pasangan
    if (gamePhase !== 'pairing' || !selectedLeft || Object.values(matches).includes(item)) return;
    
    setMatches(prev => ({ ...prev, [selectedLeft]: item }));
    setSelectedLeft(null); // Reset pilihan setelah membuat pasangan
  };
  
  // --- Logika untuk Memeriksa Jawaban ---
  const handleCheckAnswers = () => {
    if (!allItemsPaired) return;
    
    const newResults: Record<Item, 'correct' | 'incorrect'> = {};
    leftItems.forEach(leftItem => {
      if(solution[leftItem] === matches[leftItem]) {
        newResults[leftItem] = 'correct';
      } else {
        newResults[leftItem] = 'incorrect';
      }
    });
    
    setResults(newResults);
    setGamePhase('results');
  };

  // --- Fungsi untuk mendapatkan kelas styling ---
  const getItemClasses = (item: Item, side: 'left' | 'right') => {
    const base = "p-4 w-full text-left rounded-lg transition-all duration-200 cursor-pointer border-2 text-slate-700 font-medium";
    
    // --- Fase Hasil ---
    if (gamePhase === 'results') {
      const leftItemKey = side === 'left' ? item : Object.keys(matches).find(key => matches[key] === item);
      if (!leftItemKey) return `${base} bg-slate-100 border-slate-300`;

      const isCorrect = results[leftItemKey] === 'correct';
      return `${base} ${isCorrect ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'} cursor-default`;
    }

    // --- Fase Memasangkan ---
    const pairedLeftItem = side === 'right' ? Object.keys(matches).find(key => matches[key] === item) : null;
    const isPaired = !!matches[item] || !!pairedLeftItem;

    if (isPaired) {
      const colorKey = side === 'left' ? item : pairedLeftItem!;
      return `${base} ${itemColorMap[colorKey]} cursor-not-allowed opacity-90`;
    }

    if (side === 'left' && selectedLeft === item) {
       return `${base} bg-blue-100 border-blue-500 ring-2 ring-blue-300 scale-105`;
    }
    
    const hoverClass = side === 'left' ? 'hover:bg-blue-50 hover:border-blue-400' : 'hover:bg-green-50 hover:border-green-400';
    return `${base} bg-white border-slate-200 ${hoverClass}`;
  };

  // --- Render Komponen ---
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-4xl mx-auto">
        <header className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800">Game Mencocokkan</h1>
          <p className="text-slate-600 mt-2">Pasangkan Provinsi dengan Ibu Kotanya!</p>
        </header>

        {/* --- Area Status & Aksi --- */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 my-6 flex justify-between items-center min-h-[72px]">
            {gamePhase === 'results' ? (
                <div className="text-center w-full">
                    <h2 className="text-xl font-bold text-slate-800">Hasil Akhir</h2>
                    <p className="text-3xl font-bold my-1">
                        <span className={correctCount > totalPairs / 2 ? 'text-green-600' : 'text-red-600'}>{correctCount}</span>
                        <span className="text-slate-500"> / {totalPairs} Benar</span>
                    </p>
                </div>
            ) : (
                <>
                    <div className="text-left">
                        <span className="font-bold text-slate-700">Pasangan Dibuat:</span>
                        <span className="ml-2 text-blue-600 font-semibold">{pairedCount} / {totalPairs}</span>
                    </div>
                    {allItemsPaired && (
                        <button
                            onClick={handleCheckAnswers}
                            className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 border border-green-700"
                        >
                            Kunci Jawaban
                        </button>
                    )}
                </>
            )}
        </div>
        
        {/* --- Papan Permainan --- */}
        <main className="grid grid-cols-2 gap-4 md:gap-8">
          <div className="flex flex-col space-y-3">
            {leftItems.map(item => (
              <button key={item} onClick={() => handleLeftSelect(item)} disabled={gamePhase === 'results' || !!matches[item]} className={getItemClasses(item, 'left')}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-col space-y-3">
            {rightItems.map(item => (
              <button key={item} onClick={() => handleRightSelect(item)} disabled={gamePhase === 'results' || Object.values(matches).includes(item) || !selectedLeft} className={getItemClasses(item, 'right')}>
                {item}
              </button>
            ))}
          </div>
        </main>

        {/* --- Tombol Reset --- */}
        {gamePhase === 'results' && (
            <footer className="text-center mt-6">
                <button
                    onClick={initializeGame}
                    className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 border border-blue-700"
                    >
                    Main Lagi
                </button>
            </footer>
        )}
      </div>
    </div>
  );
}

