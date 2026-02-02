import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { Sparkles, ExternalLink, Star } from 'lucide-react';
import { triggerHaptic } from '../services/utils';

export const AdCard = ({ ad, onSwipe }) => {
  const [swipeState, setSwipeState] = useState(null);

  // Dynamic Icon Component
  const IconComponent = ad.Icon; 

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
        <div className="relative w-full h-full bg-[#1a1a1a] rounded-[2rem] overflow-hidden shadow-2xl border border-yellow-500/30">
          
          {/* Ad Image */}
          <img 
            src={ad.img} 
            className="w-full h-full object-cover pointer-events-none select-none bg-gray-900"
            alt={ad.name}
            draggable="false"
          />
          
          {/* Gradients */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-3/4 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

          {/* "SPONSORED" Badge */}
          <div className="absolute top-6 left-3 z-20">
             <div className="px-3 py-1 bg-yellow-500/20 backdrop-blur-md rounded-full flex items-center gap-1.5 border border-yellow-500/50">
                <Star size={10} className="text-yellow-400 fill-yellow-400"/>
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Sponsored</span>
             </div>
          </div>

          {/* Stamps */}
          {swipeState === 'like' && (
             <div className="absolute top-20 left-6 -rotate-12 border-[5px] border-emerald-400 text-emerald-400 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in">
                 OPEN
             </div>
          )}
          {swipeState === 'nope' && (
             <div className="absolute top-20 right-6 rotate-12 border-[5px] border-rose-500 text-rose-500 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in">
                 SKIP
             </div>
          )}

          {/* Bottom Ad Info */}
          <div className="absolute bottom-0 left-0 w-full p-6 pb-8 z-30 flex flex-col justify-end">
             
             {/* Brand Name & Icon */}
             <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                    {IconComponent && <IconComponent size={20} className={ad.iconColor || "text-white"} />}
                </div>
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">{ad.name}</span>
             </div>

             {/* Ad Copy */}
             <h2 className="text-3xl font-black italic tracking-tighter text-white drop-shadow-md mb-2 leading-none">
                {ad.title}
             </h2>
             <p className="text-sm font-medium text-slate-300 mb-6 line-clamp-2 leading-relaxed">
                {ad.desc}
             </p>

             {/* CTA Button */}
             <a 
               href={ad.link} 
               target="_blank" 
               rel="noopener noreferrer"
               onTouchEnd={(e) => e.stopPropagation()} // Allow click to pass through
               className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/10"
             >
                {ad.cta || "Learn More"} <ExternalLink size={16} />
             </a>
          </div>

        </div>
      </TinderCard>
    </div>
  );
};