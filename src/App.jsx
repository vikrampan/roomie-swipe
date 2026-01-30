import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, db, provider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { Card, AdCard } from './components/Cards';
import { ChatModal } from './components/Chat';
import { ProfileModal, MatchPopup, DetailModal, ReportModal } from './components/Modals';
import { CreateProfileForm } from './components/Forms';
import { triggerHaptic } from './services/utils';
import { MessageCircle, User, Loader2, Zap, Sparkles, ShieldCheck, MapPin, Search } from 'lucide-react';

// --- NEW COMPONENT: LANDING PAGE (FOR GOOGLE ADSENSE APPROVAL) ---
const LandingPage = ({ onLogin }) => (
  <div className="min-h-screen bg-black text-white selection:bg-pink-500">
    {/* Navigation */}
    <nav className="max-w-6xl mx-auto p-6 flex justify-between items-center border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
          <Zap size={18} fill="white"/>
        </div>
        <h1 className="text-xl font-black italic tracking-tighter">VIBE.</h1>
      </div>
      <button onClick={onLogin} className="bg-white text-black px-6 py-2.5 rounded-2xl font-black text-sm hover:scale-105 transition-transform active:scale-95">
        LOGIN
      </button>
    </nav>

    {/* Hero Section */}
    <header className="max-w-4xl mx-auto px-6 py-24 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tighter italic">
          BETTER LIVING <br/>
          <span className="text-pink-600 text-glow">TOGETHER.</span>
        </h2>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium mb-12">
          The first lifestyle-first roommate finder in India. Match with roommates based on your budget, sleeping habits, and lifestyle vibe. No brokers. No spam. Just vibes.
        </p>
        <button onClick={onLogin} className="group relative bg-pink-600 px-10 py-5 rounded-[2rem] font-black text-xl shadow-[0_0_40px_rgba(236,72,153,0.3)] hover:scale-105 transition-all">
          FIND YOUR ROOMMATE
          <div className="absolute inset-0 rounded-[2rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
        </button>
      </motion.div>
    </header>

    {/* SEO Features Section (Bots love this) */}
    <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8">
      {[
        { icon: <MapPin className="text-pink-500"/>, title: "Location Based", desc: "Find roommates in Dehradun, Roorkee, Delhi, and across India near your college or office." },
        { icon: <ShieldCheck className="text-sky-500"/>, title: "Verified Profiles", desc: "Every user is verified via Google authentication to ensure safety and authenticity." },
        { icon: <Sparkles className="text-yellow-500"/>, title: "Lifestyle Match", desc: "Are you a clean freak or a party animal? Our algorithm matches your lifestyle exactly." }
      ].map((f, i) => (
        <div key={i} className="p-10 bg-white/5 rounded-[3rem] border border-white/10 hover:border-white/20 transition-colors">
          <div className="mb-6">{f.icon}</div>
          <h3 className="text-xl font-black mb-4 uppercase tracking-tighter italic">{f.title}</h3>
          <p className="text-slate-500 font-bold leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </section>

    {/* Footer with Mandatory AdSense Links */}
    <footer className="max-w-6xl mx-auto p-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
      <p className="text-slate-600 font-bold text-xs uppercase tracking-widest">© 2026 Vibe Roommate Finder India</p>
      <div className="flex gap-8 text-[10px] font-black uppercase text-slate-500 tracking-widest">
        <a href="/privacy.html" className="hover:text-pink-500 transition-colors">Privacy Policy</a>
        <a href="/terms.html" className="hover:text-pink-500 transition-colors">Terms of Service</a>
        <a href="mailto:support@vibeapp.in" className="hover:text-pink-500 transition-colors">Support</a>
      </div>
    </footer>
  </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('swipe');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [reportingPerson, setReportingPerson] = useState(null);
  const [matchData, setMatchData] = useState(null);

  useEffect(() => {
    return auth.onAuthStateChanged(u => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubMe = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setMyProfile(doc.exists() ? { id: doc.id, ...doc.data() } : null);
    });

    const q = query(collection(db, "users"), where("__name__", "!=", user.uid));
    const unsubPeople = onSnapshot(q, (snapshot) => {
      setPeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubMe(); unsubPeople(); };
  }, [user]);

  const swipeStack = useMemo(() => {
    let list = [...people];
    if (list.length >= 2) {
      list.splice(2, 0, { 
        id: 'ad-premium', 
        isAd: true, 
        title: "Stop Swiping, Start Living", 
        desc: "Unlock Premium to see everyone who vibed with your profile.",
        cta: "GET PREMIUM"
      });
    }
    return list.reverse();
  }, [people]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const onSwipe = async (direction, item) => {
    triggerHaptic(direction === 'right' ? 'success' : 'light');
    if (item.isAd && direction === 'right') {
      alert("Opening Premium Benefits...");
      return;
    }
    console.log(`Swiped ${direction} on ${item.name || 'Ad'}`);
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-pink-600 animate-spin" size={40} />
    </div>
  );

  // If not logged in, show the SEO-friendly landing page
  if (!user) return <LandingPage onLogin={handleLogin} />;

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black to-transparent">
        <button onClick={() => setActiveTab('profile')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-transform">
          <User size={24} />
        </button>
        <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
          VIBE <Zap size={20} className="text-pink-500 fill-pink-500"/>
        </h1>
        <button onClick={() => setActiveTab('chat')} className="p-3 bg-white/5 rounded-2xl border border-white/10 relative active:scale-90 transition-transform">
          <MessageCircle size={24} />
          <div className="absolute top-2 right-2 w-3 h-3 bg-pink-600 rounded-full border-2 border-black"></div>
        </button>
      </div>

      {/* Card Stack */}
      <div className="flex-1 relative flex justify-center items-center p-4">
        <AnimatePresence>
          {swipeStack.map((item) => (
            item.isAd ? (
              <AdCard key={item.id} adData={item} onSwipe={onSwipe} />
            ) : (
              <Card 
                key={item.id} 
                person={item} 
                myProfile={myProfile}
                onSwipe={onSwipe} 
                onInfo={setSelectedPerson} 
                onReport={setReportingPerson}
              />
            )
          ))}
        </AnimatePresence>

        {people.length === 0 && !loading && (
          <div className="text-center opacity-30">
            <Search size={64} className="mx-auto mb-4 text-slate-500" />
            <p className="font-black uppercase tracking-widest text-sm italic">Searching your area...</p>
          </div>
        )}
      </div>

      {/* Navigation Modals */}
      <AnimatePresence>
        {activeTab === 'profile' && (
          <ProfileModal 
            user={user} 
            myProfile={myProfile} 
            onClose={() => setActiveTab('swipe')} 
            onEdit={() => setShowProfileForm(true)}
          />
        )}
        {activeTab === 'chat' && <ChatModal user={user} onClose={() => setActiveTab('swipe')} />}
        {showProfileForm && <CreateProfileForm user={user} existingData={myProfile} onCancel={() => setShowProfileForm(false)} />}
        {selectedPerson && <DetailModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
        {reportingPerson && <ReportModal person={reportingPerson} onConfirm={() => setReportingPerson(null)} onCancel={() => setReportingPerson(null)} />}
        {matchData && <MatchPopup person={matchData} onClose={() => setMatchData(null)} />}
      </AnimatePresence>
    </div>
  );
}