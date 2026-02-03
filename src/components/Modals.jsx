import React, { useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { 
  X, ShieldAlert, MessageCircle, Heart, Zap, Sparkles, 
  MapPin, Moon, Users, Volume2, ShieldCheck, Mail, Building 
} from 'lucide-react';
import { auth } from '../firebase';
import confetti from 'canvas-confetti';
import { SecureImage } from './SecureImage'; // ✅ Import your secure canvas component

// --- 1. MATCH POPUP (Celebration) ---
export const MatchPopup = memo(({ person, onClose, onChat }) => {
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center relative">
        
        <motion.div 
          initial={{ scale: 0, rotate: -20 }} 
          animate={{ scale: 1, rotate: 0 }} 
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative mb-12"
        >
           <h2 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-2xl transform -rotate-6">
             IT'S A<br/>MATCH!
           </h2>
           <Sparkles className="absolute -top-8 -right-8 text-yellow-400 animate-pulse" size={48} fill="currentColor"/>
        </motion.div>

        {/* Profile Pictures overlapping using SecureImage */}
        <div className="flex items-center justify-center mb-12 relative h-32 w-full">
            <div className="w-28 h-28 rounded-full border-4 border-black absolute z-10 shadow-2xl overflow-hidden -translate-x-5">
                <SecureImage 
                  src={auth.currentUser?.photoURL} 
                  className="w-full h-full"
                />
            </div>
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} 
              className="z-20 bg-white p-2 rounded-full shadow-xl absolute"
            >
               <Heart size={24} className="text-pink-600 fill-pink-600"/>
            </motion.div>
            <div className="w-28 h-28 rounded-full border-4 border-black absolute z-10 shadow-2xl overflow-hidden translate-x-5">
                <SecureImage 
                  src={person.img} 
                  className="w-full h-full"
                />
            </div>
        </div>

        <p className="text-slate-300 text-sm font-medium mb-8 max-w-[200px] leading-relaxed">
          You and <span className="text-white font-bold">{person.name}</span> vibe with each other!
        </p>

        <button 
          onClick={onChat} 
          className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
            <MessageCircle fill="currentColor" size={20}/> SAY HELLO
        </button>
        <button 
          onClick={onClose} 
          className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
        >
            Keep Swiping
        </button>
      </div>
    </motion.div>
  );
});

// --- 2. DETAIL MODAL (Full Profile View) ---
export const DetailModal = memo(({ person, onClose }) => {
  // Select the cover image source
  const coverImageSrc = (person.userRole === 'host' && person.roomImages?.length > 0) 
    ? person.roomImages[0] 
    : (person.images?.[0] || person.img);

  // Merge all available photos for the gallery
  const galleryImages = [...(person.roomImages || []), ...(person.images || [])];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[100] bg-black/95 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full h-[95vh] sm:h-[85vh] sm:max-w-md bg-[#0a0a0a] sm:rounded-[3rem] rounded-t-[3rem] overflow-hidden relative shadow-2xl flex flex-col"
      >
        <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2.5 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all">
            <X size={20}/>
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide relative bg-[#0a0a0a]">
            
            {/* HERO COVER IMAGE - PROTECTED BY CANVAS */}
            <div className="h-[50vh] w-full relative">
                <SecureImage 
                    src={coverImageSrc} 
                    className="w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"/>
                <div className="absolute bottom-0 left-0 p-8 w-full pointer-events-none">
                    <h1 className="text-4xl font-black italic text-white tracking-tighter drop-shadow-lg mb-2">
                        {person.name} <span className="text-2xl not-italic font-medium text-slate-400">{person.age}</span>
                    </h1>
                    
                    <div className="flex items-center gap-2 mb-2">
                        {person.isPhoneVerified && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-bold uppercase flex items-center gap-1">
                                <ShieldCheck size={10}/> Phone Verified
                            </span>
                        )}
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md text-[10px] font-bold uppercase flex items-center gap-1">
                            <Mail size={10}/> Email Verified
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-white/80 uppercase tracking-wide">
                        <MapPin size={14} className="text-pink-500"/> {person.city} • {person.distance || '2'} km
                    </div>
                </div>
            </div>

            {/* CONTENT BODY */}
            <div className="px-8 pb-12 space-y-8">
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/5 p-4 rounded-3xl">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Rent</p>
                        <p className="text-2xl font-black text-white">₹{Number(person.rent).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-3xl">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                            {person.userRole === 'host' ? 'Furnishing' : 'Work'}
                        </p>
                        <p className="text-sm font-bold text-white truncate">
                            {person.userRole === 'host' ? person.furnishing : (person.occupation || 'Student')}
                        </p>
                    </div>
                </div>

                {person.userRole === 'host' && (
                    <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-3xl">
                        <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Building size={12}/> Property Info
                        </h3>
                        <div className="space-y-2 text-sm">
                            <p className="flex justify-between text-slate-300">
                                <span>Society:</span> <span className="text-white font-bold">{person.societyName || 'Not Listed'}</span>
                            </p>
                            <p className="flex justify-between text-slate-300">
                                <span>Available:</span> <span className="text-white font-bold">{person.availableFrom || 'Immediately'}</span>
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">About</h3>
                    <p className="text-slate-200 text-lg leading-relaxed font-medium">"{person.bio || "Just a vibe waiting to happen."}"</p>
                </div>

                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">My Vibe</h3>
                    <div className="flex flex-wrap gap-2">
                        {person.tags?.map(tag => (
                            <span key={tag} className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 rounded-2xl text-xs font-bold text-slate-300 flex items-center gap-2">
                                <Zap size={12} className="text-yellow-400"/> {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Lifestyle Check</h3>
                    <div className="space-y-4">
                        <DetailRow icon={<Moon size={16}/>} label="Schedule" value={person.schedule} />
                        <DetailRow icon={<Sparkles size={16}/>} label="Cleanliness" value={person.cleanliness} />
                        <DetailRow icon={<Users size={16}/>} label="Social Battery" value={person.socialVibe} />
                        <DetailRow icon={<Volume2 size={16}/>} label="Noise Level" value={person.noiseLevel} />
                        <DetailRow icon={<MessageCircle size={16}/>} label="Guests" value={person.guestPolicy} />
                    </div>
                </div>

                {/* PHOTO GALLERY - ALL IMAGES PROTECTED BY SECUREIMAGE CANVAS */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                    {galleryImages.map((img, i) => (
                        <SecureImage 
                            key={i} 
                            src={img} 
                            className="w-full h-48 rounded-3xl border border-white/5 bg-white/5" 
                        />
                    ))}
                </div>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

const DetailRow = ({ icon, label, value }) => (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
        <span className="flex items-center gap-3 text-sm font-medium text-slate-400">
            {icon} {label}
        </span>
        <span className="text-sm font-bold text-white capitalize">{value || "Not Set"}</span>
    </div>
);

// --- 3. REPORT MODAL ---
export const ReportModal = memo(({ person, onConfirm, onCancel }) => {
  const reasons = ["Fake Profile", "Scam / Spam", "Inappropriate", "Harassment"];
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9 }} 
        animate={{ scale: 1 }} 
        className="w-full max-w-xs bg-[#111] rounded-[2.5rem] p-6 border border-red-900/30"
      >
        <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Report User</h2>
            <p className="text-slate-500 text-xs mt-2">Help us keep the community safe.</p>
        </div>
        <div className="space-y-2 mb-6">
            {reasons.map(r => (
                <button 
                  key={r} 
                  onClick={() => onConfirm(r)} 
                  className="w-full py-3 px-4 bg-white/5 hover:bg-red-500/20 border border-white/5 rounded-xl text-left text-sm font-medium text-slate-300 hover:text-red-400 transition-all"
                >
                  {r}
                </button>
            ))}
        </div>
        <button 
          onClick={onCancel} 
          className="w-full py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
});