import React, { useState, useRef, useMemo } from 'react';
import TinderCard from 'react-tinder-card';
import { MapPin, Sparkles, ChevronUp, IndianRupee, ShieldCheck, Mail } from 'lucide-react';
import { triggerHaptic, calculateCompatibility } from '../services/utils';

export const Card = ({ person, onSwipe, onCardLeftScreen, onInfo, myProfile }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeState, setSwipeState] = useState(null); // 'like', 'nope', or null
  
  // Refs for "Smart Tap" detection
  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  // --- 1. IMAGE LOGIC (MERGE ROOM & PERSONAL) ---
  const images = useMemo(() => {
    let allImages = [];
    
    // If they are a Host (have a room), show Room Photos first
    if (person.userRole === 'host' && person.roomImages?.length > 0) {
        allImages = [...person.roomImages, ...(person.images || [])];
    } else {
        // Hunters only show personal photos
        allImages = person.images || [];
    }
    
    // Fallback if no images exist
    return allImages.length > 0 
      ? allImages 
      : [person.img || 'https://via.placeholder.com/400x600?text=No+Image'];
  }, [person]);

  // Calculate Vibe Match Score
  const vibeScore = useMemo(() => calculateCompatibility(myProfile?.tags, person.tags), [myProfile, person]);

  // --- 2. SMART TAP LOGIC (Tap vs Swipe) ---
  const handleTouchStart = (e) => {
    touchStart.current = { 
        x: e.changedTouches[0].clientX, 
        y: e.changedTouches[0].clientY,
        time: Date.now() 
    };
  };

  const handleTouchEnd = (e) => {
    // Ignore taps on the bottom info panel (let them open profile via onClick)
    if (e.target.closest('.info-trigger')) return;

    const touchEnd = { 
        x: e.changedTouches[0].clientX, 
        y: e.changedTouches[0].clientY,
        time: Date.now()
    };

    // Distinguish Tap from Swipe
    const dist = Math.sqrt(Math.pow(touchEnd.x - touchStart.current.x, 2) + Math.pow(touchEnd.y - touchStart.current.y, 2));
    const duration = touchEnd.time - touchStart.current.time;

    // If movement < 10px and duration < 300ms, it's a TAP
    if (dist < 10 && duration < 300) {
        handleImageNavigation(e, touchEnd.x);
    }
  };

  const handleImageNavigation = (e, clickX) => {
    const card = e.currentTarget.getBoundingClientRect();
    const relativeX = clickX - card.left;

    if (relativeX > card.width / 2) {
      // Tap Right -> Next Photo
      if (currentIndex < images.length - 1) {
        triggerHaptic('light');
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0); // Loop back
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
    // ✅ FIX 1: Dynamic Height (70vh) to fit mobile screens + Buttons
    <div className="absolute w-[95vw] max-w-sm h-[70vh] select-none flex justify-center items-center">
      <TinderCard
        className="absolute w-full h-full shadow-none"
        key={person.id}
        onSwipe={(dir) => onSwipe(dir, person)}
        onCardLeftScreen={() => onCardLeftScreen(person.id)}
        preventSwipe={['up', 'down']}
        swipeRequirementType="position"
        swipeThreshold={100} 
        onSwipeRequirementFulfilled={(dir) => {
            triggerHaptic('medium');
            setSwipeState(dir === 'right' ? 'like' : 'nope');
        }}
        onSwipeRequirementUnfulfilled={() => setSwipeState(null)}
      >
        <div 
          className="relative w-full h-full bg-[#1a1a1a] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
          style={{ touchAction: 'none' }} 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Image */}
          <img 
            src={images[currentIndex]} 
            className="w-full h-full object-cover pointer-events-none select-none bg-gray-900"
            alt={person.name}
            draggable="false"
          />
          
          {/* Gradients (Optimized for Mobile) */}
          <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-3/5 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

          {/* Progress Bars */}
          <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white shadow-glow' : 'bg-white/20'}`} 
              />
            ))}
          </div>

          {/* --- ROLE BADGE (Top Left) --- */}
          <div className="absolute top-6 left-3 z-20 pointer-events-none">
             {person.userRole === 'host' ? (
                <div className="px-3 py-1 bg-purple-600/90 rounded-full flex items-center gap-1.5 shadow-lg border border-purple-400/30">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Available Room</span>
                </div>
             ) : (
                <div className="px-3 py-1 bg-emerald-500/90 rounded-full flex items-center gap-1.5 shadow-lg border border-emerald-400/30">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Looking</span>
                </div>
             )}
          </div>

          {/* --- VIBE SCORE (Top Right) --- */}
          <div className="absolute top-6 right-3 z-20 pointer-events-none">
             <div className="px-3 py-1 bg-black/60 border border-white/10 rounded-full flex items-center gap-1.5 shadow-lg">
                <Sparkles size={12} className="text-yellow-400 fill-yellow-400 animate-pulse"/>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{vibeScore}% Match</span>
             </div>
          </div>

          {/* --- STAMPS (YES / NOPE) --- */}
          {swipeState === 'like' && (
             <div className="absolute top-20 left-6 -rotate-12 border-[5px] border-emerald-400 text-emerald-400 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in duration-200">
                 YES
             </div>
          )}
          {swipeState === 'nope' && (
             <div className="absolute top-20 right-6 rotate-12 border-[5px] border-rose-500 text-rose-500 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/40 z-50 animate-in zoom-in duration-200">
                 NOPE
             </div>
          )}

          {/* --- BOTTOM INFO PANEL --- */}
          {/* ✅ FIX 2: Increased padding and z-index to ensure clickability */}
          <div 
            className="info-trigger absolute bottom-0 left-0 w-full p-5 pb-6 z-30 flex flex-col justify-end group/info cursor-pointer active:scale-[0.98] transition-transform bg-gradient-to-t from-black/90 to-transparent"
            onClick={(e) => {
                e.stopPropagation(); 
                onInfo(person); 
            }}
            onTouchEnd={(e) => e.stopPropagation()}
          >
             {/* Verified Badges Row */}
             <div className="flex items-center gap-2 mb-2 pointer-events-none">
                {person.isPhoneVerified && (
                    <div className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-md flex items-center gap-1">
                        <ShieldCheck size={10} className="text-emerald-400"/>
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Phone Verified</span>
                    </div>
                )}
                {/* Default Email Verified Badge */}
                <div className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-md flex items-center gap-1">
                    <Mail size={10} className="text-blue-400"/>
                    <span className="text-[9px] font-bold text-blue-400 uppercase">Verified</span>
                </div>
             </div>

             {/* Name & Age */}
             <div className="flex items-end gap-2 mb-1 pointer-events-none">
                <h2 className="text-3xl font-black italic tracking-tighter text-white drop-shadow-md truncate max-w-[80%]">
                    {person.name}
                </h2>
                <span className="text-xl font-medium text-white/80 mb-1">{person.age}</span>
             </div>

             {/* Distance & Rent */}
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

             {/* "View Details" Hint */}
             <div className="w-full pt-3 border-t border-white/10 flex items-center justify-between text-white/60 group-hover/info:text-white transition-colors pointer-events-none">
                <span className="text-xs font-bold uppercase tracking-widest">Tap for Details</span>
                <ChevronUp size={20} className="animate-bounce" />
             </div>
          </div>

        </div>
      </TinderCard>
    </div>
  );
};