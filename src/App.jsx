import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, db, provider } from './firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { Toaster, toast } from 'sonner';

import { MessageCircle, User, Loader2, Minus, Plus, MapPin, Sparkles, X, Heart, Radar } from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { triggerHaptic } from './services/utils';
import { swipeRight, swipeLeft } from './services/interactionService';
import { getNearbyUsers } from './services/feedService';
import { fetchMatches } from './services/chatService'; 
import { AFFILIATE_ADS } from './data/adData';

// --- LAZY LOAD COMPONENTS ---
const Card = lazy(() => import('./components/Cards').then(m => ({ default: m.Card })));
const AdCard = lazy(() => import('./components/AdCard').then(m => ({ default: m.AdCard })));
const ChatModal = lazy(() => import('./components/Chat').then(m => ({ default: m.ChatModal })));
const CreateProfileForm = lazy(() => import('./components/Forms').then(m => ({ default: m.CreateProfileForm })));
const MatchPopup = lazy(() => import('./components/Modals').then(m => ({ default: m.MatchPopup })));
const DetailModal = lazy(() => import('./components/Modals').then(m => ({ default: m.DetailModal })));
const ReportModal = lazy(() => import('./components/Modals').then(m => ({ default: m.ReportModal })));
const BugReportModal = lazy(() => import('./components/Modals').then(m => ({ default: m.BugReportModal })));
const LikesPage = lazy(() => import('./pages/LikesPage').then(m => ({ default: m.LikesPage })));
const SecureImage = lazy(() => import('./components/SecureImage').then(m => ({ default: m.SecureImage })));

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [profileCheckComplete, setProfileCheckComplete] = useState(false); 
  
  const [activeTab, setActiveTab] = useState('swipe');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [reportingPerson, setReportingPerson] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [showBugModal, setShowBugModal] = useState(false);

  const [searchRadius, setSearchRadius] = useState(50);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasNewLikes, setHasNewLikes] = useState(false); 
  
  const swipedIdsRef = useRef(new Set()); 
  const isFetchingRef = useRef(false);

  const isProfileComplete = myProfile && myProfile.name && (myProfile.images?.length > 0 || myProfile.roomImages?.length > 0);

  // --- 1. AUTH & DATA PERSISTENCE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const dbData = docSnap.data();
                setMyProfile({ id: currentUser.uid, ...dbData, email: currentUser.email, photoURL: dbData.images?.[0] || currentUser.photoURL });
            } else {
                setMyProfile({ id: currentUser.uid, name: "", email: currentUser.email, photoURL: currentUser.photoURL, isNewUser: true });
            }
        } catch (error) { console.error("Error fetching profile:", error); }
        setUser(currentUser); 
      } else {
        setUser(null);
        setMyProfile(null);
      }
      setProfileCheckComplete(true); 
      setLoading(false);
      setTimeout(() => setAuthLoading(false), 800); 
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
        if (!data.name || (!data.images?.length && !data.roomImages?.length)) setActiveTab('profile'); 
      }
    });
    return () => unsub();
  }, [user, profileCheckComplete]);

  // --- 3. NOTIFICATION POLLER ---
  useEffect(() => {
    if (!user) return;
    const checkNotifications = async () => {
        if (document.hidden) return; 
        try {
            const matches = await fetchMatches(user.uid);
            setHasUnreadMessages(matches.some(m => m.hasNotification));
            const qLikes = query(collection(db, "interactions"), where("toUserId", "==", user.uid), where("type", "==", "like"), where("isRevealed", "==", false));
            const snapLikes = await getDocs(qLikes);
            setHasNewLikes(!snapLikes.empty);
        } catch (e) { console.warn(e); }
    };
    checkNotifications(); 
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // --- 4. FEED LOGIC (Fixed Ad Frequency) ---
  useEffect(() => {
    const fetchFeed = async () => {
      if (loading || !user || !isProfileComplete || !myProfile?.lat || activeTab !== 'swipe') return;
      if (isFetchingRef.current) return;
      
      if (people.length < 2) { 
        isFetchingRef.current = true;
        try {
          const nearby = await getNearbyUsers(user, {lat: myProfile.lat, lng: myProfile.lng}, searchRadius, { role: myProfile.userRole }, []);
          const notSwipedPeople = nearby.filter(p => !swipedIdsRef.current.has(p.id));
          
          let mixedFeed = [];
          let adIndex = 0;
          
          notSwipedPeople.forEach((profile, index) => {
              mixedFeed.push(profile);
              
              // ✅ FIXED: Inject Ad every 5th card (20% Density) instead of every 2nd.
              // This makes the feed feel natural and "Users" act as the content.
              if ((index + 1) % 5 === 0) {
                  const ad = AFFILIATE_ADS[adIndex % AFFILIATE_ADS.length];
                  mixedFeed.push({ 
                      ...ad, 
                      isAd: true, 
                      id: `ad_${ad.id}_${Date.now()}_${index}` // Unique ID
                  });
                  adIndex++;
              }
          });

          // ✅ INJECT HOUSE AD (Transparency) if no other ads exist in feed
          // This ensures compliance if the user list is short
          if (mixedFeed.length > 0 && !mixedFeed.some(p => p.isAd)) {
             const houseAd = AFFILIATE_ADS.find(a => a.type === 'house') || AFFILIATE_ADS[0];
             mixedFeed.push({ 
                 ...houseAd, 
                 isAd: true, 
                 id: `house_end_${Date.now()}` 
             });
          }

          if (mixedFeed.length > 0) {
              setPeople(prev => {
                  const uniqueNewItems = mixedFeed.filter(newItem => !prev.some(existingItem => existingItem.id === newItem.id));
                  return [...prev, ...uniqueNewItems];
              });
          }
        } catch (e) { console.error("Feed Error", e); } finally { isFetchingRef.current = false; }
      }
    };
    fetchFeed();
  }, [user, activeTab, people.length, searchRadius, isProfileComplete, loading, myProfile]);

  // --- HANDLERS ---
  const handleIncreaseRadius = useCallback(() => setSearchRadius(prev => Math.min(500, prev + 50)), []);
  const handleDecreaseRadius = useCallback(() => setSearchRadius(prev => Math.max(50, prev - 50)), []);

  const onSwipe = useCallback(async (direction, item) => {
    if (!user) return;
    
    // Remove from UI immediately
    swipedIdsRef.current.add(item.id);
    setPeople(prev => prev.filter(p => p.id !== item.id));
    triggerHaptic(direction === 'right' ? 'success' : 'light');

    // ✅ FIX: Handle Ads Correctly
    if (item.isAd) {
      // 1. If it's the HOUSE AD (Transparency), DO NOT OPEN LINK. Just let it swipe away.
      if (item.type === 'house') {
          return; 
      }
      
      // 2. If it's a real ad (Amazon/Rentomojo), open link on Right Swipe
      if (direction === 'right') {
          window.open(item.link, '_blank');
      }
      return; 
    }

    // Handle Real User Swipes
    try {
      if (direction === 'right') {
        const result = await swipeRight(user.uid, item.id);
        if (result?.isMatch) setMatchData(item);
      } else { 
        await swipeLeft(user.uid, item.id); 
      }
    } catch (error) { console.error("Swipe Error:", error); }
  }, [user]);

  const handleSwipeButton = useCallback((direction) => {
    if (people.length === 0) return;
    const topPerson = people[people.length - 1]; 
    setPeople(prev => prev.map(p => p.id === topPerson.id ? { ...p, swipeDirection: direction } : p));
    setTimeout(() => { onSwipe(direction, topPerson); }, 200); 
  }, [people, onSwipe]);

  const handleCardLeftScreen = useCallback((id) => { setPeople(prev => prev.filter(p => p.id !== id)); }, []);
  const handleLogin = useCallback(async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } }, []);
  const handleCloseProfile = useCallback(() => {
    if (isProfileComplete) { setActiveTab('swipe'); } 
    else { alert("Please add a Name and Photo to continue."); }
  }, [isProfileComplete]);

  // --- RENDER ---
  if (authLoading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" /></div>;
  if (!user) return <LandingPage onLogin={handleLogin} />;
  if (loading || !profileCheckComplete) return <div className="h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" size={32} /></div>;

  return (
    <div className="h-screen bg-[#080808] text-white overflow-hidden flex flex-col relative font-sans">
      <Toaster position="top-center" theme="dark" />
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <motion.div animate={{ x: [0, -100, 0], y: [0, 100, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute top-[20%] -left-[20%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      {activeTab === 'swipe' && (
          <header className="px-5 py-6 z-50 flex items-center relative max-w-4xl mx-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-b from-black/95 to-transparent pointer-events-none h-32"></div>
            <div className="w-1/3 flex justify-start z-50">
                <button onClick={() => setActiveTab('profile')} className="relative p-1 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all shadow-xl active:scale-95">
                    <div className="w-11 h-11 rounded-[14px] overflow-hidden border border-white/5 bg-white/5">
                        <Suspense fallback={null}><SecureImage src={myProfile?.images?.[0] || myProfile?.img} className="w-full h-full object-cover" /></Suspense>
                    </div>
                </button>
            </div>
            <div className="w-1/3 flex justify-center z-50">
                {myProfile?.city && (
                  <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 backdrop-blur-2xl shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black text-slate-100 uppercase tracking-[0.1em]">{myProfile.city}</span>
                  </div>
                )}
            </div>
            <div className="w-1/3 flex justify-end items-center gap-2.5 z-50">
                <button onClick={() => setActiveTab('likes')} className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all shadow-lg">
                  <Heart size={24} strokeWidth={2.5} className={`${hasNewLikes ? 'text-pink-500 fill-pink-500/10' : 'text-slate-300'}`} />
                  {hasNewLikes && (<span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-[#080808]"></span></span>)}
                </button>
                <button onClick={() => setActiveTab('chat')} className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all shadow-lg">
                  <MessageCircle size={24} strokeWidth={2.5} className="text-slate-300" />
                  {hasUnreadMessages && (<span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5"><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500 border-2 border-[#080808]"></span></span>)}
                </button>
            </div>
          </header>
      )}

      {activeTab === 'swipe' && (
        <div className="flex-1 relative flex justify-center items-center p-4 z-10">
            <Suspense fallback={<Loader2 className="animate-spin text-pink-500"/>}>
            {!isProfileComplete ? (
                <div className="flex flex-col items-center justify-center text-center max-w-sm">
                    <User size={48} className="text-slate-500 mb-4"/>
                    <h2 className="text-2xl font-black italic text-white mb-2">Setup Required</h2>
                    <button onClick={() => setActiveTab('profile')} className="px-8 py-4 bg-white text-black rounded-full font-black text-xs">CONTINUE</button>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    {people.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center text-center z-0 w-full max-w-sm">
                            <Radar size={64} className="text-pink-500/80 mb-4" />
                            <h2 className="text-2xl font-black italic text-white tracking-tight mb-2 uppercase">Searching</h2>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Area: {searchRadius}km</p>
                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-md shadow-2xl">
                                <button onClick={handleDecreaseRadius} disabled={searchRadius <= 50} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5"><Minus size={18}/></button>
                                <span className="text-xl font-black text-white">{searchRadius} km</span>
                                <button onClick={handleIncreaseRadius} disabled={searchRadius >= 500} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/10"><Plus size={18}/></button>
                            </div>
                        </div>
                    ) : (
                        people.map((person) => (
                            person.isAd ? (
                                <AdCard key={person.id} ad={person} onSwipe={onSwipe} />
                            ) : (
                                <Card key={person.id} person={person} myProfile={myProfile} onSwipe={onSwipe} onCardLeftScreen={handleCardLeftScreen} onInfo={setSelectedPerson} />
                            )
                        ))
                    )}
                </AnimatePresence>
            )}
            </Suspense>
        </div>
      )}

      {isProfileComplete && people.length > 0 && activeTab === 'swipe' && !selectedPerson && (
        <div className="absolute bottom-10 left-0 right-0 z-[100] flex justify-center items-center gap-8 pointer-events-auto">
            <button onClick={() => handleSwipeButton('left')} className="w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-white/10 flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:bg-red-500/20 group"><X size={32} className="text-red-500 group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => handleSwipeButton('right')} className="w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-white/10 flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:bg-emerald-500/20 group"><Heart size={32} className="text-emerald-500 group-hover:scale-110 transition-transform" /></button>
        </div>
      )}

      <AnimatePresence>
        <Suspense fallback={null}>
          {activeTab === 'profile' && <CreateProfileForm user={user} existingData={myProfile} onCancel={handleCloseProfile} onReportBug={() => setShowBugModal(true)} showToast={(msg) => toast(msg)} />}
          {activeTab === 'chat' && <ChatModal user={user} onClose={() => setActiveTab('swipe')} />}
          {activeTab === 'likes' && <LikesPage user={user} onBack={() => setActiveTab('swipe')} onNavigateToChat={() => setActiveTab('chat')} />}
          {selectedPerson && <DetailModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
          {reportingPerson && <ReportModal person={reportingPerson} onConfirm={() => setReportingPerson(null)} onCancel={() => setReportingPerson(null)} />}
          {matchData && <MatchPopup person={matchData} onClose={() => setMatchData(null)} onChat={() => { setMatchData(null); setActiveTab('chat'); }} />}
          {showBugModal && <BugReportModal user={user} onClose={() => setShowBugModal(false)} />}
        </Suspense>
      </AnimatePresence>
    </div>
  );
}