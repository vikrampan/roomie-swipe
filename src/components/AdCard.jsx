import React from 'react';
import TinderCard from 'react-tinder-card';
import { ExternalLink, Star } from 'lucide-react';

export const AdCard = ({ item, onSwipe }) => {
  
  // 1. Get the Icon Component from the data
  const IconComponent = item.Icon; 

  const handleTap = () => {
    if (item.link) window.open(item.link, '_blank');
  };

  return (
    <div className="absolute w-full h-[640px] max-w-[400px] flex justify-center items-center perspective-1000">
      <TinderCard
        className="swipe absolute w-full h-full"
        key={item.id}
        onSwipe={(dir) => onSwipe(dir, item)}
        preventSwipe={['up', 'down']}
      >
        <div 
          className="relative w-full h-full bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-yellow-500/30 cursor-pointer group"
          onClick={handleTap}
        >
          {/* Ad Image */}
          <img 
            src={item.img} 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
            alt="Sponsored"
          />
          
          {/* Badge */}
          <div className="absolute top-6 right-6 bg-yellow-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg z-20 flex items-center gap-1 animate-pulse">
            <Star size={10} fill="black" /> Sponsored
          </div>

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          {/* Ad Copy */}
          <div className="absolute bottom-0 w-full p-8 text-left z-30">
            {/* 2. RENDER THE ICON DYNAMICALLY */}
            {IconComponent && (
                <div className="mb-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                    <IconComponent size={24} className={item.iconColor} />
                </div>
            )}

            <h2 className="text-3xl font-black italic text-white mb-2 leading-tight">
              {item.title}
            </h2>
            <p className="text-sm font-medium text-slate-300 mb-6 leading-relaxed">
              {item.desc}
            </p>
            
            <button className="w-full py-4 bg-yellow-400 text-black font-black text-sm uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20">
              {item.cta || "Learn More"} <ExternalLink size={16} />
            </button>
            
            <p className="text-[9px] text-center text-white/30 mt-3 uppercase tracking-widest">
                Partner Advertisement
            </p>
          </div>
        </div>
      </TinderCard>
    </div>
  );
};