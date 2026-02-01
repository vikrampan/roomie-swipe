import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, X, MessageSquare, MoreVertical, ShieldAlert, HeartCrack, 
  ChevronLeft, CheckCheck, Image as ImageIcon
} from 'lucide-react';
import { subscribeToMatches, subscribeToMessages, sendMessage } from '../services/chatService'; 
import { unmatchUser } from '../services/interactionService';

export const ChatModal = ({ user, onClose }) => {
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 1. Load Matches List (Real-time)
  useEffect(() => {
    const unsub = subscribeToMatches(user.uid, (data) => {
      // Filter out "Ghost" profiles
      const validMatches = data.filter(m => m.id && m.name);
      setMatches(validMatches);
    });
    return () => unsub();
  }, [user]);

  // 2. Load Conversation
  useEffect(() => {
    if (activeMatch) {
      setMessages([]); // Clear previous chat instantly for UX
      const unsub = subscribeToMessages(activeMatch.id, (newMsgs) => {
        setMessages(newMsgs);
      });
      return () => unsub();
    }
  }, [activeMatch]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const tempText = inputText;
    setInputText(""); // Optimistic UI update
    
    try {
        await sendMessage(activeMatch.id, user.uid, tempText);
    } catch (e) {
        console.error("Failed to send");
        setInputText(tempText); // Restore on failure
    }
  };

  const handleUnmatch = async () => {
    if (window.confirm(`Unmatch with ${activeMatch.name}? This cannot be undone.`)) {
        await unmatchUser(user.uid, activeMatch.theirId);
        setActiveMatch(null);
    }
  };

  // Helper to format timestamps nicely
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div 
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col font-sans md:flex-row"
    >
      {/* --- LEFT SIDE: MATCH LIST --- */}
      <div className={`flex-1 flex flex-col bg-black/40 border-r border-white/5 ${activeMatch ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
              <h2 className="text-xl font-black italic tracking-tight">MESSAGES</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X/></button>
          </div>

          {/* Match Scroll */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            {matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-600 opacity-60">
                    <MessageSquare size={40} className="mb-2"/>
                    <span className="text-[10px] font-bold uppercase tracking-widest">No matches yet</span>
                </div>
            ) : (
                matches.map(m => (
                <motion.div 
                    layout
                    key={m.id} 
                    onClick={() => setActiveMatch(m)}
                    className={`flex items-center gap-4 p-4 mb-1 rounded-2xl cursor-pointer transition-all ${activeMatch?.id === m.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                    <div className="relative">
                        <img src={m.img} className="w-12 h-12 rounded-full object-cover bg-slate-800"/>
                        {m.hasNotification && <div className="absolute top-0 right-0 w-3 h-3 bg-pink-500 border-2 border-black rounded-full"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                            <h4 className="font-bold text-sm truncate">{m.name}</h4>
                            <span className="text-[10px] text-slate-500">{m.timestamp ? formatTime(m.timestamp) : ''}</span>
                        </div>
                        <p className={`text-xs truncate ${m.hasNotification ? 'text-white font-bold' : 'text-slate-400'}`}>
                            {m.lastMsg || "New Match! Say hi 👋"}
                        </p>
                    </div>
                </motion.div>
                ))
            )}
          </div>
      </div>

      {/* --- RIGHT SIDE: CHAT WINDOW --- */}
      {activeMatch ? (
        <div className="flex-[2] flex flex-col bg-[#080808] relative">
            
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/60 backdrop-blur-xl absolute top-0 w-full z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveMatch(null)} className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full"><ChevronLeft/></button>
                    <div className="relative">
                        <img src={activeMatch.img} className="w-10 h-10 rounded-full object-cover border border-white/10"/>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">{activeMatch.name}</h3>
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <button onClick={() => setShowOptions(!showOptions)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><MoreVertical size={20}/></button>
                        <AnimatePresence>
                            {showOptions && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute right-0 top-12 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
                                >
                                    <button onClick={handleUnmatch} className="w-full px-4 py-3 text-left text-xs font-bold text-red-400 hover:bg-white/5 flex items-center gap-2">
                                        <HeartCrack size={14}/> Unmatch
                                    </button>
                                    <button className="w-full px-4 py-3 text-left text-xs font-bold text-yellow-400 hover:bg-white/5 flex items-center gap-2">
                                        <ShieldAlert size={14}/> Report
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 pt-20 pb-4 space-y-4" ref={chatContainerRef}>
                <div className="text-center py-8 opacity-30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        You matched with {activeMatch.name} on {new Date(activeMatch.timestamp).toLocaleDateString()}
                    </p>
                </div>

                {messages.map((msg, i) => {
                    const isMe = msg.senderId === user.uid;
                    
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            key={msg.id} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isMe ? 'bg-gradient-to-br from-pink-600 to-indigo-600 text-white rounded-tr-sm' : 'bg-[#1a1a1a] border border-white/5 text-slate-200 rounded-tl-sm'}`}>
                                    {msg.text}
                                </div>
                                <div className="flex items-center gap-1 mt-1 px-1">
                                    <span className="text-[9px] font-bold text-slate-600">{formatTime(msg.timestamp)}</span>
                                    {isMe && (
                                        <CheckCheck size={12} className="text-pink-500" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-8 md:pb-4">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-full px-2 py-2 shadow-lg focus-within:border-pink-500/50 transition-colors"
                >
                    <button type="button" className="p-2 text-slate-400 hover:text-pink-500 transition-colors rounded-full hover:bg-white/5">
                        <ImageIcon size={20}/>
                    </button>
                    
                    <input 
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm px-2 placeholder:text-slate-500"
                        placeholder={`Message ${activeMatch.name}...`}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                    />
                    
                    <button 
                        type="submit" 
                        disabled={!inputText.trim()}
                        className="p-2.5 bg-pink-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-500 transition-colors shadow-lg shadow-pink-600/20"
                    >
                        <Send size={18} fill="currentColor" className="ml-0.5" />
                    </button>
                </form>
            </div>

        </div>
      ) : (
        <div className="hidden md:flex flex-[2] flex-col items-center justify-center bg-[#080808] opacity-50">
            <MessageSquare size={64} className="text-slate-700 mb-4"/>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Select a chat to start vibing</p>
        </div>
      )}
    </motion.div>
  );
};