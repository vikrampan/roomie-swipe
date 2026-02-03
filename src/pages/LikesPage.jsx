import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Lock, Sparkles, X, ChevronLeft, Eye, ShieldCheck, MessageCircle 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { swipeRight } from '../services/interactionService';
import { SecureImage } from '../components/SecureImage';

const SPONSORS = [
  {
    id: 'spon_1',
    name: 'Furlenco',
    title: 'Rent Furniture @ ₹999',
    desc: 'Don\'t buy a bed you\'ll sell in a year. Rent premium furniture with free relocation.',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    link: 'https://furlenco.com', 
    bg: 'bg-red-600'
  },
  {
    id: 'spon_2',
    name: 'Urban Company',
    title: 'Deep Clean Your New Flat',
    desc: 'Get 5-star rated professionals to scrub your new place before you move in.',
    image: 'https://images.unsplash.com/photo-1581578731117-10d52143b0d8?auto=format&fit=crop&w=800&q=80',
    link: 'https://urbancompany.com',
    bg: 'bg-blue-600'
  }
];

export const LikesPage = ({ currentUser, onBack, onNavigateToChat }) => {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adModal, setAdModal] = useState(null);

  // --- 2. FETCH LIKES (OPTIMIZED FAST-READ) ---
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Fetching from 'interactions' where the current user is the recipient
    const q = query(
      collection(db, "interactions"), 
      where("toUserId", "==", currentUser.uid),
      where("type", "==", "like")
    );

    // ✅ PERFORMANCE FIX: We no longer map through and fetch separate user profiles.
    // The profile data is now part of the interaction document itself.
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const likedProfiles = snapshot.docs.map(doc => ({
            interactionId: doc.id,
            ...doc.data()
        }));

        setLikes(likedProfiles);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- 3. UNLOCK LOGIC ---
  const handleUnlock = async () => {
    if (!adModal) return;

    // Update Firestore to reveal this specific liker permanently
    const interactionRef = doc(db, "interactions", adModal.profile.interactionId);
    await updateDoc(interactionRef, { isRevealed: true });

    // Close Modal
    setAdModal(null);
  };

  // --- 4. MATCH LOGIC ---
  const handleAcceptMatch = async (profile) => {
    // Uses the denormalized fromUserId to trigger the mutual match
    const result = await swipeRight(currentUser.uid, profile.fromUserId);
    
    if (result.isMatch) {
        if (onNavigateToChat) onNavigateToChat();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] z-[60] flex flex-col font-sans overflow-hidden animate-in slide-in-from-right">
      
      {/* HEADER */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft className="text-white" size={24} />
            </button>
            <div>
                <h1 className="text-xl font-black italic uppercase text-white">Who Liked Me</h1>
                <p className="text-xs font-bold text-slate-500">{likes.length} People Interested</p>
            </div>
        </div>
        <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full text-[10px] font-black text-black flex items-center gap-1 shadow-lg shadow-yellow-500/20">
            <Sparkles size={10} />
            PREMIUM FREE
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {loading ? (
           <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
             <div className="animate-spin"><Sparkles size={24}/></div>
             <p className="text-xs font-bold uppercase tracking-widest">Scanning Vibes...</p>
           </div>
        ) : likes.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
             <div className="p-6 bg-white/5 rounded-full"><Heart size={40} className="text-slate-600"/></div>
             <p className="text-sm font-bold text-slate-400">No likes yet. Keep swiping!</p>
           </div>
        ) : (
           <div className="grid grid-cols-2 gap-4 pb-20">
             {likes.map((likeDoc, i) => (
               <LikeCard 
                 key={likeDoc.interactionId} 
                 profile={likeDoc} 
                 onUnlock={() => setAdModal({ profile: likeDoc, sponsor: SPONSORS[i % SPONSORS.length] })} 
                 onAccept={() => handleAcceptMatch(likeDoc)} 
               />
             ))}
           </div>
        )}
      </div>

      {/* --- THE AD MODAL --- */}
      <AnimatePresence>
        {adModal && (
            <AdUnlockModal 
                sponsor={adModal.sponsor} 
                onComplete={handleUnlock} 
                onCancel={() => setAdModal(null)} 
            />
        )}
      </AnimatePresence>
    </div>
  );
};

const LikeCard = ({ profile, onUnlock, onAccept }) => {
  const isLocked = !profile.isRevealed;
  const isAlreadyMatched = profile.isMatch;
  
  // ✅ FAST ACCESS: Using the denormalized data directly
  const person = profile.fromData || { name: "Unknown", age: "?", img: "" };

  return (
    <div className="relative aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden border border-white/10 group">
       {/* IMAGE LAYER - SECURE CANVAS REPLACEMENT */}
       <SecureImage 
         src={person.img || "https://via.placeholder.com/400"} 
         isBlurred={isLocked}
         className="w-full h-full"
       />

       {/* CONTENT LAYER */}
       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
          {isLocked ? (
             <div className="flex flex-col items-center text-center gap-2 mb-4">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-xl">
                    <Lock size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Secret Admirer</h3>
                <p className="text-[10px] font-bold text-slate-400">{person.userRole || "User"} • {person.age} yrs</p>
                
                <button 
                  onClick={onUnlock}
                  className="mt-2 w-full py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                >
                    <Eye size={12}/> Reveal
                </button>
             </div>
          ) : (
             <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                <h3 className="text-lg font-black text-white leading-none">{person.name}, {person.age}</h3>
                <p className="text-xs font-bold text-slate-300 mt-1 flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500"/> {person.occupation || 'Member'}</p>
                
                <div className="mt-3 flex gap-2">
                    {isAlreadyMatched ? (
                        <button onClick={onAccept} className="flex-1 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                             <MessageCircle size={14}/> Chat
                        </button>
                    ) : (
                        <button onClick={onAccept} className="flex-1 py-3 bg-pink-600 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg shadow-pink-600/20 hover:scale-105 transition-transform flex items-center justify-center gap-2">
                            <Heart size={14} fill="currentColor"/> Match
                        </button>
                    )}
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

const AdUnlockModal = ({ sponsor, onComplete, onCancel }) => {
    const [timer, setTimer] = useState(10);
    
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const canClose = timer === 0;

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
                <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: 10, ease: "linear" }}
                    className={`h-full ${sponsor.bg}`}
                />
            </div>

            <div className="w-full max-w-sm bg-[#111] rounded-3xl border border-white/10 overflow-hidden relative">
                <div className="relative h-64">
                    <img src={sponsor.image} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                        Ad • Sponsored
                    </div>
                </div>

                <div className="p-6 text-center">
                    <h2 className="text-2xl font-black text-white italic uppercase">{sponsor.name}</h2>
                    <h3 className="text-sm font-bold text-slate-300 mt-1">{sponsor.title}</h3>
                    <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">"{sponsor.desc}"</p>

                    <div className="mt-8 space-y-3">
                        <button 
                            onClick={canClose ? onComplete : null}
                            disabled={!canClose}
                            className={`w-full py-4 rounded-xl border border-white/10 font-bold text-xs uppercase tracking-widest transition-all ${canClose ? 'bg-white text-black hover:scale-105' : 'bg-black text-slate-600 cursor-not-allowed'}`}
                        >
                            {canClose ? "Unlock Profile" : `Unlock in ${timer}s`}
                        </button>
                    </div>
                </div>
            </div>

            <button onClick={onCancel} className="mt-8 text-xs font-bold text-slate-500 hover:text-white transition-colors">
                Cancel
            </button>
        </motion.div>
    );
};