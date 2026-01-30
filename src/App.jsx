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
import { swipeRight, swipeLeft } from './services/interactionService';
import { MessageCircle, User, Loader2, Zap, Sparkles, ShieldCheck, MapPin, Search } from 'lucide-react';

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
    }, (err) => setLoading(false));

    return () => { unsubMe(); unsubPeople(); };
  }, [user]);

  const onSwipe = async (direction, item) => {
    if (item.isAd) return;
    triggerHaptic(direction === 'right' ? 'success' : 'light');

    try {
      if (direction === 'right') {
        const result = await swipeRight(user.uid, item.id);
        if (result?.isMatch) setMatchData(item);
      } else {
        await swipeLeft(user.uid, item.id);
      }
      // Remove from state so the next card is visible
      setPeople(prev => prev.filter(p => p.id !== item.id));
    } catch (error) {
      console.error("Swipe interaction failed:", error);
    }
  };

  // ✅ FIX: Added the missing function that was causing the TypeError
  const handleCardLeftScreen = (id) => {
    setPeople(prev => prev.filter(p => p.id !== id));
  };

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-pink-600 animate-spin" size={40} />
    </div>
  );

  if (!user) return <div className="bg-black h-screen flex items-center justify-center"><button onClick={handleLogin} className="bg-pink-600 px-8 py-4 rounded-2xl font-black">LOGIN TO VIBE</button></div>;

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex flex-col">
      <div className="p-6 flex justify-between items-center z-50">
        <button onClick={() => setActiveTab('profile')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-transform"><User size={24} /></button>
        <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">VIBE <Zap size={20} className="text-pink-500 fill-pink-500"/></h1>
        <button onClick={() => setActiveTab('chat')} className="p-3 bg-white/5 rounded-2xl border border-white/10 relative active:scale-90 transition-transform"><MessageCircle size={24} /></button>
      </div>

      <div className="flex-1 relative flex justify-center items-center p-4">
        <AnimatePresence>
          {people.map((person) => (
            <Card 
              key={person.id} 
              person={person} 
              myProfile={myProfile}
              onSwipe={onSwipe} 
              onCardLeftScreen={handleCardLeftScreen} // ✅ Prop passed correctly
              onInfo={setSelectedPerson} 
              onReport={setReportingPerson}
            />
          ))}
        </AnimatePresence>

        {people.length === 0 && (
          <div className="text-center opacity-30">
            <Search size={64} className="mx-auto mb-4 text-slate-500" />
            <p className="font-black uppercase tracking-widest text-sm italic">Searching your area...</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeTab === 'profile' && <ProfileModal user={user} myProfile={myProfile} onClose={() => setActiveTab('swipe')} onEdit={() => setShowProfileForm(true)} />}
        {activeTab === 'chat' && <ChatModal user={user} onClose={() => setActiveTab('swipe')} />}
        {showProfileForm && <CreateProfileForm user={user} existingData={myProfile} onCancel={() => setShowProfileForm(false)} />}
        {selectedPerson && <DetailModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
        {reportingPerson && <ReportModal person={reportingPerson} onConfirm={() => setReportingPerson(null)} onCancel={() => setReportingPerson(null)} />}
        {matchData && <MatchPopup person={matchData} onClose={() => setMatchData(null)} />}
      </AnimatePresence>
    </div>
  );
}