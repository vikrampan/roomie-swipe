import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, LogOut, Trash2, Edit3, ShieldAlert, MessageCircle, Heart, Zap, Sparkles, 
  MapPin, Moon, Sun, Coffee, Music, Volume2, Users, Clock, Cigarette, Wine
} from 'lucide-react';
import { auth } from '../firebase';
import confetti from 'canvas-confetti';

// --- 1. MATCH POPUP (Celebration) ---
export const MatchPopup = ({ person, onClose, onChat }) => {
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center relative">
        <motion.div 
          initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} 
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative mb-12"
        >
           <h2 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-2xl transform -rotate-6">
             IT'S A<br/>MATCH!
           </h2>
           <Sparkles className="absolute -top-8 -right-8 text-yellow-400 animate-pulse" size={48} fill="currentColor"/>
        </motion.div>

        <div className="flex items-center justify-center mb-12 relative h-32 w-full">
            <motion.img 
              initial={{ x: -100, opacity: 0 }} animate={{ x: -20, opacity: 1 }} 
              src={auth.currentUser?.photoURL} 
              className="w-28 h-28 rounded-full border-4 border-black object-cover absolute z-10 shadow-2xl"
            />
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} 
              className="z-20 bg-white p-2 rounded-full shadow-xl absolute"
            >
               <Heart size={24} className="text-pink-600 fill-pink-600"/>
            </motion.div>
            <motion.img 
              initial={{ x: 100, opacity: 0 }} animate={{ x: 20, opacity: 1 }} 
              src={person.img} 
              className="w-28 h-28 rounded-full border-4 border-black object-cover absolute z-10 shadow-2xl"
            />
        </div>

        <p className="text-slate-300 text-sm font-medium mb-8 max-w-[200px] leading-relaxed">
          You and <span className="text-white font-bold">{person.name}</span> vibe with each other!
        </p>

        <button onClick={onChat} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform">
            <MessageCircle fill="currentColor" size={20}/> SAY HELLO
        </button>
        <button onClick={onClose} className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
            Keep Swiping
        </button>
      </div>
    </motion.div>
  );
};

// --- 2. DETAIL MODAL (Fixed Missing Details) ---
export const DetailModal = ({ person, onClose }) => {
  const mainImage = (person.images && person.images.length > 0) ? person.images[0] : person.img;

  // Helper for rows
  const DetailRow = ({ icon, label, value }) => (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
        <span className="flex items-center gap-3 text-sm font-medium text-slate-400">
            {icon} {label}
        </span>
        <span className="text-sm font-bold text-white capitalize">{value || "Not Set"}</span>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[100] bg-black/95 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full h-[90vh] sm:h-[85vh] sm:max-w-md bg-[#0a0a0a] sm:rounded-[3rem] rounded-t-[3rem] overflow-hidden relative shadow-2xl flex flex-col"
      >
        <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2.5 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all">
            <X size={20}/>
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide relative">
            
            {/* HERO IMAGE */}
            <div className="h-[50vh] w-full relative">
                <img src={mainImage} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"/>
                <div className="absolute bottom-0 left-0 p-8 w-full">
                    <h1 className="text-5xl font-black italic text-white tracking-tighter drop-shadow-lg mb-2">
                        {person.name} <span className="text-3xl not-italic font-medium text-slate-400">{person.age}</span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm font-bold text-white/80 uppercase tracking-wide">
                        <MapPin size={14} className="text-pink-500"/> {person.city} • {person.distance || '2'} km away
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="px-8 pb-12 space-y-8 bg-[#0a0a0a]">
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/5 p-4 rounded-3xl">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Budget</p>
                        <p className="text-2xl font-black text-white">₹{Number(person.rent).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-3xl">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Work</p>
                        <p className="text-lg font-bold text-white truncate">{person.occupation || 'Student'}</p>
                    </div>
                </div>

                {/* About */}
                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">About Me</h3>
                    <p className="text-slate-200 text-lg leading-relaxed font-medium">"{person.bio || "Just a vibe waiting to happen."}"</p>
                </div>

                {/* Tags */}
                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">My Vibe</h3>
                    <div className="flex flex-wrap gap-2">
                        {person.tags?.map(tag => (
                            <span key={tag} className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 rounded-2xl text-xs font-bold text-slate-300 flex items-center gap-2">
                                <Zap size={12} className="text-yellow-400"/> {tag}
                            </span>
                        ))}
                        {(!person.tags || person.tags.length === 0) && <span className="text-slate-500 text-sm italic">No vibe tags yet.</span>}
                    </div>
                </div>

                {/* LIFESTYLE (The Missing Part) */}
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

                {/* Extra Photos */}
                {person.images && person.images.length > 1 && (
                    <div className="grid grid-cols-2 gap-3 pt-4">
                        {person.images.slice(1).map((img, i) => (
                            <img key={i} src={img} className="w-full h-48 object-cover rounded-3xl border border-white/5" />
                        ))}
                    </div>
                )}
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- 3. PROFILE SETTINGS ---
export const ProfileModal = ({ user, myProfile, onClose, onDelete, onEdit }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 pt-10 text-center">
            <div className="relative inline-block mb-6">
                <img src={user.photoURL} className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-black shadow-2xl" />
                <div className="absolute -bottom-2 -right-2 bg-pink-600 p-2 rounded-xl border-4 border-[#0a0a0a]">
                    <Edit3 size={16} className="text-white"/>
                </div>
            </div>
            
            <h2 className="text-2xl font-black text-white italic tracking-tight mb-1">{myProfile?.name || user.displayName}</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">{myProfile?.city || "Location Pending"}</p>

            <div className="space-y-3">
                <button onClick={() => onEdit(myProfile)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors">
                    <Edit3 size={18}/> Edit Profile
                </button>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => auth.signOut()} className="bg-slate-900 border border-white/5 text-slate-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                        <LogOut size={18}/> Logout
                    </button>
                    <button onClick={() => onDelete(myProfile?.id)} className="bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors">
                        <Trash2 size={18}/> Delete
                    </button>
                </div>
            </div>
            <button onClick={onClose} className="mt-8 text-slate-600 font-bold text-xs uppercase tracking-widest hover:text-white">Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- 4. REPORT MODAL ---
export const ReportModal = ({ person, onConfirm, onCancel }) => {
  const reasons = ["Fake Profile", "Scam / Spam", "Inappropriate", "Harassment"];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-xs bg-[#111] rounded-[2.5rem] p-6 border border-red-900/30">
        <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4"><ShieldAlert className="text-red-500" size={32} /></div>
            <h2 className="text-xl font-bold text-white">Report User</h2>
            <p className="text-slate-500 text-xs mt-2">Help us keep the community safe.</p>
        </div>
        <div className="space-y-2 mb-6">
            {reasons.map(r => (
                <button key={r} onClick={() => onConfirm(r)} className="w-full py-3 px-4 bg-white/5 hover:bg-red-500/20 border border-white/5 rounded-xl text-left text-sm font-medium text-slate-300 hover:text-red-400 transition-all">{r}</button>
            ))}
        </div>
        <button onClick={onCancel} className="w-full py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white">Cancel</button>
      </motion.div>
    </motion.div>
  );
};