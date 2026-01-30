import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { motion } from 'framer-motion';
import { Info, ShieldAlert, MapPin, CheckCircle2, Sparkles } from 'lucide-react';
import { getDistance, triggerHaptic, calculateCompatibility } from '../services/utils';

export const Card = ({ person, onSwipe, onCardLeftScreen, userLocation, onReport, onInfo, myProfile }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ✅ Safety Check: Handle undefined or empty image arrays
  const images = (person.images && person.images.length > 0) 
    ? person.images 
    : [person.img || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167'];

  const vibeScore = calculateCompatibility(myProfile?.tags, person.tags);

  const handleTap = (e) => {
    const cardWidth = e.currentTarget.offsetWidth;
    const tapX = e.nativeEvent.offsetX;
    triggerHaptic('light');
    if (tapX > cardWidth / 2) {
      if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
      else setCurrentIndex(0);
    } else {
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="absolute w-full h-[600px] max-w-[400px] select-none">
      <TinderCard
        className="swipe absolute w-full h-full"
        onSwipe={(dir) => onSwipe(dir, person)}
        onCardLeftScreen={() => onCardLeftScreen(person.id)}
        preventSwipe={['up', 'down']}
      >
        <div onClick={handleTap} className="relative w-full h-full bg-[#0a0a0a] rounded-[3rem] overflow-hidden shadow-2xl border border-white/5 cursor-pointer">
          
          {/* Progress indicators for multi-image support */}
          <div className="absolute top-4 left-6 right-6 z-30 flex gap-1.5">
            {images.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i === currentIndex ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/20'}`} />
            ))}
          </div>

          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-slate-900" />}
          <img 
            src={images[currentIndex]} 
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
            onLoad={() => setImgLoaded(true)} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 pointer-events-none" />

          {/* Vibe Match Badge */}
          <div className="absolute top-10 left-8 z-20">
             <div className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl border border-white/20 flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400 fill-yellow-400"/>
                <span className="text-[10px] font-black text-white uppercase">{vibeScore}% Vibe Match</span>
             </div>
          </div>

          {/* Report Button */}
          <div className="absolute top-10 right-8 z-20">
             <button onClick={(e) => { e.stopPropagation(); onReport(person); }} className="p-2.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white hover:text-red-500 transition-colors">
                <ShieldAlert size={18}/>
             </button>
          </div>

          {/* Info Overlay */}
          <div className="absolute bottom-10 left-8 right-8 text-white">
            <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-black italic tracking-tighter">{person.name}, {person.age}</h2>
                <div className="p-1.5 bg-sky-500 rounded-full"><CheckCircle2 size={16}/></div>
            </div>
            
            <div className="flex items-center gap-2 mb-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <MapPin size={14} className="text-pink-500"/> {person.city} • {person.occupation || 'Lifestyle'}
            </div>
            
            <div className="flex items-center justify-between p-1.5 pl-5 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10">
                <div>
                    <span className="text-[9px] font-black text-pink-500 uppercase">Rent Budget</span>
                    <p className="text-2xl font-black text-white">₹{Number(person.rent).toLocaleString()}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onInfo(person); }} className="w-14 h-14 bg-white text-black rounded-[1.5rem] flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                    <Info size={28} />
                </button>
            </div>
          </div>
        </div>
      </TinderCard>
    </div>
  );
};

export const AdCard = ({ onSwipe }) => (
  <div className="absolute w-full h-[600px] max-w-[400px] p-2">
    <TinderCard className="swipe absolute w-full h-full" onSwipe={(dir) => onSwipe(dir, { isAd: true })}>
      <div className="w-full h-full bg-gradient-to-br from-pink-600 to-indigo-900 rounded-[3rem] p-12 flex flex-col justify-center items-center text-center shadow-2xl border border-white/10">
        <h2 className="text-white text-4xl font-black italic mb-4">SKIP THE BROKER</h2>
        <p className="text-indigo-100 font-bold mb-8 uppercase text-xs">Direct Lifestyle Matches</p>
        <button className="bg-white text-indigo-900 px-10 py-4 rounded-2xl font-black text-lg shadow-xl">PRO UPGRADE</button>
      </div>
    </TinderCard>
  </div>
);