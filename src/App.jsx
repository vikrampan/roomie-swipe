import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, db, provider } from './firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore'; 
import { LandingPage } from './components/LandingPage';
import { triggerHaptic } from './services/utils';
import { swipeRight, swipeLeft } from './services/interactionService';
import { getNearbyUsers, injectSmartAds } from './services/feedService';
import { fetchMatches } from './services/chatService'; 
import { MessageCircle, User, Loader2, Minus, Plus, MapPin, Sparkles } from 'lucide-react';

// --- LAZY LOAD COMPONENTS ---
const Card = lazy(() => import('./components/Cards').then(m => ({ default: m.Card })));
const ChatModal = lazy(() => import('./components/Chat').then(m => ({ default: m.ChatModal })));
const CreateProfileForm = lazy(() => import('./components/Forms').then(m => ({ default: m.CreateProfileForm })));
const MatchPopup = lazy(() => import('./components/Modals').then(m => ({ default: m.MatchPopup })));
const DetailModal = lazy(() => import('./components/Modals').then(m => ({ default: m.DetailModal })));
const ReportModal = lazy(() => import('./components/Modals').then(m => ({ default: m.ReportModal })));

// --- ANIMATION ---
const DoodleSearchAnim = () => {
  return (
    <div className="relative w-64 h-64 mx-auto mb-2 flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
        <motion.path d="M20 150 L180 150" stroke="white" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
        <motion.path d="M30 150 L30 170 M170 150 L170 170" stroke="white" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.2 }} />
        <motion.path d="M90 150 Q70 150 70 110 Q70 80 100 80" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" fill="transparent" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5 }} />
        <motion.circle cx="100" cy="65" r="15" stroke="#6366f1" strokeWidth="4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 1 }} />
        <motion.path d="M90 150 L130 150 L130 175" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.8 }} />
        <motion.path d="M85 100 Q110 110 120 90" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1.2 }} />
        <motion.rect x="115" y="70" width="15" height="25" rx="2" stroke="white" strokeWidth="2" fill="#000" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} />
        <motion.path d="M135 75 Q145 82 135 90" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1.8 }} />
        <motion.path d="M140 70 Q155 82 140 95" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 2.0 }} />
      </svg>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [profileCheckComplete, setProfileCheckComplete] = useState(false); 
  
  const [activeTab, setActiveTab] = useState('swipe');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [reportingPerson, setReportingPerson] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [searchRadius, setSearchRadius] = useState(50);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  const swipedIdsRef = useRef(new Set()); 
  const initialFetchDone = useRef(false);

  const isProfileComplete = myProfile && myProfile.name && (myProfile.images?.length > 0 || myProfile.roomImages?.length > 0);

  // --- 1. AUTH & DATA PERSISTENCE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
            // Check Database FIRST
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const dbData = docSnap.data();
                setMyProfile({
                    id: currentUser.uid,
                    ...dbData, 
                    email: currentUser.email, 
                    photoURL: dbData.images?.[0] || currentUser.photoURL 
                });
            } else {
                setMyProfile({
                    id: currentUser.uid,
                    name: "", 
                    email: currentUser.email,
                    photoURL: currentUser.photoURL,
                    isNewUser: true
                });
            }
        } catch (error) { console.error("Error fetching profile:", error); }
        setUser(currentUser); 
      } else {
        setUser(null);
        setMyProfile(null);
      }
      setProfileCheckComplete(true); 
      setLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  // --- 2. REAL-TIME SYNC ---
  useEffect(() => {
    if (!user || !profileCheckComplete) return; 
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMyProfile(prev => ({ ...prev, ...data, id: user.uid }));
        if (!data.name || (!data.images?.length && !data.roomImages?.length)) {
            setActiveTab('profile'); 
        }
      }
    });
    return () => unsub();
  }, [user, profileCheckComplete]);

  // --- 3. NOTIFICATION POLLER ---
  useEffect(() => {
    if (!user) return;
    const checkUnread = async () => {
        try {
            const matches = await fetchMatches(user.uid);
            const hasUnread = matches.some(m => m.hasNotification);
            setHasUnreadMessages(hasUnread);
        } catch (e) { console.warn(e); }
    };
    checkUnread(); 
    const interval = setInterval(checkUnread, 120000);
    return () => clearInterval(interval);
  }, [user]);

  // --- 4. FEED LOGIC (With Strict Filtering) ---
  useEffect(() => {
    const fetchFeed = async () => {
      if (loading || !user || !isProfileComplete || !myProfile?.lat || activeTab === 'profile') {
        return;
      }

      if (people.length < 2) { 
        try {
          // Pass User Role to Filter Competitors
          const nearby = await getNearbyUsers(
            user, 
            {lat: myProfile.lat, lng: myProfile.lng}, 
            searchRadius, 
            { role: myProfile.userRole }, 
            []
          );
          
          const uniquePeople = nearby.filter(p => {
             const isDuplicate = people.some(existing => existing.id === p.id);
             return !isDuplicate && !swipedIdsRef.current.has(p.id);
          });

          const feedWithAds = injectSmartAds(uniquePeople, myProfile);

          if (feedWithAds.length > 0) {
              setPeople(prev => [...prev, ...feedWithAds]);
          }
        } catch (e) { console.error("Feed Error", e); }
        initialFetchDone.current = true;
      }
    };
    fetchFeed();
  }, [user, activeTab, people.length, searchRadius, isProfileComplete, loading, myProfile]);

  // --- ACTIONS ---
  const handleIncreaseRadius = () => setSearchRadius(prev => prev >= 500 ? 500 : (prev >= 200 ? 500 : (prev >= 100 ? 200 : 100)));
  const handleDecreaseRadius = () => setSearchRadius(prev => prev <= 50 ? 50 : (prev <= 100 ? 50 : (prev <= 200 ? 100 : 200)));

  const onSwipe = async (direction, item) => {
    swipedIdsRef.current.add(item.id);
    setPeople(prev => prev.filter(p => p.id !== item.id));
    triggerHaptic(direction === 'right' ? 'success' : 'light');
    if (item.isAd) return;

    try {
      if (direction === 'right') {
        const result = await swipeRight(user.uid, item.id);
        if (result?.isMatch) setMatchData(item);
      } else {
        await swipeLeft(user.uid, item.id);
      }
    } catch (error) { console.error(error); }
  };

  const handleCardLeftScreen = (id) => setPeople(prev => prev.filter(p => p.id !== id));
  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };

  // --- RENDER ---
  if (loading || !profileCheckComplete) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      <div className="flex flex-col items-center gap-4 z-10">
        <Loader2 className="text-pink-500 animate-spin" size={48} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Retrieving Profile...</p>
      </div>
    </div>
  );

  if (!user) return <LandingPage onLogin={handleLogin} />;

  return (
    <div className="h-screen bg-[#080808] text-white overflow-hidden flex flex-col relative font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <motion.div animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.4, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[20%] -left-[20%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      <header className="px-6 py-5 z-50 flex justify-between items-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-2 z-50">
            <button onClick={() => setActiveTab('profile')} className="relative group p-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95">
                {myProfile?.images?.[0] || myProfile?.img ? ( 
                    <img src={myProfile.images?.[0] || myProfile.img} className="w-8 h-8 rounded-xl object-cover opacity-90 group-hover:opacity-100 transition-opacity" /> 
                ) : ( <User size={24} className="text-slate-300" /> )}
            </button>
        </div>
        <div className="flex flex-col items-center z-50 pt-2">
            <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-1 drop-shadow-2xl">
              ROOMIE <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">SWIPE</span>
            </h1>
            {myProfile?.city && (
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                {myProfile.city}
              </span>
            )}
        </div>
        <button onClick={() => setActiveTab('chat')} className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 z-50">
          <MessageCircle size={24} className="text-slate-300" />
          {hasUnreadMessages && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-pink-500 border-2 border-[#080808] rounded-full animate-pulse"></span>}
        </button>
      </header>

      <div className="flex-1 relative flex justify-center items-center p-4 z-10">
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="animate-spin text-pink-500"/></div>}>
          {!isProfileComplete ? (
             <div className="flex flex-col items-center justify-center text-center max-w-sm">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <User size={48} className="text-slate-500"/>
                </div>
                <h2 className="text-2xl font-black italic text-white mb-2">Complete Your Profile</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">You need a name and photo to start swiping.</p>
                <button onClick={() => setActiveTab('profile')} className="px-8 py-3 bg-white text-black rounded-full font-black text-xs hover:scale-105 transition-all flex items-center gap-2">
                    <Sparkles size={14}/> SETUP NOW
                </button>
             </div>
          ) : (
             <>
              <AnimatePresence>
                {people.map((person) => (
                  <Card key={person.id} person={person} myProfile={myProfile} onSwipe={onSwipe} onCardLeftScreen={handleCardLeftScreen} onInfo={setSelectedPerson} onReport={setReportingPerson} />
                ))}
              </AnimatePresence>
              {people.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center text-center z-0 w-full max-w-sm">
                  <DoodleSearchAnim />
                  <div className="space-y-2 mt-4 mb-8 relative z-10">
                      <h2 className="text-2xl font-black italic text-white tracking-tight">Scanning Area...</h2>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">We've looked everywhere within {searchRadius}km.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-md shadow-xl">
                      <button onClick={handleDecreaseRadius} disabled={searchRadius <= 50} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"><Minus size={16} className="text-slate-300"/></button>
                      <div className="flex flex-col items-center w-24">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Radius</span>
                          <span className="text-lg font-black text-white flex items-center gap-1"><MapPin size={12} className="text-pink-500" fill="currentColor"/> {searchRadius} km</span>
                      </div>
                      <button onClick={handleIncreaseRadius} disabled={searchRadius >= 500} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-pink-500/20 border border-white/5 hover:border-pink-500/50 active:scale-95 transition-all disabled:opacity-30 group"><Plus size={16} className="text-white group-hover:text-pink-500 transition-colors"/></button>
                  </div>
                </div>
              )}
             </>
          )}
        </Suspense>
      </div>

      <AnimatePresence>
        <Suspense fallback={<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" size={32}/></div>}>
          
          {/* Profile Form (Edit/Create) */}
          {(activeTab === 'profile' || showProfileForm) && (
             <CreateProfileForm user={user} existingData={myProfile} onCancel={() => { if (isProfileComplete) { setActiveTab('swipe'); setShowProfileForm(false); } else { alert("Please add a Name and Photo to continue."); } }} showToast={(msg) => alert(msg)} />
          )}
          
          {/* Chat List */}
          {activeTab === 'chat' && <ChatModal user={user} onClose={() => setActiveTab('swipe')} />}
          
          {/* Detail View */}
          {selectedPerson && <DetailModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
          
          {/* Report Dialog */}
          {reportingPerson && <ReportModal person={reportingPerson} onConfirm={() => setReportingPerson(null)} onCancel={() => setReportingPerson(null)} />}
          
          {/* Match Celebration */}
          {matchData && (
            <MatchPopup 
              person={matchData} 
              onClose={() => setMatchData(null)} 
              onChat={() => {
                setMatchData(null);
                setActiveTab('chat');
              }} 
            />
          )}
        </Suspense>
      </AnimatePresence>
    </div>
  );
}