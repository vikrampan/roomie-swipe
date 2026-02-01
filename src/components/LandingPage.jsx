import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldCheck, MessageCircle, ArrowRight, CheckCircle, Heart, XCircle, BrainCircuit, MapPin, Sparkles } from 'lucide-react';

const SUCCESS_NAMES = [
  "Sakshi", "Rohit", "Aarav", "Priya", "Vikram", "Neha", "Rohan", "Ananya", "Kabir", "Meera", 
  "Aditya", "Diya", "Arjun", "Sanya", "Karan", "Ishaan", "Riya", "Varun", "Pooja", "Nikhil"
];

const SUCCESS_ACTIONS = [
  "found a roommate", "matched with a vibe", "just verified their profile", "found a flat", "started a chat"
];

export const LandingPage = ({ onLogin }) => {
  // Dynamic State for "Live" numbers and notifications
  const [activeUsers, setActiveUsers] = useState(1240);
  const [notification, setNotification] = useState({ type: 'stats', text: '' });

  useEffect(() => {
    // 1. Dynamic User Count Ticker (Fluctuates slightly to look real)
    const countInterval = setInterval(() => {
      setActiveUsers(prev => {
        const change = Math.floor(Math.random() * 7) - 3; // Randomly add/subtract 0-3
        return prev + change;
      });
    }, 2500);

    // 2. Dynamic Success Notifications (Cycles names)
    const notifInterval = setInterval(() => {
      const isStats = Math.random() > 0.5;
      
      if (isStats) {
        setNotification({ type: 'stats' });
      } else {
        const name = SUCCESS_NAMES[Math.floor(Math.random() * SUCCESS_NAMES.length)];
        const action = SUCCESS_ACTIONS[Math.floor(Math.random() * SUCCESS_ACTIONS.length)];
        setNotification({ type: 'story', text: `${name} ${action}` });
      }
    }, 4000);

    return () => {
      clearInterval(countInterval);
      clearInterval(notifInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-pink-500/30 flex flex-col">
      
      {/* 1. Animated Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-pink-600/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], rotate: [0, -60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[120px]" 
        />
      </div>

      {/* 2. Navigation Bar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Zap fill="white" className="text-white" size={20} />
          </div>
          <span className="text-xl font-black tracking-tighter italic">Roomie<span className="text-pink-500">Swipe</span></span>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-10 pb-20 max-w-7xl mx-auto w-full">
        
        {/* Badge */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">#1 Roommate Finder App</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full mb-24">
            
            {/* Left: Text Content */}
            <div className="text-left">
                <motion.h1 
                    initial={{ y: 30, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]"
                >
                    Find a Roomie <br/> who matches your <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 italic">Vibe.</span>
                </motion.h1>

                <motion.p 
                    initial={{ y: 30, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-400 max-w-xl mb-10 leading-relaxed font-medium"
                >
                    Stop scrolling through boring classifieds. We use AI to match you with people who share your lifestyle, budget, and habits.
                </motion.p>

                <motion.div 
                    initial={{ y: 30, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4"
                >
                    <button 
                        onClick={onLogin}
                        className="group relative px-8 py-4 bg-white text-black rounded-2xl font-black text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                        Start Swiping <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                </motion.div>
            </div>

            {/* Right: The "How it Works" Animation */}
            <div className="relative">
                {/* Simulated App Interface Animation */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.5 }}
                   className="relative mx-auto w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 shadow-2xl overflow-hidden"
                >
                    {/* Fake Header */}
                    <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
                         <div className="text-white font-black italic">VIBE</div>
                         <div className="w-8 h-8 rounded-full bg-white/10"></div>
                    </div>

                    {/* Animated Card Stack */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        {/* Background Card */}
                        <div className="absolute w-[85%] h-[60%] bg-slate-800 rounded-3xl opacity-50 scale-90 translate-y-4"></div>
                        
                        {/* Active Card Animation */}
                        <motion.div 
                            animate={{ 
                                x: [0, 200, 0, -200, 0], 
                                rotate: [0, 10, 0, -10, 0],
                                opacity: [1, 0, 0, 0, 1] 
                            }}
                            transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 0.21, 0.4, 1] }}
                            className="relative w-full h-[70%] bg-gradient-to-b from-slate-700 to-slate-800 rounded-3xl overflow-hidden border border-white/10"
                        >
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=60" className="w-full h-full object-cover" />
                            
                            {/* Detailed Card Info */}
                            <div className="absolute bottom-0 w-full p-5 bg-gradient-to-t from-black via-black/80 to-transparent text-left">
                                <h3 className="text-2xl font-black italic text-white leading-none mb-1">Sarah, 24</h3>
                                <p className="text-sm font-bold text-slate-300 flex items-center gap-1 mb-3">
                                    <MapPin size={12} className="text-pink-500" /> 2km away
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold text-white">
                                        Early Bird 🌅
                                    </span>
                                    <span className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold text-white">
                                        Non-Smoker 🚭
                                    </span>
                                </div>
                            </div>

                            {/* "LIKE" Stamp Animation */}
                            <motion.div 
                                animate={{ opacity: [0, 1, 0, 0, 0], scale: [0.5, 1.2, 1, 0, 0] }}
                                transition={{ duration: 4, times: [0, 0.1, 0.3, 0.4, 1], repeat: Infinity }}
                                className="absolute top-8 left-8 border-4 border-green-400 text-green-400 font-black text-2xl px-2 rounded -rotate-12 uppercase"
                            >
                                LIKE
                            </motion.div>
                        </motion.div>

                        {/* Match Popup Animation */}
                        <motion.div 
                            animate={{ scale: [0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 0] }}
                            transition={{ duration: 4, times: [0, 0.2, 0.25, 0.8, 1], repeat: Infinity }}
                            className="absolute z-30 bg-white text-black px-6 py-3 rounded-2xl font-black italic shadow-xl flex items-center gap-2"
                        >
                            <Heart className="text-pink-600 fill-pink-600" /> IT'S A MATCH!
                        </motion.div>
                    </div>

                    {/* Fake Chat Message Animation */}
                    <motion.div 
                        animate={{ y: [100, 100, 0, 0, 100] }}
                        transition={{ duration: 4, times: [0, 0.4, 0.5, 0.8, 1], repeat: Infinity }}
                        className="absolute bottom-4 left-4 right-4 bg-slate-800 p-3 rounded-2xl border border-white/10 flex items-center gap-3 z-30"
                    >
                         <div className="w-8 h-8 rounded-full bg-pink-500"></div>
                         <div>
                             <div className="h-2 w-20 bg-slate-600 rounded mb-1"></div>
                             <div className="h-2 w-32 bg-slate-700 rounded"></div>
                         </div>
                    </motion.div>
                </motion.div>
                
                {/* 4. DYNAMIC FLOATING NOTIFICATION */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 -right-6 md:right-10 bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl max-w-xs text-left z-40 min-w-[200px]"
                >
                    <AnimatePresence mode='wait'>
                        {notification.type === 'stats' ? (
                            <motion.div 
                                key="stats"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-sm font-black text-white">
                                        <span className="text-emerald-400">{activeUsers.toLocaleString()}</span> people
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-slate-400">are finding Roommates nearby.</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="story"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-start gap-3"
                            >
                                <div className="mt-1"><Sparkles size={16} className="text-pink-500 fill-pink-500 animate-pulse"/></div>
                                <div>
                                    <p className="text-sm font-bold text-white leading-tight mb-0.5">{notification.text}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Just Now</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>

        {/* 5. Psychological "Problem vs Solution" Section */}
        <section className="w-full mb-32">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black italic mb-6">Stop Gambling with your Peace of Mind.</h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    Your home is your sanctuary. Why invite chaos in by using outdated, unsafe methods?
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">
                {/* The Old Way (Pain) */}
                <div className="p-8 md:p-12 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 grayscale hover:grayscale-0 transition-all duration-500 group">
                    <h3 className="text-2xl font-black text-red-400 mb-8 flex items-center gap-3">
                        <XCircle size={28} /> The Old Way
                    </h3>
                    <ul className="space-y-6 text-slate-400 font-medium text-lg">
                        <li className="flex items-start gap-4">
                            <span className="text-red-500 font-bold text-xl">✕</span> 
                            <span>Awkward interviews with strangers that feel like interrogations.</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="text-red-500 font-bold text-xl">✕</span> 
                            <span>Vague descriptions like "Chill person" (spoiler: they aren't).</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="text-red-500 font-bold text-xl">✕</span> 
                            <span>Moving in & realizing you have zero lifestyle compatibility.</span>
                        </li>
                    </ul>
                </div>

                {/* The RoomieSwipe Way (Pleasure) */}
                <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-pink-600/10 to-indigo-600/10 border border-pink-500/20 relative overflow-hidden">
                    {/* Glow Effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <CheckCircle size={28} className="text-emerald-400"/> The RoomieSwipe Way
                    </h3>
                    <ul className="space-y-6 text-slate-200 font-bold text-lg relative z-10">
                        <li className="flex items-start gap-4">
                            <span className="text-emerald-400 font-bold text-xl">✓</span> 
                            <span><span className="text-pink-500">Vibe Scores™</span> based on actual habit data, not just budget.</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="text-emerald-400 font-bold text-xl">✓</span> 
                            <span>See flags like "Night Owl" or "Smoker" *before* you say hello.</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="text-emerald-400 font-bold text-xl">✓</span> 
                            <span>Secure, anxiety-free connection with verified humans.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        {/* 6. Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-6xl mx-auto">
            <FeatureCard 
                icon={<ShieldCheck className="text-emerald-400" size={32}/>}
                title="Verified Profiles"
                desc="We filter out the fakes so you can trust who you're swiping on."
            />
             <FeatureCard 
                icon={<BrainCircuit className="text-pink-500" size={32}/>}
                title="AI Compatibility"
                desc="Our algorithm predicts friction points before they happen."
            />
             <FeatureCard 
                icon={<MessageCircle className="text-blue-400" size={32}/>}
                title="Secure Chat"
                desc="Discuss rent and rules without sharing your personal number."
            />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
            &copy; 2024 RoomieSwipe Inc.
          </p>
          <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-slate-500">
            <a href="/terms.html" target="_blank" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/privacy.html" target="_blank" className="hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-md">
        <div className="mb-6">{icon}</div>
        <h3 className="text-xl font-black italic mb-2 text-white">{title}</h3>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
);