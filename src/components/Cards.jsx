import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { MapPin, Sparkles, ChevronUp, IndianRupee } from 'lucide-react';
import { triggerHaptic, calculateCompatibility } from '../services/utils';

export const Card = ({ person, onSwipe, onCardLeftScreen, onInfo, myProfile }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeState, setSwipeState] = useState(null); // 'like', 'nope', or null

  // Ensure images exist, otherwise fallback
  const images = (person.images && person.images.length > 0) 
    ? person.images 
    : [person.img || 'https://via.placeholder.com/400x600?text=No+Image'];

  const vibeScore = React.useMemo(() => calculateCompatibility(myProfile?.tags, person.tags), [myProfile, person]);

  // Handle tapping left/right sides of the image
  const handleTap = (e) => {
    // If clicking the info area at the bottom, don't change photos
    if (e.target.closest('.info-trigger')) return;

    const cardWidth = e.currentTarget.offsetWidth;
    const tapX = e.nativeEvent.offsetX;
    
    if (tapX > cardWidth / 2) {
      // Tap Right -> Next Photo
      if (currentIndex < images.length - 1) {
        triggerHaptic('light');
        setCurrentIndex(prev => prev + 1);
      } else {
        // Loop back to start (optional behavior)
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
    <div className="absolute w-full h-[640px] max-w-[400px] select-none perspective-1000">
      <TinderCard
        className="swipe absolute w-full h-full"
        key={person.id}
        onSwipe={(dir) => onSwipe(dir, person)}
        onCardLeftScreen={() => onCardLeftScreen(person.id)}
        preventSwipe={['up', 'down']}
        // PHYSICS TWEAKS:
        swipeRequirementType="velocity" // Allows fast flicks to count
        swipeThreshold={0.3} // Easier to swipe (lower number = easier)
        onSwipeRequirementFulfilled={(dir) => {
            triggerHaptic('medium');
            setSwipeState(dir === 'right' ? 'like' : 'nope');
        }}
        onSwipeRequirementUnfulfilled={() => setSwipeState(null)}
      >
        <div 
          onClick={handleTap} 
          className="relative w-full h-full bg-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 cursor-pointer"
        >
          
          {/* --- IMAGE LAYER --- */}
          <img 
            src={images[currentIndex]} 
            className="w-full h-full object-cover pointer-events-none"
            alt={person.name}
          />
          
          {/* Preload next image */}
          {currentIndex < images.length - 1 && <img src={images[currentIndex+1]} className="hidden" alt="preload"/>}

          {/* --- GRADIENTS --- */}
          {/* Top gradient for visibility */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          {/* Bottom gradient for text */}
          <div className="absolute bottom-0 left-0 w-full h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          {/* --- PROGRESS BARS --- */}
          <div className="absolute top-3 left-4 right-4 z-30 flex gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20'}`} 
              />
            ))}
          </div>

          {/* --- STAMPS (LIKE / NOPE) --- */}
          {swipeState === 'like' && (
             <div className="absolute top-10 left-6 -rotate-12 border-[5px] border-emerald-400 text-emerald-400 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/20 backdrop-blur-sm z-50 animate-in zoom-in duration-200">
                 YES
             </div>
          )}
          {swipeState === 'nope' && (
             <div className="absolute top-10 right-6 rotate-12 border-[5px] border-rose-500 text-rose-500 px-4 py-1 rounded-xl font-black text-4xl tracking-widest bg-black/20 backdrop-blur-sm z-50 animate-in zoom-in duration-200">
                 NOPE
             </div>
          )}

          {/* --- VIBE BADGE --- */}
          <div className="absolute top-6 right-4 z-20">
             <div className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-1.5 shadow-lg">
                <Sparkles size={12} className="text-yellow-400 fill-yellow-400 animate-pulse"/>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{vibeScore}% Match</span>
             </div>
          </div>

          {/* --- BOTTOM INFO PANEL (Clickable) --- */}
          <div 
            className="info-trigger absolute bottom-0 left-0 w-full p-5 pb-8 z-30 flex flex-col justify-end group/info"
            onClick={(e) => { e.stopPropagation(); onInfo(person); }}
          >
             {/* Name & Age */}
             <div className="flex items-end gap-2 mb-2">
                <h2 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-md">
                    {person.name}
                </h2>
                <span className="text-2xl font-medium text-white/80 mb-1">{person.age}</span>
             </div>

             {/* Details Row */}
             <div className="flex items-center gap-3 text-xs font-bold text-white/80 uppercase tracking-wide mb-4">
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                    <MapPin size={12} className="text-pink-500"/> 
                    {person.distance || '2'} km away
                </div>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                    <IndianRupee size={12} className="text-emerald-400"/> 
                    {Number(person.rent).toLocaleString()}/mo
                </div>
             </div>

             {/* "View Profile" Hint */}
             <div className="w-full pt-3 border-t border-white/10 flex items-center justify-between text-white/60 group-hover/info:text-white transition-colors">
                <span className="text-xs font-bold uppercase tracking-widest">View Profile</span>
                <ChevronUp size={20} className="animate-bounce" />
             </div>
          </div>

        </div>
      </TinderCard>
    </div>
  );
};