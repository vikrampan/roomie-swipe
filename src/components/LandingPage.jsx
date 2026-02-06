import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, ShieldCheck, MessageCircle, ArrowRight, CheckCircle, Heart, 
  XCircle, BrainCircuit, MapPin, Sparkles, UserPlus, Fingerprint 
} from 'lucide-react';

// --- CONSTANTS ---
const SUCCESS_NAMES = [
  "Sakshi", "Rohit", "Aarav", "Priya", "Vikram", "Neha", "Rohan", "Ananya", "Kabir", "Meera", 
  "Aditya", "Diya", "Arjun", "Sanya", "Karan", "Ishaan", "Riya", "Varun", "Pooja", "Nikhil"
];

const SUCCESS_ACTIONS = [
  "found a roommate", "matched with a vibe", "just verified their profile", "found a flat", "started a chat"
];

export const LandingPage = ({ onLogin }) => {
  const [activeUsers, setActiveUsers] = useState(1240);
  const [notification, setNotification] = useState({ type: 'stats', text: '' });
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  useEffect(() => {
    // 1. Dynamic User Ticker (Simulates live activity)
    const countInterval = setInterval(() => {
      setActiveUsers(prev => prev + (Math.floor(Math.random() * 7) - 3));
    }, 2500);

    // 2. Dynamic Notification (Social Proof)
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

    // 3. Scroll Listener for Sticky CTA
    const handleScroll = () => {
        setShowStickyCTA(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      clearInterval(countInterval);
      clearInterval(notifInterval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-pink-500/30 flex flex-col relative">
      
      {/* 1. AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ x: [0, 30, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-pink-600/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [0, -30, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[120px]" 
        />
      </div>

      {/* 2. NAVIGATION */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Zap fill="white" className="text-white" size={20} />
          </div>
          <span className="text-xl font-black tracking-tighter italic">Roomie<span className="text-pink-500">Swipe</span></span>
        </div>
        <button onClick={onLogin} className="hidden md:block font-bold text-sm text-slate-300 hover:text-white transition-colors">
            Login
        </button>
      </nav>

      {/* 3. HERO SECTION */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-10 pb-20 max-w-7xl mx-auto w-full">
        
        {/* Trust Badge */}
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
            
            {/* Left: Copy */}
            <div className="text-left">
                <motion.h1 
                    initial={{ y: 30, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]"
                >
                    Find a Roomie <br/> who matches your <br/> 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 italic animate-text-shimmer">
                        Vibe.
                    </span>
                </motion.h1>

                <motion.p 
                    initial={{ y: 30, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-400 max-w-xl mb-10 leading-relaxed font-medium"
                >
                    Don't leave your home life to chance. We use AI to match you with people who share your lifestyle, schedule, and habits.
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

            {/* Right: Phone Demo Animation */}
            <div className="relative pointer-events-none select-none">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.5 }}
                   className="relative mx-auto w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
                         <div className="text-white font-black italic tracking-tighter">VIBE</div>
                         <div className="w-8 h-8 rounded-full bg-white/10"></div>
                    </div>

                    {/* Animated Cards */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="absolute w-[85%] h-[60%] bg-slate-800 rounded-3xl opacity-50 scale-90 translate-y-4"></div>
                        <motion.div 
                            animate={{ x: [0, 250, 0], rotate: [0, 15, 0], opacity: [1, 0, 0, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 1] }}
                            className="relative w-full h-[70%] bg-gradient-to-b from-slate-700 to-slate-800 rounded-3xl overflow-hidden border border-white/10 z-10"
                        >
                            <img 
                                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" 
                                alt="Profile" className="w-full h-full object-cover" 
                            />
                            <div className="absolute bottom-0 w-full p-5 bg-gradient-to-t from-black via-black/80 to-transparent text-left">
                                <h3 className="text-2xl font-black italic text-white leading-none mb-1">Sarah, 24</h3>
                                <p className="text-sm font-bold text-slate-300 flex items-center gap-1 mb-3"><MapPin size={12} className="text-pink-500" /> 2km away</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold text-white">Night Owl 🦉</span>
                                </div>
                            </div>
                            <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 3, times: [0, 0.3, 1], repeat: Infinity }} className="absolute top-8 left-8 border-4 border-emerald-400 text-emerald-400 font-black text-3xl px-2 rounded -rotate-12 uppercase tracking-widest">LIKE</motion.div>
                        </motion.div>
                        <motion.div animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }} transition={{ duration: 3, times: [0.4, 0.5, 0.8, 1], repeat: Infinity }} className="absolute z-30 bg-white text-black px-6 py-4 rounded-2xl font-black italic shadow-[0_0_30px_rgba(255,255,255,0.5)] flex items-center gap-2 transform rotate-2">
                            <Heart className="text-pink-600 fill-pink-600" /> IT'S A MATCH!
                        </motion.div>
                    </div>
                </motion.div>
                
                {/* 4. Live Notification Pill */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 -right-6 md:right-10 bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl max-w-xs text-left z-40 min-w-[220px]"
                >
                    <AnimatePresence mode='wait'>
                        {notification.type === 'stats' ? (
                            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                                    <span className="text-sm font-black text-white"><span className="text-emerald-400">{activeUsers.toLocaleString()}</span> online</span>
                                </div>
                                <p className="text-xs font-bold text-slate-400">finding roommates nearby.</p>
                            </motion.div>
                        ) : (
                            <motion.div key="story" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-start gap-3">
                                <div className="mt-1"><Sparkles size={16} className="text-pink-500 fill-pink-500 animate-pulse"/></div>
                                <div><p className="text-sm font-bold text-white leading-tight mb-0.5">{notification.text}</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Just Now</p></div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>

        

        {/* 4. NEW: HOW IT WORKS (Minimalist) */}
        <section className="w-full mb-32 border-y border-white/5 py-12 bg-white/5 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-2">How it Works</h2>
                    <p className="text-3xl font-black text-white italic">Three Steps to Freedom.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-4 text-pink-500">
                            <Fingerprint size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">1. Define Your Vibe</h3>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">Tell us your habits. Night owl? Vegan? Smoker? We build a "Vibe Score" unique to you.</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4 text-purple-500">
                            <BrainCircuit size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">2. Get Smart Matches</h3>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">Our algorithm filters out incompatibilities. You only see people who fit your lifestyle.</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">3. Chat & Connect</h3>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">Chat securely within the app. No phone numbers shared until you are ready to meet.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* 5. PROBLEM vs SOLUTION (Scroll Reveal) */}
        <section className="w-full mb-32 max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black italic mb-6">Stop Gambling with your Peace of Mind.</h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    Your home is your sanctuary. Why invite chaos in by using outdated, unsafe methods?
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left px-4">
                {/* Pain */}
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="p-8 md:p-12 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 grayscale hover:grayscale-0 transition-all duration-500"
                >
                    <h3 className="text-2xl font-black text-red-400 mb-8 flex items-center gap-3">
                        <XCircle size={28} /> The Old Way
                    </h3>
                    <ul className="space-y-6 text-slate-400 font-medium text-lg">
                        <li className="flex items-start gap-4"><span className="text-red-500 font-bold text-xl">✕</span> <span>Awkward interviews with strangers.</span></li>
                        <li className="flex items-start gap-4"><span className="text-red-500 font-bold text-xl">✕</span> <span>Vague descriptions like "Chill person".</span></li>
                        <li className="flex items-start gap-4"><span className="text-red-500 font-bold text-xl">✕</span> <span>Moving in & realizing you hate their music.</span></li>
                    </ul>
                </motion.div>

                {/* Pleasure */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-pink-600/10 to-indigo-600/10 border border-pink-500/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                    <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <CheckCircle size={28} className="text-emerald-400"/> The RoomieSwipe Way
                    </h3>
                    <ul className="space-y-6 text-slate-200 font-bold text-lg relative z-10">
                        <li className="flex items-start gap-4"><span className="text-emerald-400 font-bold text-xl">✓</span> <span><span className="text-pink-500">Vibe Scores™</span> based on habits.</span></li>
                        <li className="flex items-start gap-4"><span className="text-emerald-400 font-bold text-xl">✓</span> <span>See "Night Owl" or "Smoker" flags upfront.</span></li>
                        <li className="flex items-start gap-4"><span className="text-emerald-400 font-bold text-xl">✓</span> <span>Verified humans, zero bots.</span></li>
                    </ul>
                </motion.div>
            </div>
        </section>

        {/* 6. FEATURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-6xl mx-auto mb-20 px-4">
            <FeatureCard delay={0} icon={<ShieldCheck className="text-emerald-400" size={32}/>} title="Verified Profiles" desc="We filter out the fakes so you can trust who you're swiping on." />
            <FeatureCard delay={0.1} icon={<BrainCircuit className="text-pink-500" size={32}/>} title="AI Compatibility" desc="Our algorithm predicts friction points before they happen." />
            <FeatureCard delay={0.2} icon={<MessageCircle className="text-blue-400" size={32}/>} title="Secure Chat" desc="Discuss rent and rules without sharing your personal number." />
        </div>
      </main>

      {/* 7. FOOTER */}
      <footer className="relative z-10 py-10 border-t border-white/5 bg-black/40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="text-white text-sm font-black uppercase tracking-widest mb-1">RoomieSwipe</p>
            <p className="text-slate-600 text-xs">Made with ❤️ for peace of mind.</p>
          </div>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-slate-500">
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms</a>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>

      {/* 8. STICKY MOBILE CTA */}
      <AnimatePresence>
        {showStickyCTA && (
            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-0 left-0 w-full p-4 z-50 md:hidden bg-gradient-to-t from-black via-black/95 to-transparent"
            >
                <button 
                    onClick={onLogin}
                    className="w-full bg-white text-black py-4 rounded-xl font-black text-lg shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    Get Started <ArrowRight size={20}/>
                </button>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

const FeatureCard = ({ icon, title, desc, delay }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay }}
        whileHover={{ y: -5 }}
        className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-md cursor-default"
    >
        <div className="mb-6">{icon}</div>
        <h3 className="text-xl font-black italic mb-2 text-white">{title}</h3>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">{desc}</p>
    </motion.div>
);