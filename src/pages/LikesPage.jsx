import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, ExternalLink, Heart, X, Sparkles, CheckCircle2, MessageCircle } from 'lucide-react';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { db } from '../firebase';
import { SecureImage } from '../components/SecureImage';
import { MatchPopup } from '../components/Modals'; // ✅ Import Match Popup
import { swipeRight, swipeLeft } from '../services/interactionService'; // ✅ Import Swipe Logic

// ✅ YOUR ADSTERRA DIRECT LINK
const AD_LINK = "https://www.effectivegatecpm.com/r6w2gzk3?key=ac76c970958e7e558ee02341e09af460"; 

export const LikesPage = ({ user }) => {
  const [likes, setLikes] = useState([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null); // The card we are unlocking
  const [newMatchData, setNewMatchData] = useState(null);   // The data for the "It's a Match" popup
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH INCOMING LIKES ---
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
      // Filter out interactions that are ALREADY matched
      setLikes(incomingLikes.filter(l => !l.isMatch));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- 2. HANDLE WATCH AD ---
  const handleWatchAd = () => {
    if (!selectedMatch) return;
    window.open(AD_LINK, '_blank');
    
    const checkFocus = () => {
        if (document.visibilityState === 'visible') {
            unlockProfile(selectedMatch.id);
            window.removeEventListener('visibilitychange', checkFocus);
        }
    };
    window.addEventListener('visibilitychange', checkFocus);
    setTimeout(() => unlockProfile(selectedMatch.id), 5000);
  };

  const unlockProfile = async (interactionId) => {
      try {
          const interactionRef = doc(db, "interactions", interactionId);
          await updateDoc(interactionRef, { isRevealed: true });
          setShowAdModal(false);
          setSelectedMatch(null);
      } catch (e) { console.error("Unlock failed", e); }
  };

  // --- 3. NEW: HANDLE DECISIONS (Accept/Reject) ---
  
  // ✅ ACCEPT (Match)
  const handleAccept = async (e, like) => {
      e.stopPropagation(); // Prevent opening modal again
      
      // Since they already liked us, swiping right on them guarantees a match
      const result = await swipeRight(user.uid, like.fromUserId);
      
      if (result.isMatch) {
          setNewMatchData(result.matchData); // Triggers the popup
      }
      
      // Remove from list UI immediately
      setLikes(prev => prev.filter(l => l.id !== like.id));
  };

  // ❌ REJECT (Pass)
  const handleReject = async (e, like) => {
      e.stopPropagation();
      await swipeLeft(user.uid, like.fromUserId);
      setLikes(prev => prev.filter(l => l.id !== like.id));
  };

  const openRevealModal = (like) => {
      if (like.isRevealed) return; 
      setSelectedMatch(like);
      setShowAdModal(true);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold animate-pulse">Loading likes...</div>;

  return (
    <div className="min-h-screen bg-black pb-24 p-6 md:p-12">
       
       <div className="max-w-7xl mx-auto">
           <div className="mb-8">
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Liked You</h1>
                <p className="text-slate-500 text-sm font-medium">Unlock to see who wants to match.</p>
           </div>

           {likes.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-50">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Heart size={40} className="text-slate-600"/>
                   </div>
                   <p className="text-slate-400 font-medium">No pending likes.</p>
               </div>
           ) : (
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                   {likes.map((like) => (
                       <motion.div 
                         layout
                         key={like.id} 
                         onClick={() => openRevealModal(like)}
                         className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 cursor-pointer shadow-lg group"
                       >
                           {/* IMAGE LAYER */}
                           <div className={`w-full h-full ${like.isRevealed ? '' : 'blur-xl scale-110 brightness-50'}`}>
                               <SecureImage 
                                   src={like.fromData?.img || "https://via.placeholder.com/300"} 
                                   className="w-full h-full object-cover"
                               />
                           </div>

                           {/* LOCK OVERLAY */}
                           {!like.isRevealed ? (
                               <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                                   <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                                       <Lock size={20} className="text-white"/>
                                   </div>
                                   <span className="text-[10px] font-black text-white/90 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                       Tap to Reveal
                                   </span>
                               </div>
                           ) : (
                               // ✅ REVEALED: SHOW ACTION BUTTONS
                               <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                   <div className="mb-3">
                                       <p className="text-white font-bold text-sm truncate">{like.fromData?.name}, {like.fromData?.age}</p>
                                       <p className="text-slate-300 text-xs font-medium">{like.fromData?.city}</p>
                                   </div>
                                   
                                   {/* ACTION BUTTONS ROW */}
                                   <div className="flex gap-2">
                                       <button 
                                           onClick={(e) => handleReject(e, like)}
                                           className="flex-1 py-3 bg-white/10 hover:bg-red-500/20 text-white rounded-xl flex items-center justify-center transition-colors"
                                       >
                                           <X size={20} className="text-red-500" />
                                       </button>
                                       <button 
                                           onClick={(e) => handleAccept(e, like)}
                                           className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-emerald-900/20"
                                       >
                                           <Heart size={20} fill="black" />
                                       </button>
                                   </div>
                               </div>
                           )}
                       </motion.div>
                   ))}
               </div>
           )}
       </div>

       {/* --- REVEAL MODAL --- */}
       <AnimatePresence>
         {showAdModal && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
           >
             <div className="w-full max-w-sm bg-[#111] rounded-[2.5rem] p-8 border border-white/10 text-center relative shadow-2xl overflow-hidden">
                <button 
                    onClick={() => setShowAdModal(false)} 
                    className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={24}/>
                </button>
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse border border-pink-500/20">
                    <Sparkles size={32} className="text-pink-500 fill-pink-500/20" />
                </div>
                <h3 className="text-2xl font-black text-white italic mb-3">Unlock Profile?</h3>
                <p className="text-slate-400 text-sm mb-8 px-2">
                    Support our project by viewing a quick message. This keeps the app free!
                </p>
                <button 
                    onClick={handleWatchAd}
                    className="group w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20 active:scale-95 transition-all hover:scale-[1.02]"
                >
                    View Ad to Unlock <ExternalLink size={18} />
                </button>
             </div>
           </motion.div>
         )}

         {/* ✅ MATCH POPUP (Triggered when you click the Heart) */}
         {newMatchData && (
            <MatchPopup 
                person={newMatchData} 
                onClose={() => setNewMatchData(null)} 
                onChat={() => {
                    setNewMatchData(null);
                    // Add navigation logic here if needed, or just let them close it
                }} 
            />
         )}
       </AnimatePresence>
    </div>
  );
};