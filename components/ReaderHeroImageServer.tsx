import ImageWithFallback from '@/components/ImageWithFallback';

export default function ReaderHeroImageServer({ seed, width = 1200, height = 480, className = '' }: { seed: string; width?: number; height?: number; className?: string }) {
  const s = encodeURIComponent(seed);
  const src = `https://picsum.photos/seed/${s}/${width}/${height}`;
  // Fallback to a hardcoded Unsplash image that reliably serves
  // Example image: "code on laptop" theme (public Unsplash asset)
  const fallback = `https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
  return (
    <div className={`rounded-xl overflow-hidden bg-slate-100 ${className}`}>
      <ImageWithFallback
        primarySrc={src}
        fallbackSrc={fallback}
        width={width}
        height={height}
        alt="Gambar materi"
        className="w-full h-40 md:h-56"
      />
    </div>
  );
}
