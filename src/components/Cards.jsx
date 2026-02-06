import React, { useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, ChevronUp, IndianRupee, ShieldCheck } from 'lucide-react';
import { triggerHaptic, calculateCompatibility } from '../services/utils';
import { SecureImage } from './SecureImage';

// ✅ Memoized to prevent jittery re-renders
export const Card = memo(({ person, onSwipe, onCardLeftScreen, onInfo, myProfile }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- IMAGE LOGIC ---
  const images = useMemo(() => {
    let allImages = [];
    if (person.userRole === 'host' && person.roomImages?.length > 0) {
        allImages = [...person.roomImages, ...(person.images || [])];
    } else {
        allImages = person.images || [];
    }
    return allImages.length > 0 ? allImages : [person.img || 'https://via.placeholder.com/400x600?text=No+Image'];
  }, [person]);

  const vibeScore = useMemo(() => calculateCompatibility(myProfile?.tags, person.tags), [myProfile, person]);

  // --- TAP HANDLER (Change Photo) ---
  const handleTap = (e) => {
      // Prevent navigation if clicking info trigger
      if (e.target.closest('.info-trigger')) return;

      const card = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - card.left;

      if (clickX > card.width / 2) {
        // Tap Right -> Next Photo
        if (currentIndex < images.length - 1) {
          triggerHaptic('light');
          setCurrentIndex(prev => prev + 1);
        } else {
          setCurrentIndex(0); 
        }
      } else {
        // Tap Left -> Prev Photo
        if (currentIndex > 0) {
          triggerHaptic('light');
          setCurrentIndex(prev => prev - 1);
        }
      }
  };

  return (
    <motion.div 
      key={person.id}
      style={{ zIndex: 10 }}
      
      // ❌ DRAG REMOVED (As requested for performance)
      // drag="x" ... deleted
      
      // Exit Animation (Triggered by buttons)
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ 
        x: person.swipeDirection === 'right' ? 600 : -600, // Simpler exit distance
        opacity: 0,
        rotate: person.swipeDirection === 'right' ? 20 : -20, // Simple rotation
        transition: { duration: 0.4, ease: "easeInOut" } 
      }}
      className="absolute w-[95vw] max-w-sm h-[70vh] select-none flex justify-center items-center"
    >
        <div 
          className="relative w-full h-full bg-[#1a1a1a] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
          onClick={handleTap} // Simple click handler instead of complex pointer events
        >
          {/* Main Image */}
          <SecureImage 
            src={images[currentIndex]} 
            className="w-full h-full bg-gray-900 pointer-events-none" 
            isBlurred={false} 
          />
          
          {/* Overlays */}
          <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-3/5 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

          {/* Progress Indicators */}
          <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white shadow-glow' : 'bg-white/20'}`} 
              />
            ))}
          </div>

          {/* Badges */}
          <div className="absolute top-6 left-3 z-20 pointer-events-none">
             <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg border border-white/10 ${person.userRole === 'host' ? 'bg-purple-600/90' : 'bg-emerald-500/90'}`}>
                <span className="text-[10px] font-black text-white uppercase tracking-wider">
                    {person.userRole === 'host' ? 'Available Room' : 'Looking'}
                </span>
             </div>
          </div>

          <div className="absolute top-6 right-3 z-20 pointer-events-none">
             <div className="px-3 py-1 bg-black/60 border border-white/10 rounded-full flex items-center gap-1.5 shadow-lg">
                <Sparkles size={12} className="text-yellow-400 fill-yellow-400 animate-pulse"/>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{vibeScore}% Match</span>
             </div>
          </div>

          {/* --- BOTTOM INFO PANEL --- */}
          <div 
            className="info-trigger absolute bottom-0 left-0 w-full p-5 pb-6 z-30 flex flex-col justify-end bg-gradient-to-t from-black/90 to-transparent"
            onClick={(e) => { 
                e.stopPropagation(); 
                onInfo(person); 
            }}
          >
             {/* Verified Badge */}
             <div className="flex items-center gap-2 mb-2 pointer-events-none">
                {person.isPhoneVerified && (
                    <div className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-md flex items-center gap-1">
                        <ShieldCheck size={10} className="text-emerald-400"/>
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Phone Verified</span>
                    </div>
                )}
             </div>

             {/* Identity Row */}
             <div className="flex items-end gap-2 mb-1 pointer-events-none">
                <h2 className="text-3xl font-black italic tracking-tighter text-white drop-shadow-md truncate max-w-[80%]">
                    {person.name}
                </h2>
                <span className="text-xl font-medium text-white/80 mb-1">{person.age}</span>
             </div>

             {/* Stats Row */}
             <div className="flex items-center gap-3 text-xs font-bold text-white/80 uppercase tracking-wide mb-3 pointer-events-none">
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md">
                    <MapPin size={12} className="text-pink-500"/> 
                    {person.distance || '2'} km
                </div>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md">
                    <IndianRupee size={12} className="text-emerald-400"/> 
                    {Number(person.rent).toLocaleString()}/mo
                </div>
             </div>

             {/* Expand Hint */}
             <div className="w-full pt-3 border-t border-white/10 flex items-center justify-between text-white/60 pointer-events-none">
                <span className="text-xs font-bold uppercase tracking-widest">Tap for Details</span>
                <ChevronUp size={20} className="animate-bounce" />
             </div>
          </div>
        </div>
    </motion.div>
  );
});