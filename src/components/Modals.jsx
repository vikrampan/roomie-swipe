import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, LogOut, Trash2, Edit3, Shield, Star, MapPin, CheckCircle, ShieldAlert, MessageCircle, Heart, Zap, Sparkles } from 'lucide-react';
import { auth } from '../firebase';
import confetti from 'canvas-confetti';

// 1. ✅ MATCH POPUP (With Confetti)
export const MatchPopup = ({ person, onClose, onChat }) => {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="w-full max-w-sm bg-slate-950 rounded-[3.5rem] p-8 border-2 border-pink-500 shadow-[0_0_80px_rgba(236,72,153,0.4)] text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-pink-500/20 blur-[100px] -z-10 animate-pulse"></div>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-4 mb-8">
                <Heart className="text-pink-500 fill-pink-500 animate-bounce" size={48} />
                <h2 className="text-5xl font-black text-white italic tracking-tighter">BOOM!</h2>
            </div>
            <div className="relative mb-8">
                <div className="absolute -inset-4 bg-pink-500/30 rounded-full blur-xl animate-pulse"></div>
                <img src={person.img} className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-white relative z-10 shadow-2xl" />
            </div>
            <p className="text-slate-300 font-bold text-lg mb-8">You and <span className="text-white underline decoration-pink-500">{person.name}</span> have matched!</p>
            <div className="w-full space-y-3">
                <button onClick={onChat} className="w-full bg-pink-600 text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-2">
                    <MessageCircle fill="currentColor"/> SEND MESSAGE
                </button>
                <button onClick={onClose} className="text-slate-500 font-black text-xs uppercase tracking-[0.2em] py-2">Maybe Later</button>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 2. ✅ PROFILE MODAL (VIP Dashboard)
export const ProfileModal = ({ user, myProfile, onClose, onDelete, onEdit }) => {
  const stats = [
    { label: "Vibes Found", value: "24", icon: <Star size={14} className="text-yellow-400"/> },
    { label: "Vibe Score", value: "92%", icon: <Zap size={14} className="text-sky-400"/> },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-slate-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
        <div className="relative h-40 bg-gradient-to-b from-pink-600 to-slate-900">
            <button onClick={onClose} className="absolute top-6 right-6 z-10 p-2 bg-black/20 backdrop-blur-md rounded-full text-white"><X size={20}/></button>
            <div className="absolute -bottom-10 left-8 flex items-end">
                <div className="relative">
                    <div className="absolute inset-0 bg-pink-500 rounded-[2rem] blur opacity-30 animate-pulse"></div>
                    <img src={user.photoURL} className="w-24 h-24 rounded-[2rem] border-4 border-slate-900 relative z-10 object-cover" />
                </div>
            </div>
        </div>
        <div className="pt-14 px-8 pb-10">
            <h2 className="text-3xl font-black text-white italic mb-1">{myProfile?.name || user.displayName}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1 mb-6">
                <MapPin size={12} className="text-pink-500"/> {myProfile?.city || "Finding your zone..."}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-3xl">
                        <div className="flex items-center gap-2 mb-1">{s.icon} <span className="text-[10px] font-black text-slate-500 uppercase">{s.label}</span></div>
                        <div className="text-xl font-black text-white">{s.value}</div>
                    </div>
                ))}
            </div>
            <div className="mb-8">
                <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span className="text-slate-500">Profile Power</span>
                    <span className="text-pink-500">85%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="h-full bg-gradient-to-r from-pink-600 to-rose-400"></motion.div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={() => onEdit(myProfile)} className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2">
                    <Edit3 size={18}/> EDIT PROFILE
                </button>
                <div className="flex gap-3">
                    <button onClick={() => auth.signOut()} className="flex-1 bg-slate-800 text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                        <LogOut size={18}/> LOGOUT
                    </button>
                    <button onClick={() => onDelete(myProfile?.id)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl"><Trash2 size={20}/></button>
                </div>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 3. ✅ DETAIL MODAL
export const DetailModal = ({ person, onClose }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl p-4 flex items-center justify-center overflow-y-auto">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-lg bg-slate-900 rounded-[3rem] overflow-hidden border border-white/10 relative shadow-2xl my-auto">
        <button onClick={onClose} className="absolute top-6 right-6 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full text-white"><X/></button>
        <div className="h-96 w-full relative">
            <img src={Array.isArray(person.images) ? person.images[0] : person.img} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        </div>
        <div className="p-8 -mt-16 relative z-10 text-white">
          <h2 className="text-4xl font-black italic mb-4">{person.name}, {person.age}</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {person.tags?.map(tag => (
              <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-slate-300">{tag}</span>
            ))}
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-pink-500 text-[10px] font-black uppercase tracking-widest mb-1">Vibe Bio</p>
              <p className="text-slate-300 leading-relaxed italic">"{person.bio || "Just a vibe waiting to happen."}"</p>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Budget</p>
                <p className="text-3xl font-black">₹{Number(person.rent).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 4. ✅ REPORT MODAL
export const ReportModal = ({ person, onConfirm, onCancel }) => {
  const reasons = ["Fake Account", "Harassment", "Inappropriate", "Spam"];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-8 border border-red-500/20 shadow-2xl">
        <div className="flex flex-col items-center text-center">
            <ShieldAlert className="text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-black text-white mb-6">Report {person.name}?</h2>
            <div className="w-full space-y-2 mb-8">
                {reasons.map(r => (
                    <button key={r} onClick={() => onConfirm(r)} className="w-full p-4 bg-white/5 hover:bg-red-500/20 border border-white/5 rounded-2xl text-slate-300 font-bold transition-all">{r}</button>
                ))}
            </div>
            <button onClick={onCancel} className="text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
};