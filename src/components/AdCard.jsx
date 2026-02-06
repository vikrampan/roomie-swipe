// --- 2. UPDATED COMPONENT: AdCard.jsx ---
import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { Sparkles, ExternalLink, Star, Heart, Server } from 'lucide-react'; // ✅ Added Server icon
import { triggerHaptic } from '../services/utils';

export const AdCard = ({ ad, onSwipe }) => {
  const [swipeState, setSwipeState] = useState(null);

  // Dynamic Icon Component
  const IconComponent = ad.Icon; 
  const isHouseAd = ad.type === 'house'; // ✅ Check for house ad type

  return (
    <div className="absolute w-[95vw] max-w-sm h-[70vh] select-none flex justify-center items-center">
      <TinderCard
        className="absolute w-full h-full shadow-none"
        key={ad.id}
        onSwipe={(dir) => onSwipe(dir, ad)}
        preventSwipe={['up', 'down']}
        swipeThreshold={100}
        onSwipeRequirementFulfilled={(dir) => {
            triggerHaptic('medium');
            setSwipeState(dir === 'right' ? 'like' : 'nope');
        }}
        onSwipeRequirementUnfulfilled={() => setSwipeState(null)}
      >
        <div className={`relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col ${isHouseAd ? 'bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950' : 'bg-[#1a1a1a]'}`}>
          
          {/* 1. VISUAL CONTENT AREA */}
          <div className="flex-1 relative overflow-hidden">
              {isHouseAd ? (
                  // ✅ TRANSPARENCY CARD DESIGN
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20">
                      <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                          <Heart size={64} className="text-pink-500 fill-pink-500/20" />
                      </div>
                      <h3 className="text-2xl font-black text-white italic mb-2 tracking-tight">Built for Community.</h3>
                      <p className="text-sm font-medium text-purple-200 leading-relaxed px-2 opacity-90">
                          "We built this because finding a flatmate sucks. We run ads just to pay the server bills, so we can keep this free for you."
                      </p>
                      <div className="mt-8 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/40 border border-white/10 px-3 py-1.5 rounded-full bg-black/20">
                          <Server size={10}/> Server Costs • Data Safe
                      </div>
                  </div>
              ) : (
                  // ✅ STANDARD AD DESIGN
                  <>
                    <img 
                        src={ad.image || ad.img} 
                        className="w-full h-full object-cover pointer-events-none select-none bg-gray-900"
                        alt={ad.name}
                        draggable="false"
                    />
                    
                    {/* Gradients for text readability */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-full h-3/4 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

                    {/* "SPONSORED" Badge - Only for real ads */}
                    <div className="absolute top-6 right-4 z-20">
                        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-1.5 border border-white/10">
                            <Star size={10} className="text-yellow-400 fill-yellow-400"/>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Sponsored</span>
                        </div>
                    </div>
                  </>
              )}
              
              {/* Swipe Overlay Indicators */}
              {swipeState === 'like' && (
                 <div className={`absolute top-20 left-6 -rotate-12 border-[5px] px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in ${isHouseAd ? 'border-pink-500 text-pink-500' : 'border-emerald-400 text-emerald-400'}`}>
                     {isHouseAd ? "SUPPORT" : "OPEN"}
                 </div>
              )}
              {swipeState === 'nope' && (
                 <div className="absolute top-20 right-6 rotate-12 border-[5px] border-rose-500 text-rose-500 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in">
                     SKIP
                 </div>
              )}
          </div>

          {/* 2. INFO AREA (Bottom Half) */}
          <div className="absolute bottom-0 left-0 w-full p-6 pb-8 z-30 flex flex-col justify-end pt-20">
             
             {/* Brand Name & Icon */}
             <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white/10 rounded-full backdrop-blur-md border border-white/5">
                    {IconComponent && <IconComponent size={20} className={ad.iconColor || "text-white"} />}
                </div>
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">{ad.name}</span>
             </div>

             {/* Ad Copy */}
             <h2 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-md mb-2 leading-none">
                {ad.title}
             </h2>
             
             {!isHouseAd && (
                 <p className="text-xs font-medium text-slate-300 mb-6 line-clamp-2 leading-relaxed opacity-80">
                    {ad.bio || ad.desc}
                 </p>
             )}

             {/* CTA Button */}
             <a 
               href={ad.link} 
               target="_blank" 
               rel="noopener noreferrer"
               onTouchEnd={(e) => e.stopPropagation()} // Allow click to pass through
               className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl ${isHouseAd ? 'bg-white text-black shadow-pink-500/10' : 'bg-white text-black shadow-white/10'}`}
             >
                {ad.cta || "Check it out"} <ExternalLink size={16} />
             </a>
          </div>

        </div>
      </TinderCard>
    </div>
  );
};