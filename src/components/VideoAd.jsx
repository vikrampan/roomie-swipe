import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, ExternalLink, ShoppingBag } from 'lucide-react';

export const VideoAd = ({ ad }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(e => console.log("Autoplay blocked", e));
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.6 } // Play when 60% of the ad is visible
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full aspect-[9/16] md:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-4 group">
      
      {/* 1. THE VIDEO PLAYER */}
      <video
        ref={videoRef}
        src={ad.videoUrl}
        poster={ad.thumbnail} 
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline // Critical for iPhone
      />

      {/* 2. OVERLAYS */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

      {/* 3. SPONSORED TAG */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
            <ShoppingBag size={10} className="text-pink-500" />
            <span className="text-[10px] font-bold text-white tracking-widest">SPONSORED</span>
        </div>
      </div>

      {/* 4. MUTE TOGGLE */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all z-20"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* 5. BOTTOM CTA AREA */}
      <div className="absolute bottom-0 left-0 w-full p-6 z-20">
        <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
                <h3 className="text-2xl font-black italic text-white leading-none mb-1 drop-shadow-lg">
                    {ad.title}
                </h3>
                <p className="text-xs font-medium text-slate-300 line-clamp-2 opacity-90">
                    {ad.desc}
                </p>
            </div>
            
            <a 
                href={ad.link} 
                target="_blank" 
                rel="noreferrer"
                className="flex-none bg-white text-black px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 shadow-lg shadow-white/10"
            >
                {ad.cta} <ExternalLink size={14} />
            </a>
        </div>
      </div>
    </div>
  );
};