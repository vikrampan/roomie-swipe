import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ChevronLeft, MessageCircle, Loader2, Zap, MoreVertical } from 'lucide-react';
import { subscribeToMatches, sendMessage, subscribeToMessages } from '../services/chatService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const ChatModal = ({ user, onClose }) => {
  const [view, setView] = useState("list"); 
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true); 
  const dummyScroll = useRef(null);

  useEffect(() => {
    const unsub = subscribeToMatches(user.uid, (data) => { setMatches(data); setLoading(false); });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (activeMatch) {
      if (activeMatch.hasNotification) {
        updateDoc(doc(db, "matches", activeMatch.id), { lastSenderId: user.uid });
      }
      const unsub = subscribeToMessages(activeMatch.id, (msgs) => {
        setMessages(msgs);
        setTimeout(() => dummyScroll.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsub();
    }
  }, [activeMatch]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const txt = inputText;
    setInputText("");
    await sendMessage(activeMatch.id, user.uid, txt);
  };

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
      
      {/* Dynamic Header */}
      <div className="p-6 pt-12 bg-slate-900/50 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
            {view === "chat" && (
                <button onClick={() => { setView("list"); setActiveMatch(null); }} className="p-2 bg-white/5 rounded-xl text-slate-400 active:scale-90 transition-transform">
                    <ChevronLeft size={24}/>
                </button>
            )}
            <div>
                {view === "chat" ? (
                    <div className="flex items-center gap-3">
                        <img src={activeMatch.img} className="w-10 h-10 rounded-full object-cover border border-pink-500/50" />
                        <div>
                            <h2 className="text-white font-black tracking-tight">{activeMatch.name}</h2>
                            <p className="text-[10px] text-emerald-400 font-black uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online Now
                            </p>
                        </div>
                    </div>
                ) : (
                    <h2 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-2">
                        Vibe Check <Zap size={20} className="text-pink-500 fill-pink-500"/>
                    </h2>
                )}
            </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <AnimatePresence mode='wait'>
          {view === "list" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {loading ? <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-pink-500" size={32}/></div> :
              matches.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 opacity-30">
                    <MessageCircle size={64} className="mb-4"/>
                    <p className="font-black uppercase tracking-widest text-sm">No Vibes Found Yet</p>
                 </div>
              ) : (
                matches.map(m => (
                    <motion.div 
                        whileTap={{ scale: 0.97 }} 
                        key={m.id} 
                        onClick={() => { setActiveMatch(m); setView("chat"); }} 
                        className={`relative flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${m.hasNotification ? 'bg-pink-500/10 border-pink-500/30 shadow-[0_10px_30px_rgba(236,72,153,0.1)]' : 'bg-white/5 border-white/5'}`}
                    >
                        <img src={m.img} className="w-16 h-16 rounded-[1.5rem] object-cover" />
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-white font-black text-lg tracking-tight">{m.name}</h3>
                                <span className="text-[10px] font-black text-slate-500">2:45 PM</span>
                            </div>
                            <p className={`text-sm truncate ${m.hasNotification ? "text-white font-black" : "text-slate-500"}`}>
                                {m.hasNotification ? "🔥 Sent a new message!" : (m.lastMsg || "Tap to break the ice...")}
                            </p>
                        </div>
                        {m.hasNotification && <div className="absolute top-6 right-6 w-3 h-3 bg-pink-500 rounded-full shadow-[0_0_15px_#ec4899]"></div>}
                    </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-5 py-3 rounded-[1.8rem] text-sm font-bold leading-relaxed shadow-xl ${isMe ? 'bg-gradient-to-br from-pink-600 to-rose-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'}`}>
                        {msg.text}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={dummyScroll}></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {view === "chat" && (
        <div className="p-6 bg-slate-900/80 backdrop-blur-2xl border-t border-white/5">
            <form onSubmit={handleSend} className="flex items-center gap-3 bg-slate-950 p-2 pl-5 rounded-[2rem] border border-white/10 focus-within:border-pink-500/50 transition-all shadow-inner">
                <input 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                    placeholder="Type a message..." 
                    className="flex-1 bg-transparent text-white py-3 outline-none font-bold text-sm"
                />
                <button 
                    type="submit" 
                    disabled={!inputText.trim()} 
                    className="bg-pink-600 p-4 rounded-full text-white disabled:opacity-50 active:scale-90 transition-transform shadow-lg shadow-pink-500/20"
                >
                    <Send size={20} fill="currentColor"/>
                </button>
            </form>
        </div>
      )}
    </motion.div>
  );
};