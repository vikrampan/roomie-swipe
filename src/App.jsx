import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, db, provider } from './firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { LandingPage } from './components/LandingPage';
import { triggerHaptic } from './services/utils';
import { swipeRight, swipeLeft } from './services/interactionService';
import { getNearbyUsers, injectSmartAds } from './services/feedService';
import { fetchMatches } from './services/chatService'; 
import { MessageCircle, User, Loader2, Minus, Plus, MapPin, Sparkles, X, Heart, Radar } from 'lucide-react';

// --- LAZY LOAD COMPONENTS ---
const Card = lazy(() => import('./components/Cards').then(m => ({ default: m.Card })));
const AdCard = lazy(() => import('./components/AdCard').then(m => ({ default: m.AdCard })));
const ChatModal = lazy(() => import('./components/Chat').then(m => ({ default: m.ChatModal })));
const CreateProfileForm = lazy(() => import('./components/Forms').then(m => ({ default: m.CreateProfileForm })));
const MatchPopup = lazy(() => import('./components/Modals').then(m => ({ default: m.MatchPopup })));
const DetailModal = lazy(() => import('./components/Modals').then(m => ({ default: m.DetailModal })));
const ReportModal = lazy(() => import('./components/Modals').then(m => ({ default: m.ReportModal })));
const LikesPage = lazy(() => import('./pages/LikesPage').then(m => ({ default: m.LikesPage })));

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [profileCheckComplete, setProfileCheckComplete] = useState(false); 
  
  // NAVIGATION STATE
  // Options: 'swipe', 'profile', 'chat', 'likes'
  const [activeTab, setActiveTab] = useState('swipe');
  
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [reportingPerson, setReportingPerson] = useState(null);
  const [matchData, setMatchData] = useState(null);
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
        if (!data.name || (!data.images?.length && !data.roomImages?.length)) {
            setActiveTab('profile'); 
        }
      }
    });
    return () => unsub();
  }, [user, profileCheckComplete]);

  // --- 3. NOTIFICATION POLLER (Likes & Messages) ---
  useEffect(() => {
    if (!user) return;
    const checkNotifications = async () => {
        // Stop fetching if tab is backgrounded to save server costs
        if (document.hidden) return;

        try {
            // Check Messages
            const matches = await fetchMatches(user.uid);
            const hasUnread = matches.some(m => m.hasNotification);
            setHasUnreadMessages(hasUnread);

            // Check Likes (The Vault)
            const qLikes = query(
                collection(db, "interactions"), 
                where("toUserId", "==", user.uid),
                where("type", "==", "like"),
                where("isRevealed", "==", false) 
            );
            const snapLikes = await getDocs(qLikes);
            setHasNewLikes(!snapLikes.empty);

        } catch (e) { console.warn(e); }
    };
    checkNotifications(); 
    const interval = setInterval(checkNotifications, 60000); // Check every 60s
    return () => clearInterval(interval);
  }, [user]);

  // --- 4. FEED LOGIC ---
  useEffect(() => {
    const fetchFeed = async () => {
      if (loading || !user || !isProfileComplete || !myProfile?.lat || activeTab === 'profile') {
        return;
      }

      if (isFetchingRef.current) return;

      if (people.length < 2) { 
        isFetchingRef.current = true;

        try {
          const nearby = await getNearbyUsers(
            user, 
            {lat: myProfile.lat, lng: myProfile.lng}, 
            searchRadius, 
            { role: myProfile.userRole }, 
            []
          );
          
          const notSwipedPeople = nearby.filter(p => !swipedIdsRef.current.has(p.id));
          const feedWithAds = injectSmartAds(notSwipedPeople, myProfile);

          if (feedWithAds.length > 0) {
              setPeople(prev => {
                  const uniqueNewItems = feedWithAds.filter(newItem => 
                      !prev.some(existingItem => existingItem.id === newItem.id)
                  );
                  return [...prev, ...uniqueNewItems];
              });
          }
        } catch (e) { 
            console.error("Feed Error", e); 
        } finally {
            isFetchingRef.current = false;
        }
      }
    };
    fetchFeed();
  }, [user, activeTab, people.length, searchRadius, isProfileComplete, loading, myProfile]);

  // --- HANDLERS ---
  
  const handleIncreaseRadius = useCallback(() => setSearchRadius(prev => prev >= 500 ? 500 : (prev >= 200 ? 500 : (prev >= 100 ? 200 : 100))), []);
  const handleDecreaseRadius = useCallback(() => setSearchRadius(prev => prev <= 50 ? 50 : (prev <= 100 ? 50 : (prev <= 200 ? 100 : 200))), []);

  const onSwipe = useCallback(async (direction, item) => {
    if (!user) return;
    
    swipedIdsRef.current.add(item.id);
    setPeople(prev => prev.filter(p => p.id !== item.id));
    triggerHaptic(direction === 'right' ? 'success' : 'light');
    
    // AD LOGIC
    if (item.isAd) {
      if (direction === 'right') window.open(item.link, '_blank');
      return; 
    }

    // USER LOGIC
    try {
      if (direction === 'right') {
        const result = await swipeRight(user.uid, item.id);
        if (result?.isMatch) setMatchData(item);
      } else {
        await swipeLeft(user.uid, item.id);
      }
    } catch (error) { console.error(error); }
  }, [user]);

  const handleSwipeButton = useCallback((direction) => {
    if (people.length === 0) return;
    const topPerson = people[people.length - 1]; 
    
    // Update direction state for motion exit before triggering swipe logic
    setPeople(prev => prev.map(p => 
      p.id === topPerson.id ? { ...p, swipeDirection: direction } : p
    ));

    setTimeout(() => {
        onSwipe(direction, topPerson);
    }, 50);
  }, [people, onSwipe]);

  const handleCardLeftScreen = useCallback((id) => {
    setPeople(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleLogin = useCallback(async () => {
    try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
  }, []);

  const handleCloseProfile = useCallback(() => {
    if (isProfileComplete) {
       setActiveTab('swipe'); 
    } else {
       alert("Please add a Name and Photo to continue.");
    }
  }, [isProfileComplete]);

  // --- RENDER: SPLASH SCREEN ---
  if (authLoading) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4 z-10"
        >
            <div className="w-20 h-20 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-pink-500/20">
                <Sparkles className="text-white w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white">ROOMIE<span className="text-pink-500">SWIPE</span></h1>
        </motion.div>
    </div>
  );

  // --- RENDER: LOGIN ---
  if (!user) return <LandingPage onLogin={handleLogin} />;
  
  // --- RENDER: LOADING STATE ---
  if (loading || !profileCheckComplete) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="text-pink-500 animate-spin" size={32} />
    </div>
  );

  return (
    <div className="h-screen bg-[#080808] text-white overflow-hidden flex flex-col relative font-sans">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <motion.div animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.4, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[20%] -left-[20%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      {/* HEADER */}
      {activeTab === 'swipe' && (
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

            <div className="flex items-center gap-3 z-50">
                {/* LIKES BUTTON (THE VAULT) - RECTIFIED VISIBILITY */}
                <button 
                  onClick={() => setActiveTab('likes')} 
                  className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                >
                  <Heart size={28} strokeWidth={2.5} className={`${hasNewLikes ? 'text-pink-500 fill-pink-500/20' : 'text-slate-300'}`} />
                  {hasNewLikes && (
                    <span className="absolute top-2 right-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[#080808]"></span>
                    </span>
                  )}
                </button>

                {/* CHAT BUTTON */}
                <button onClick={() => setActiveTab('chat')} className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95">
                  <MessageCircle size={28} strokeWidth={2.5} className="text-slate-300" />
                  {hasUnreadMessages && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-pink-500 border-2 border-[#080808] rounded-full animate-pulse"></span>}
                </button>
            </div>
          </header>
      )}

      {/* Main Swipe Area */}
      {activeTab === 'swipe' && (
        <div className="flex-1 relative flex justify-center items-center p-4 z-10">
            <Suspense fallback={<div className="flex justify-center"><Loader2 className="animate-spin text-pink-500"/></div>}>
            {!isProfileComplete ? (
                <div className="flex flex-col items-center justify-center text-center max-w-sm">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <User size={48} className="text-slate-500"/>
                    </div>
                    <h2 className="text-2xl font-black italic text-white mb-2">Complete Your Profile</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">
                        You need a name and photo to start swiping.
                    </p>
                    <button 
                    onClick={() => setActiveTab('profile')}
                    className="px-8 py-3 bg-white text-black rounded-full font-black text-xs hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Sparkles size={14}/> SETUP NOW
                    </button>
                </div>
            ) : (
                <>
                <AnimatePresence mode="popLayout">
                    {people.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center text-center z-0 w-full max-w-sm">
                            <div className="w-32 h-32 mb-6 flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-pink-500/20 rounded-full animate-ping opacity-20"></div>
                                <Radar size={64} className="text-pink-500/80" />
                            </div>
                            <div className="space-y-2 mb-8 relative z-10">
                                <h2 className="text-2xl font-black italic text-white tracking-tight">Scanning Area...</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                                    Looking within {searchRadius}km.
                                </p>
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
                    ) : (
                        people.map((person) => (
                            person.isAd ? (
                                <AdCard 
                                    key={person.id} 
                                    ad={person} 
                                    onSwipe={onSwipe} 
                                />
                            ) : (
                                <Card 
                                    key={person.id} 
                                    person={person} 
                                    myProfile={myProfile} 
                                    onSwipe={onSwipe} 
                                    onCardLeftScreen={handleCardLeftScreen} 
                                    onInfo={setSelectedPerson} 
                                    onReport={setReportingPerson} 
                                />
                            )
                        ))
                    )}
                </AnimatePresence>
                </>
            )}
            </Suspense>
        </div>
      )}

      {/* Floating Action Buttons */}
      {isProfileComplete && people.length > 0 && activeTab === 'swipe' && !selectedPerson && (
        <div className="absolute bottom-10 left-0 right-0 z-[100] flex justify-center items-center gap-8 pointer-events-auto">
            <button 
                onClick={() => handleSwipeButton('left')} 
                className="w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-white/10 flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:bg-red-500/20 group"
            >
                <X size={32} strokeWidth={3} className="text-red-500 group-hover:scale-110 transition-transform" />
            </button>
            <button 
                onClick={() => handleSwipeButton('right')} 
                className="w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-white/10 flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:bg-emerald-500/20 group"
            >
                <Heart size={32} strokeWidth={3} className="text-emerald-500 fill-current group-hover:scale-110 transition-transform" />
            </button>
        </div>
      )}

      {/* Modals Layer */}
      <AnimatePresence>
        <Suspense fallback={<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" size={32}/></div>}>
          
          {/* PROFILE FORM */}
          {activeTab === 'profile' && (
             <CreateProfileForm 
               user={user} 
               existingData={myProfile} 
               onCancel={handleCloseProfile} 
               showToast={(msg) => alert(msg)} 
             />
          )}
          
          {/* CHAT MODAL */}
          {activeTab === 'chat' && (
              <ChatModal user={user} onClose={() => setActiveTab('swipe')} />
          )}

          {/* LIKES VAULT */}
          {activeTab === 'likes' && (
              <LikesPage 
                  currentUser={user} 
                  onBack={() => setActiveTab('swipe')} 
                  onNavigateToChat={() => setActiveTab('chat')}
              />
          )}
          
          {selectedPerson && <DetailModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
          
          {reportingPerson && <ReportModal person={reportingPerson} onConfirm={() => setReportingPerson(null)} onCancel={() => setReportingPerson(null)} />}
          
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