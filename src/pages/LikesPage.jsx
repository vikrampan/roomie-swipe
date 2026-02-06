import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, ExternalLink, Heart, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { db } from '../firebase';
import { SecureImage } from './SecureImage'; 

// ✅ 1. YOUR ADSTERRA DIRECT LINK
const AD_LINK = "https://www.effectivegatecpm.com/r6w2gzk3?key=ac76c970958e7e558ee02341e09af460"; 

export const LikesPage = ({ user }) => {
  const [likes, setLikes] = useState([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 2. FETCH INCOMING LIKES ---
  useEffect(() => {
    if (!user) return;

    // Query: Who liked ME?
    const q = query(
      collection(db, "interactions"),
      where("toUserId", "==", user.uid),
      where("type", "==", "like")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incomingLikes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Filter out matches (we only want pending likes)
      setLikes(incomingLikes.filter(l => !l.isMatch));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- 3. HANDLE WATCH AD ---
  const handleWatchAd = () => {
    if (!selectedMatch) return;

    // A. Open Ad in new tab
    window.open(AD_LINK, '_blank');
    
    // B. Wait for user to return to unlock
    const checkFocus = () => {
        if (document.visibilityState === 'visible') {
            unlockProfile(selectedMatch.id);
            window.removeEventListener('visibilitychange', checkFocus);
        }
    };
    window.addEventListener('visibilitychange', checkFocus);
    
    // Fallback: Unlock anyway after 5 seconds if logic fails
    setTimeout(() => unlockProfile(selectedMatch.id), 5000);
  };

  const unlockProfile = async (interactionId) => {
      try {
          const interactionRef = doc(db, "interactions", interactionId);
          await updateDoc(interactionRef, { isRevealed: true });
          setShowAdModal(false);
          setSelectedMatch(null);
      } catch (e) {
          console.error("Unlock failed", e);
      }
  };

  const openRevealModal = (like) => {
      if (like.isRevealed) return; // Already unlocked
      setSelectedMatch(like);
      setShowAdModal(true);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold animate-pulse">Loading likes...</div>;

  return (
    <div className="min-h-screen bg-black pb-24 p-6 md:p-12">
       
       <div className="max-w-7xl mx-auto">
           <div className="mb-8">
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Liked You</h1>
                <p className="text-slate-500 text-sm font-medium">See who wants to be your roomie.</p>
           </div>

           {likes.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-50">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Heart size={40} className="text-slate-600"/>
                   </div>
                   <p className="text-slate-400 font-medium">No likes yet. Keep your profile updated!</p>
               </div>
           ) : (
               // ✅ RESPONSIVE GRID: 2 cols on mobile, 4 cols on tablet, 5 on desktop
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                   {likes.map((like) => (
                       <motion.div 
                         layout
                         key={like.id} 
                         onClick={() => openRevealModal(like)}
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 cursor-pointer shadow-lg group"
                       >
                           {/* IMAGE LAYER */}
                           <div className={`w-full h-full ${like.isRevealed ? '' : 'blur-xl scale-110 brightness-50 transition-all duration-500 group-hover:scale-115'}`}>
                               <SecureImage 
                                   src={like.fromData?.img || "https://via.placeholder.com/300"} 
                                   className="w-full h-full object-cover"
                               />
                           </div>

                           {/* LOCK OVERLAY (If not revealed) */}
                           {!like.isRevealed && (
                               <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                                   <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                                       <Lock size={20} className="text-white"/>
                                   </div>
                                   <span className="text-[10px] font-black text-white/90 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                       Tap to Reveal
                                   </span>
                               </div>
                           )}

                           {/* NAME TAG (If revealed) */}
                           {like.isRevealed && (
                               <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                                   <p className="text-white font-bold text-base truncate">{like.fromData?.name}</p>
                                   <p className="text-slate-300 text-xs font-medium mt-0.5">{like.fromData?.age} • {like.fromData?.city}</p>
                               </div>
                           )}
                       </motion.div>
                   ))}
               </div>
           )}
       </div>

       {/* --- 4. THE REVEAL MODAL --- */}
       <AnimatePresence>
         {showAdModal && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
           >
             <div className="w-full max-w-sm bg-[#111] rounded-[2.5rem] p-8 border border-white/10 text-center relative shadow-2xl overflow-hidden">
                
                {/* Close Button */}
                <button 
                    onClick={() => setShowAdModal(false)} 
                    className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={24}/>
                </button>

                {/* Header Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse border border-pink-500/20">
                    <Sparkles size={32} className="text-pink-500 fill-pink-500/20" />
                </div>
                
                <h3 className="text-2xl font-black text-white italic mb-3">Unlock Profile?</h3>
                
                {/* The "Why" - Transparency */}
                <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
                    <p className="text-slate-300 text-xs leading-relaxed font-medium">
                        <span className="text-pink-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">Community Project</span>
                        RoomieSwipe is maintained by students. We use this brief ad to pay for our servers and keep the app free for everyone.
                    </p>
                </div>

                {/* The "How" - Instructions */}
                <div className="text-left space-y-3 mb-8 px-2">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">1</div>
                        <p>Click the button below (opens in new tab).</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">2</div>
                        <p>Simply return to this tab.</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-emerald-400 font-bold">
                        <CheckCircle2 size={14} />
                        <p>Profile unlocks automatically!</p>
                    </div>
                </div>

                {/* THE "WATCH AD" BUTTON */}
                <button 
                    onClick={handleWatchAd}
                    className="group w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20 active:scale-95 transition-all hover:scale-[1.02]"
                >
                    View Ad to Unlock <ExternalLink size={18} className="opacity-80 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="mt-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    Takes 2 seconds • Secure Link
                </p>

             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};