import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { motion } from 'framer-motion';
import { Info, ShieldAlert, MapPin, CheckCircle2, Sparkles } from 'lucide-react';
import { getDistance, triggerHaptic, calculateCompatibility } from '../services/utils';

export const Card = ({ person, onSwipe, onCardLeftScreen, userLocation, onReport, onInfo, myProfile }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = Array.isArray(person.images) && person.images.length > 0 ? person.images : [person.img];
  const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, person.lat, person.lng) : null;
  const vibeScore = calculateCompatibility(myProfile?.tags, person.tags);

  const handleTap = (e) => {
    const cardWidth = e.currentTarget.offsetWidth;
    const tapX = e.nativeEvent.offsetX;
    triggerHaptic('light');
    if (tapX > cardWidth / 2) {
      if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
      else setCurrentIndex(0); // Loop back
    } else {
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="absolute w-full h-full select-none">
      <TinderCard
        className="swipe absolute w-full h-full"
        onSwipe={(dir) => onSwipe(dir, person)}
        onCardLeftScreen={() => onCardLeftScreen(person.id)}
        preventSwipe={['up', 'down']}
      >
        <div onClick={handleTap} className="relative w-full h-full bg-[#0a0a0a] rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/5 cursor-pointer group">
          
          {/* PROGRESS BARS */}
          <div className="absolute top-4 left-6 right-6 z-30 flex gap-1.5">
            {images.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/20'}`} />
            ))}
          </div>

          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-slate-900" />}
          <img src={images[currentIndex]} className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImgLoaded(true)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />

          {/* VIBE MATCH BADGE */}
          <div className="absolute top-10 left-8 z-20">
             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl border border-white/20 shadow-xl flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400 fill-yellow-400"/>
                <span className="text-[10px] font-black text-white uppercase tracking-tighter">{vibeScore}% Match</span>
             </motion.div>
          </div>

          {/* DISTANCE BADGE */}
          <div className="absolute top-10 right-8 z-20">
             <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white/80">
                <ShieldAlert size={18} onClick={(e) => { e.stopPropagation(); onReport(person); }} className="hover:text-red-500 transition-colors cursor-pointer"/>
             </div>
          </div>

          {/* INFO SECTION */}
          <div className="absolute bottom-10 left-8 right-8 text-white pointer-events-none">
            <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-black italic tracking-tighter">{person.name}, {person.age}</h2>
                <div className="p-1.5 bg-sky-500 rounded-full shadow-lg shadow-sky-500/20"><CheckCircle2 size={16}/></div>
            </div>
            
            <div className="flex items-center gap-2 mb-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <MapPin size={14} className="text-pink-500"/> {dist}km away • {person.occupation}
            </div>
            
            <div className="flex items-center justify-between p-1.5 pl-5 glass-card rounded-[2rem] border-white/10 pointer-events-auto">
                <div>
                    <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Expected Rent</span>
                    <p className="text-2xl font-black text-white">₹{Number(person.rent).toLocaleString()}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onInfo(person); }} className="w-14 h-14 bg-white text-black rounded-[1.5rem] flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl">
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
  <div className="absolute w-full h-full p-2">
    <TinderCard className="swipe absolute w-full h-full" onSwipe={(dir) => onSwipe(dir, { type: 'ad' })}>
      <div className="w-full h-full bg-gradient-to-br from-pink-600 to-indigo-900 rounded-[3rem] p-12 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden border border-white/10">
        <div className="relative z-10">
            <h2 className="text-white text-4xl font-black italic mb-4 tracking-tighter">Skip the Broker!</h2>
            <p className="text-indigo-100 font-bold mb-8 uppercase tracking-widest text-xs">Direct Matching Only</p>
            <button className="bg-white text-indigo-900 px-10 py-4 rounded-2xl font-black text-lg">PRO UPGRADE</button>
        </div>
      </div>
    </TinderCard>
  </div>
);