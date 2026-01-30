import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, MapPin, Loader2, MessageCircle, Sparkles, Zap, Flame } from 'lucide-react'; 
import { onSnapshot, doc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase'; 

import { loginUser } from './services/authService';
import { getNearbyUsers } from './services/feedService';
import { swipeRight, swipeLeft, reportUser } from './services/interactionService';
import { deleteMyProfile } from './services/profileService';
import { subscribeToUnreadCount } from './services/chatService';

import { Toast, LoginScreen } from './components/Shared';
import { Card, AdCard } from './components/Cards';
import { MatchPopup, ReportModal, DetailModal, ProfileModal } from './components/Modals';
import { CreateProfileForm } from './components/Forms';
import { ChatModal } from './components/Chat'; 

export default function App() {
  const [user, setUser] = useState(null); 
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false); 
  const swipedIdsRef = useRef(new Set()); 

  const [match, setMatch] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null); 
  const [showProfile, setShowProfile] = useState(false);
  const [showChat, setShowChat] = useState(false); 
  const [toast, setToast] = useState(null);
  const [reportingPerson, setReportingPerson] = useState(null); 
  const [infoPerson, setInfoPerson] = useState(null);
  
  const [searchRadius, setSearchRadius] = useState(() => Number(localStorage.getItem('roomie_radius')) || 50);
  const [maxRent, setMaxRent] = useState(50000); 
  const [genderFilter, setGenderFilter] = useState("All"); 
  const [blockedUsers, setBlockedUsers] = useState(() => JSON.parse(localStorage.getItem('roomie_blocks')) || []); 
  const [browsingLocation, setBrowsingLocation] = useState(null);
  const [locationName, setLocationName] = useState("Locating...");

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const triggerHaptic = (type = 'light') => {
    if (!window.navigator.vibrate) return;
    if (type === 'success') window.navigator.vibrate([50, 30, 50]);
    else window.navigator.vibrate(10);
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoadingAuth(false); });
  }, []);

  useEffect(() => {
    if (user) {
      const unsubProfile = onSnapshot(doc(db, "profiles", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setMyProfile(data);
          if (data.lat && data.lng) {
            setBrowsingLocation({ lat: data.lat, lng: data.lng });
            setLocationName(data.city || "My Location");
          }
        } else setMyProfile(null);
      });
      const unsubUnread = subscribeToUnreadCount(user.uid, (count) => setTotalUnread(count));
      return () => { unsubProfile(); unsubUnread(); };
    }
  }, [user]);

  const loadDeck = async () => {
    if (!user || !browsingLocation) return;
    setLoadingMore(true);
    try {
      const profiles = await getNearbyUsers(user, browsingLocation, searchRadius, { gender: genderFilter }, blockedUsers);
      const budgetMatches = profiles.filter(p => Number(p.rent) <= maxRent);
      const freshProfiles = budgetMatches.filter(p => !swipedIdsRef.current.has(p.id));
      
      let deck = [];
      freshProfiles.forEach((p, i) => {
        deck.push({ ...p, type: 'profile' });
        if ((i + 1) % 5 === 0) deck.push({ id: `ad-${i}`, type: 'ad' });
      });
      setFilteredCards(deck);
    } catch (e) { console.error(e); }
    setLoadingMore(false);
  };

  useEffect(() => { 
    if (browsingLocation) {
      localStorage.setItem('roomie_radius', searchRadius); 
      swipedIdsRef.current.clear(); 
      loadDeck(); 
    }
  }, [user?.uid, browsingLocation, searchRadius, genderFilter, maxRent, blockedUsers.length]);

  const handleSwipe = async (dir, item) => {
    if (item.type === 'ad') return;
    if (!myProfile) { triggerHaptic(); showToast("Tell us who you are first! 👤", "error"); setShowForm(true); return; }
    
    triggerHaptic();
    swipedIdsRef.current.add(item.id);
    try {
      if (dir === 'right') {
        const res = await swipeRight(user.uid, item.uid);
        if (res.isMatch) { triggerHaptic('success'); setMatch(item); }
      } else await swipeLeft(user.uid, item.uid);
    } catch (e) { console.error(e); }
  };

  if (loadingAuth) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950"><Loader2 className="animate-spin text-pink-500 w-12 h-12"/></div>;
  if (!user) return <LoginScreen onLogin={loginUser} />;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] font-sans fixed inset-0 overflow-hidden text-slate-100">
      <AnimatePresence mode='wait'>
        {match && <MatchPopup person={match} onClose={() => setMatch(null)} onChat={() => { setMatch(null); setShowChat(true); }} />}
        {infoPerson && <DetailModal person={infoPerson} onClose={() => setInfoPerson(null)} />}
        {showForm && <CreateProfileForm user={user} existingData={editingProfile} onCancel={() => { setShowForm(false); setEditingProfile(null); }} showToast={showToast} />}
        {showProfile && <ProfileModal user={user} myProfile={myProfile} onClose={() => setShowProfile(false)} onDelete={async (id) => { if(window.confirm("Delete profile?")) { await deleteMyProfile(id); setShowProfile(false); }}} onEdit={(p) => { setEditingProfile(p); setShowProfile(false); setShowForm(true); }} />}
        {showChat && <ChatModal user={user} onClose={() => setShowChat(false)} />}
        {reportingPerson && <ReportModal person={reportingPerson} onConfirm={async (r) => { await reportUser(user.uid, reportingPerson.id, reportingPerson.name, r); setBlockedUsers([...blockedUsers, reportingPerson.id]); setReportingPerson(null); }} onCancel={() => setReportingPerson(null)} />}
        {toast && <Toast message={toast.msg} type={toast.type} />}
      </AnimatePresence>

      {/* ✅ HYPER-ATTRACTIVE HEADER */}
      <div className="fixed top-0 w-full z-20 px-4 pt-6">
        <div className="max-w-md mx-auto glass-card rounded-[2.5rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
           <div className="flex items-center justify-between mb-5">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg shadow-pink-500/20">
                  <MapPin className="text-white" size={22} />
                </div>
                <div>
                    <p className="text-[10px] text-pink-500 font-black uppercase tracking-[0.3em]">Live Vibes</p>
                    <h2 className="text-white font-black text-xl tracking-tight leading-none text-glow">{locationName}</h2>
                </div>
             </div>
             <button onClick={() => { triggerHaptic(); setShowProfile(true); }} className="relative">
               <div className="absolute inset-[-4px] bg-gradient-to-tr from-pink-500 to-violet-500 rounded-full blur-md opacity-50 animate-pulse"></div>
               <img src={user.photoURL} className="w-11 h-11 rounded-full border-2 border-white relative z-10"/>
               {!myProfile && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 z-20 flex items-center justify-center font-bold text-[8px] text-black">!</div>}
             </button>
           </div>

           <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-pink-400 bg-pink-500/10 px-2 py-1 rounded-md">
                    <Zap size={12} fill="currentColor"/>
                    <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="bg-transparent outline-none cursor-pointer">
                      <option value="All">All Vibe</option><option value="Male">Men</option><option value="Female">Women</option>
                    </select>
                  </div>
                  <span className="flex items-center gap-1"><Sparkles size={12}/> {searchRadius}km</span>
                </div>
                <span className="text-emerald-400">Budget: ₹{maxRent.toLocaleString()}</span>
             </div>
             <div className="flex gap-6 items-center">
                <input type="range" min="1" max="100" value={searchRadius} onChange={e=>setSearchRadius(Number(e.target.value))} className="flex-1 h-1.5 bg-slate-800 rounded-full accent-pink-500 appearance-none cursor-pointer"/>
                <input type="range" min="2000" max="100000" step="1000" value={maxRent} onChange={e=>setMaxRent(Number(e.target.value))} className="flex-1 h-1.5 bg-slate-800 rounded-full accent-emerald-500 appearance-none cursor-pointer"/>
             </div>
           </div>
        </div>
      </div>

      {/* ✅ DECK AREA */}
      <div className="relative w-full h-full flex items-center justify-center pt-32 px-4">
        <div className="w-full max-w-sm h-full max-h-[750px] flex items-center justify-center relative">
          {filteredCards.length > 0 ? filteredCards.map(item => (
            item.type === 'ad' ? <AdCard key={item.id} onSwipe={handleSwipe} /> :
            <Card key={item.id} person={item} onSwipe={handleSwipe} onCardLeftScreen={(id) => setFilteredCards(prev => { const n = prev.filter(c => c.id !== id); if(n.length < 3 && !loadingMore) loadDeck(); return n; })} userLocation={browsingLocation} onReport={setReportingPerson} onInfo={setInfoPerson} />
          )) : (
            <div className="relative flex flex-col items-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-24 h-24 bg-pink-500/20 rounded-full animate-radar"></div>
                    <div className="w-24 h-24 bg-pink-500/20 rounded-full animate-radar [animation-delay:0.7s]"></div>
                </div>
                <div className="bg-slate-900 p-10 rounded-full border-2 border-pink-500/30 relative z-10 shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                    <Flame size={48} className="text-pink-500 animate-bounce"/>
                </div>
                <h3 className="mt-14 text-white font-black text-2xl tracking-tighter text-glow italic">Finding your Soulmate Roomie...</h3>
                <p className="text-slate-500 font-bold text-xs text-center max-w-[220px] mt-4 uppercase tracking-[0.2em] leading-relaxed">Destiny is loading. Try increasing your radius or budget.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* ✅ GLOWING BUTTONS */}
      <div className="fixed bottom-10 left-0 right-0 px-8 flex justify-between items-center pointer-events-none">
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => { triggerHaptic(); setShowChat(true); }} className="pointer-events-auto bg-slate-900/80 border border-white/10 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center backdrop-blur-xl relative">
          <MessageCircle size={32} className={totalUnread > 0 ? "text-pink-500" : "text-slate-400"}/>
          {totalUnread > 0 && <div className="absolute -top-1 -right-1 bg-gradient-to-tr from-red-500 to-orange-500 text-white text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-lg animate-bounce">{totalUnread}</div>}
        </motion.button>

        {!myProfile && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { triggerHaptic(); setShowForm(true); }} className="pointer-events-auto bg-gradient-to-tr from-pink-600 to-rose-400 text-white px-8 h-16 rounded-full shadow-[0_15px_40px_rgba(236,72,153,0.4)] flex items-center gap-3 font-black uppercase tracking-widest text-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]"></div>
            <Plus size={24} strokeWidth={4}/> Join Now
          </motion.button>
        )}
      </div>
    </div>
  );
}