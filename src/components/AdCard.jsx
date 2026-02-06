import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { ExternalLink, Star, Heart, Server, ShoppingBag, IndianRupee } from 'lucide-react'; 
import { triggerHaptic } from '../services/utils';

export const AdCard = ({ ad, onSwipe }) => {
  const [swipeState, setSwipeState] = useState(null);

  // 1. FALLBACKS: If 'Icon' is missing in data, use ShoppingBag.
  const IconComponent = ad.Icon || ShoppingBag; 
  const isHouseAd = ad.type === 'house'; 

  // ============================================================
  // ✅ DATA TRANSLATION LAYER (Fixes Blank Text)
  // ============================================================
  
  // Use 'name' from your data if 'title' is missing
  const displayTitle = ad.title || ad.name || "Featured Product";
  
  // Use 'age' (where you stored price) or 'price'
  const displayPrice = ad.age || ad.price || ""; 
  
  // Use 'bio' or 'desc'
  const displayDesc = ad.bio || ad.desc || "Check out this deal.";

  return (
    // ✅ CRITICAL FIX: zIndex: 100 ensures this card is VISIBLE and not buried under User Cards.
    <div 
      className="absolute w-[95vw] max-w-sm h-[70vh] select-none flex justify-center items-center"
      style={{ zIndex: 100 }}
    >
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
          
          {/* --- TOP HALF: IMAGE --- */}
          <div className="flex-1 relative overflow-hidden bg-gray-900">
              {isHouseAd ? (
                  // TRANSPARENCY CARD LAYOUT
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20">
                      <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                          <Heart size={64} className="text-pink-500 fill-pink-500/20" />
                      </div>
                      <h3 className="text-2xl font-black text-white italic mb-2 tracking-tight">Community First.</h3>
                      <p className="text-sm font-medium text-purple-200 leading-relaxed px-2 opacity-90">
                          "We show ads to cover server costs so this app stays free."
                      </p>
                      <div className="mt-8 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/40 border border-white/10 px-3 py-1.5 rounded-full bg-black/20">
                          <Server size={10}/> Server Costs • Data Safe
                      </div>
                  </div>
              ) : (
                  // STANDARD PRODUCT AD LAYOUT
                  <>
                    <img 
                        src={ad.image || ad.img} 
                        className="w-full h-full object-cover pointer-events-none select-none bg-gray-900"
                        alt={displayTitle}
                        draggable="false"
                    />
                    
                    {/* Dark Gradient for text readability */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-full h-3/4 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

                    {/* SPONSORED BADGE */}
                    <div className="absolute top-6 right-4 z-20">
                        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-1.5 border border-white/10">
                            <Star size={10} className="text-yellow-400 fill-yellow-400"/>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Sponsored</span>
                        </div>
                    </div>
                  </>
              )}
              
              {/* SWIPE OVERLAYS */}
              {swipeState === 'like' && (
                 <div className={`absolute top-20 left-6 -rotate-12 border-[5px] px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in ${isHouseAd ? 'border-pink-500 text-pink-500' : 'border-emerald-400 text-emerald-400'}`}>
                     {isHouseAd ? "SUPPORT" : "SHOP"}
                 </div>
              )}
              {swipeState === 'nope' && (
                 <div className="absolute top-20 right-6 rotate-12 border-[5px] border-rose-500 text-rose-500 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in">
                     SKIP
                 </div>
              )}
          </div>

          {/* --- BOTTOM HALF: INFO CONTENT --- */}
          <div className="absolute bottom-0 left-0 w-full p-6 pb-8 z-30 flex flex-col justify-end pt-20">
             
             {/* Platform Label */}
             <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white/10 rounded-full backdrop-blur-md border border-white/5">
                    {/* Render the icon */}
                    <IconComponent size={20} className={ad.iconColor || "text-white"} />
                </div>
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">
                    {ad.platform || "Recommended"}
                </span>
             </div>

             {/* Title & Price */}
             <div className="mb-3">
                 <h2 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-md leading-none mb-1">
                    {displayTitle}
                 </h2>
                 
                 {/* Only show price if it's not a house ad and price exists */}
                 {!isHouseAd && displayPrice && (
                    <p className="text-xl font-black text-emerald-400 flex items-center gap-1 mt-1">
                       {/* Add Rupee symbol if not present in the string */}
                       {!displayPrice.includes('₹') && displayPrice !== "Earn $$" && <IndianRupee size={18}/>} 
                       {displayPrice}
                    </p>
                 )}
             </div>
             
             {/* Description */}
             {!isHouseAd && (
                 <p className="text-xs font-medium text-slate-300 mb-6 line-clamp-2 leading-relaxed opacity-80">
                    {displayDesc}
                 </p>
             )}

             {/* CTA Button */}
             <a 
               href={ad.link} 
               target="_blank" 
               rel="noopener noreferrer"
               onTouchEnd={(e) => e.stopPropagation()} // Let touch events pass to link
               className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl ${isHouseAd ? 'bg-white text-black shadow-pink-500/10' : 'bg-white text-black shadow-white/10'}`}
             >
                {ad.cta || "View Deal"} <ExternalLink size={16} />
             </a>
          </div>

        </div>
      </TinderCard>
    </div>
  );
};