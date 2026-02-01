import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, MapPin, Loader2, Check, User, Briefcase, IndianRupee, 
  RefreshCw, LogOut, Cloud, Moon, Sun, Wine, Heart, 
  Clock, Home, Zap, ChevronLeft, Sparkles, Star,
  Building, Calendar, Phone, Users, ArrowRight, Save, Image as ImageIcon, ShieldCheck, Mail
} from 'lucide-react';
import { saveProfile, deleteMyProfile } from '../services/profileService';
import { compressImage, getCityFromCoordinates } from '../services/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut, deleteUser } from 'firebase/auth';
import { auth, storage } from '../firebase';
import { PhoneVerifier } from './PhoneVerifier';

// --- CONSTANTS ---
const STEPS = ['Identity', 'Details', 'Photos', 'Lifestyle'];

const VIBE_TAGS = [
  { label: 'Non-Smoker', icon: <Check size={14}/> }, { label: 'Smoker', icon: <Cloud size={14}/> },
  { label: 'Vegetarian', icon: <Check size={14}/> }, { label: 'Non-Veg', icon: <Check size={14}/> },
  { label: 'Drinker', icon: <Wine size={14}/> }, { label: 'Teetotaler', icon: <Check size={14}/> },
  { label: 'Pet Friendly', icon: <Heart size={14}/> }, { label: 'Has Pets', icon: <Heart size={14}/> },
];

const FURNISHING_OPTS = [
    { value: 'Unfurnished', desc: 'Empty shell' },
    { value: 'Semi-Furnished', desc: 'Lights/Fans' },
    { value: 'Fully Furnished', desc: 'Move-in ready' }
];

const DETAILED_PREFS = {
  cleanliness: [
    { value: 'Relaxed', desc: 'Messy is fine' },
    { value: 'Moderate', desc: 'Tidy common areas' },
    { value: 'Sparkling', desc: 'Clean freak' }
  ],
  guests: [
    { value: 'Rarely', desc: 'Prefer privacy' },
    { value: 'Weekends', desc: 'Okay on weekends' },
    { value: 'Anytime', desc: 'Open house' }
  ],
  schedule: [
    { value: 'Early Bird', icon: <Sun size={16}/>, desc: 'Up < 8 AM' },
    { value: 'Night Owl', icon: <Moon size={16}/>, desc: 'Up > 12 AM' },
    { value: '9-5 Worker', icon: <Briefcase size={16}/>, desc: 'Regular hrs' },
    { value: 'Shift Work', icon: <Clock size={16}/>, desc: 'Rotating' }
  ],
  social: [
    { value: 'Private', desc: 'Keep to myself' },
    { value: 'Friendly', desc: 'Chat in kitchen' },
    { value: 'Besties', desc: 'Do everything together' }
  ]
};

export const CreateProfileForm = ({ user, existingData, onCancel, showToast }) => {
  const [currentStep, setCurrentStep] = useState(0); 
  const [photoLoading, setPhotoLoading] = useState(false);
  const [roomPhotoLoading, setRoomPhotoLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isLoaded = useRef(false);

  // Initialize state
  const [formData, setFormData] = useState({
    // Identity (Locked for existing users)
    name: "", 
    age: "", 
    gender: "Male", // Default
    
    // Mutable Details
    occupation: "", 
    rent: "", 
    bio: "", 
    tags: [], 
    images: [], 
    roomImages: [], 
    city: "Unknown", 
    lat: null, 
    lng: null,
    
    // Contact
    phoneNumber: "",
    isPhoneVerified: false,

    // Role Logic
    userRole: "hunter", 
    
    // Host Specific 
    societyName: "",
    furnishing: "Semi-Furnished",
    availableFrom: "", 
    
    // Hunter Specific 
    moveInDate: "", 
    workLocation: "",
    teamUp: false, 

    // Lifestyle
    cleanliness: "Moderate",
    guestPolicy: "Weekends",
    schedule: "9-5 Worker",
    socialVibe: "Friendly"
  });

  const lastSavedRef = useRef(formData);

  // Check if this is an existing user (to lock fields)
  const isExistingUser = useMemo(() => {
      return existingData && existingData.name && existingData.name.length > 0;
  }, [existingData]);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    if (!isLoaded.current) {
      if (existingData) {
        const safeData = {
            ...formData,
            ...existingData,
            tags: existingData.tags || [],
            images: existingData.images || [],
            roomImages: existingData.roomImages || [],
            // Ensure Name is loaded correctly
            name: existingData.name || "",
            bio: existingData.bio || "",
            userRole: existingData.userRole || "hunter"
        };
        setFormData(safeData);
        lastSavedRef.current = safeData;
        isLoaded.current = true;
      } else {
        locate(); 
        isLoaded.current = true;
      }
    }
  }, [existingData]);

  // --- 2. AUTO-SAVE ---
  useEffect(() => {
    if (!isLoaded.current) return;
    const isDirty = JSON.stringify(formData) !== JSON.stringify(lastSavedRef.current);
    if (!isDirty) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveProfile(user.uid, formData, [], formData.images);
        lastSavedRef.current = formData;
      } catch (e) { console.error("Auto-save failed", e); }
      setIsSaving(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [formData, user.uid]);

  // --- 3. HANDLERS ---
  const handleNext = () => {
     if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
     else handleSaveAndClose();
  };

  const handlePrev = () => {
     if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      await saveProfile(user.uid, formData, [], formData.images);
      showToast("Profile Saved");
      onCancel();
    } catch (e) {
      showToast("Error saving profile");
      onCancel(); 
    }
  };

  const handleGenericUpload = async (e, targetField, maxLimit, setLoadingState) => {
    const files = Array.from(e.target.files);
    if (formData[targetField].length + files.length > maxLimit) {
      showToast(`Max ${maxLimit} photos allowed`);
      return;
    }
    setLoadingState(true);
    try {
      const uploadPromises = files.map(async (file, index) => {
        try {
          const blob = await compressImage(file);
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 9);
          const fileName = `${targetField}_${timestamp}_${index}_${randomId}.jpg`;
          const storageRef = ref(storage, `users/${user.uid}/${fileName}`);
          await uploadBytes(storageRef, blob);
          return await getDownloadURL(storageRef);
        } catch (error) { return null; }
      });
      
      const uploadedUrls = (await Promise.all(uploadPromises)).filter(url => url !== null);
      if (uploadedUrls.length > 0) {
          const newImages = [...formData[targetField], ...uploadedUrls].slice(0, maxLimit);
          const updatedFormData = { ...formData, [targetField]: newImages };
          setFormData(updatedFormData);
          await saveProfile(user.uid, updatedFormData, [], updatedFormData.images);
          lastSavedRef.current = updatedFormData;
          showToast(`${uploadedUrls.length} photo(s) added`);
      }
    } catch (error) { showToast("Error uploading images"); }
    setLoadingState(false);
  };

  const removeGenericImage = async (index, targetField) => {
    const newImages = formData[targetField].filter((_, i) => i !== index);
    const updatedFormData = { ...formData, [targetField]: newImages };
    setFormData(updatedFormData);
    await saveProfile(user.uid, updatedFormData, [], updatedFormData.images);
    lastSavedRef.current = updatedFormData;
  };

  const locate = async () => {
    setLocating(true);
    if (!navigator.geolocation) {
        showToast("Geo not supported");
        setLocating(false);
        return;
    }
    navigator.geolocation.getCurrentPosition(async (p) => {
      try {
        const city = await getCityFromCoordinates(p.coords.latitude, p.coords.longitude);
        setFormData(prev => ({ 
          ...prev, 
          lat: p.coords.latitude, 
          lng: p.coords.longitude, 
          city: city || "Unknown"
        }));
        showToast("Location updated");
      } catch (e) { showToast("Could not fetch city"); }
      setLocating(false);
    }, (err) => { showToast("Enable location services"); setLocating(false); });
  };

  const handleLogout = async () => { try { await signOut(auth); onCancel(); } catch (e) {} };
  const handleDeleteAccount = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteMyProfile(user.uid);
      await deleteUser(auth.currentUser);
      onCancel();
    } catch (e) { showToast("Re-login required"); }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }} 
      className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col font-sans border-r border-white/10 shadow-2xl md:max-w-xl w-full"
    >
      {/* --- WIZARD HEADER --- */}
      <div className="px-6 pt-6 pb-4 bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                {currentStep > 0 ? (
                    <button onClick={handlePrev} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95">
                        <ChevronLeft size={22} className="text-slate-300" />
                    </button>
                ) : (
                    <button onClick={onCancel} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95">
                        <X size={22} className="text-slate-300" />
                    </button>
                )}
                
                <div>
                    <h2 className="text-lg font-black italic tracking-tight uppercase text-white/90">
                        {STEPS[currentStep]}
                    </h2>
                    <div className="flex items-center gap-2">
                        {isSaving ? (
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Saving...</span>
                        ) : (
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><Check size={10}/> Saved</span>
                        )}
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS (Logout / Delete) - Always Accessible */}
            <div className="flex gap-2">
                <button onClick={handleLogout} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut size={18}/>
                </button>
            </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex">
            {STEPS.map((_, i) => (
                <div 
                    key={i}
                    className={`h-full flex-1 transition-all duration-500 ${i <= currentStep ? 'bg-gradient-to-r from-pink-600 to-indigo-600' : 'bg-transparent'} ${i < currentStep ? 'border-r border-black/20' : ''}`}
                />
            ))}
        </div>
      </div>

      {/* --- FORM BODY --- */}
      <div className="flex-1 overflow-y-auto p-5 md:p-8 pb-32 scrollbar-hide">
        
        {/* STEP 1: IDENTITY (Locked for Existing Users) */}
        {currentStep === 0 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                
                {/* 1.1 Read-Only Identity Card (If Existing User) */}
                {isExistingUser ? (
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><User size={100}/></div>
                        
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Identity Verified</h3>
                        
                        <div className="space-y-4 relative z-10">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                                <p className="text-xl font-black text-white">{formData.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Age</label>
                                    <p className="text-lg font-bold text-white">{formData.age}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                                    <p className="text-lg font-bold text-white">{formData.gender || "Not Set"}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Contact</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <ShieldCheck size={14} className="text-emerald-400"/>
                                    <span className="text-sm font-medium text-emerald-400">{formData.phoneNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Mail size={14} className="text-blue-400"/>
                                    <span className="text-sm font-medium text-blue-400">{formData.email || user.email}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-6 italic">Identity details are locked for safety. Contact support to change.</p>
                    </div>
                ) : (
                    // 1.2 Editable Form (New Users Only)
                    <>
                        <SectionHeader icon={<User size={16}/>} title="Identity Setup" desc="Once saved, this cannot be changed." />
                        <InputBox label="Full Name" helper="Real Name Only" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="e.g. Vikram Singh" />
                        <div className="grid grid-cols-2 gap-4">
                            <InputBox label="Age" type="number" value={formData.age} onChange={v => setFormData({...formData, age: v})} placeholder="24" />
                            <SelectionGroup label="Gender" options={[{value: 'Male'}, {value: 'Female'}, {value: 'Other'}]} selected={formData.gender} onSelect={v => setFormData({...formData, gender: v})} />
                        </div>
                        
                        {/* Phone Verification (Only needed for new users) */}
                        <div className="pt-4">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block ml-4">Phone Number</label>
                            {formData.isPhoneVerified ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
                                    <ShieldCheck size={20} className="text-emerald-500"/>
                                    <span className="text-sm font-bold text-emerald-500">{formData.phoneNumber}</span>
                                </div>
                            ) : (
                                <PhoneVerifier 
                                    initialNumber={formData.phoneNumber.replace('+91', '')} 
                                    onVerified={(num) => {
                                        setFormData(prev => ({ ...prev, phoneNumber: num, isPhoneVerified: true }));
                                        saveProfile(user.uid, { phoneNumber: num, isPhoneVerified: true }, [], []); 
                                    }} 
                                />
                            )}
                        </div>
                    </>
                )}

                {/* 1.3 Role Selection (Mutable) */}
                <section className="pt-6 border-t border-white/10">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-4 block tracking-wide">Current Status</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setFormData({...formData, userRole: 'host'})} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${formData.userRole === 'host' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                            <Home size={20}/>
                            <span className="font-bold text-xs">Have Room</span>
                        </button>
                        <button onClick={() => setFormData({...formData, userRole: 'hunter'})} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${formData.userRole === 'hunter' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                            <User size={20}/>
                            <span className="font-bold text-xs">Need Room</span>
                        </button>
                    </div>
                </section>
            </div>
        )}

        {/* STEP 2: DETAILS (Mutable) */}
        {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <InputBox label="Occupation" icon={<Briefcase size={14}/>} value={formData.occupation} onChange={v => setFormData({...formData, occupation: v})} placeholder="Student / Job" />
                
                {/* Location Picker */}
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-black/20 rounded-2xl"><MapPin size={18} className="text-emerald-400"/></div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Location</span>
                            <span className="text-sm font-black text-white block">{locating ? "Locating..." : formData.city}</span>
                        </div>
                    </div>
                    <button onClick={locate} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><RefreshCw size={16}/></button>
                </div>

                {formData.userRole === 'host' ? (
                    <>
                        <InputBox label="Society Name" icon={<Building size={14}/>} value={formData.societyName} onChange={v => setFormData({...formData, societyName: v})} placeholder="e.g. Prestige Shantiniketan" />
                        <SelectionGroup label="Furnishing" options={FURNISHING_OPTS} selected={formData.furnishing} onSelect={v => setFormData({...formData, furnishing: v})} />
                        <div className="grid grid-cols-2 gap-4">
                            <InputBox label="Rent Ask" type="number" icon={<IndianRupee size={14}/>} value={formData.rent} onChange={v => setFormData({...formData, rent: v})} placeholder="15000" />
                            <InputBox label="Available" type="date" value={formData.availableFrom} onChange={v => setFormData({...formData, availableFrom: v})} />
                        </div>
                        {/* Room Photos */}
                        <div className="pt-4 border-t border-white/10">
                            <SectionHeader icon={<ImageIcon size={16}/>} title="Room Photos" desc="Max 3 photos" />
                            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                                <label className="flex-shrink-0 w-24 h-24 bg-white/5 border-dashed border-2 border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50">
                                    {roomPhotoLoading ? <Loader2 className="animate-spin text-emerald-500"/> : <Camera size={20} className="text-slate-500"/>}
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleGenericUpload(e, 'roomImages', 3, setRoomPhotoLoading)} />
                                </label>
                                <AnimatePresence>
                                    {formData.roomImages.map((img, i) => (
                                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} key={i} className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-black">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => removeGenericImage(i, 'roomImages')} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white"><X size={10}/></button>
                                    </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <InputBox label="Move Date" type="date" value={formData.moveInDate} onChange={v => setFormData({...formData, moveInDate: v})} />
                            <InputBox label="Budget" type="number" icon={<IndianRupee size={14}/>} value={formData.rent} onChange={v => setFormData({...formData, rent: v})} placeholder="12000" />
                        </div>
                        <InputBox label="Work Location" icon={<Briefcase size={14}/>} value={formData.workLocation} onChange={v => setFormData({...formData, workLocation: v})} placeholder="e.g. Cyber Hub" />
                    </>
                )}
            </div>
        )}

        {/* STEP 3: PHOTOS & BIO */}
        {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <SectionHeader icon={<Camera size={16}/>} title="My Photos" desc="At least 2 photos required" />
                <div className="grid grid-cols-3 gap-3">
                    <label className="aspect-[3/4] bg-white/5 border-dashed border-2 border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50">
                        {photoLoading ? <Loader2 className="animate-spin text-pink-500"/> : <Camera size={24} className="text-slate-500"/>}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleGenericUpload(e, 'images', 5, setPhotoLoading)} />
                    </label>
                    <AnimatePresence>
                        {formData.images.map((img, i) => (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10">
                            <img src={img} className="w-full h-full object-cover" />
                            {i === 0 && <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] font-bold flex items-center gap-1"><Star size={8} className="text-yellow-400 fill-yellow-400"/> Cover</div>}
                            <button onClick={() => removeGenericImage(i, 'images')} className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-full text-white"><X size={10}/></button>
                        </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <div className="relative group pt-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block ml-4">Bio</label>
                    <textarea 
                        placeholder="I'm a chill person looking for..." 
                        className="w-full bg-white/5 border border-white/10 rounded-3xl p-4 text-sm font-medium text-white outline-none focus:border-pink-500/50 min-h-[100px] resize-none"
                        value={formData.bio || ""} 
                        onChange={e => setFormData({...formData, bio: e.target.value})} 
                    />
                </div>
            </div>
        )}

        {/* STEP 4: LIFESTYLE */}
        {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <SelectionGroup label="Cleanliness" options={DETAILED_PREFS.cleanliness} selected={formData.cleanliness} onSelect={v => setFormData({...formData, cleanliness: v})} />
                <SelectionGroup label="Guest Policy" options={DETAILED_PREFS.guests} selected={formData.guestPolicy} onSelect={v => setFormData({...formData, guestPolicy: v})} />
                
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                    {VIBE_TAGS.map(tag => {
                        const isActive = formData.tags && formData.tags.includes(tag.label);
                        return (
                            <button key={tag.label} type="button" onClick={() => {
                                const currentTags = formData.tags || [];
                                const newTags = isActive ? currentTags.filter(t => t !== tag.label) : [...currentTags, tag.label];
                                setFormData({...formData, tags: newTags});
                            }} className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${isActive ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                {tag.icon} {tag.label}
                            </button>
                        );
                    })}
                </div>

                {/* DANGER ZONE (Delete Account) */}
                <div className="pt-12 mt-8 border-t border-white/5 text-center">
                    <button onClick={handleDeleteAccount} className="text-[10px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors">
                        {confirmDelete ? "Tap again to confirm deletion" : "Delete Account"}
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* --- WIZARD FOOTER --- */}
      <div className="p-6 bg-[#050505] border-t border-white/10 flex justify-between items-center z-50">
        <button onClick={isLastStep ? handleSaveAndClose : handleNext} className="w-full py-4 bg-white text-black rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10">
            {isLastStep ? <>FINISH & SAVE <Save size={18}/></> : <>NEXT STEP <ArrowRight size={18}/></>}
        </button>
      </div>
    </motion.div>
  );
};

// --- HELPER COMPONENTS ---
const SectionHeader = ({ icon, title, desc }) => (
    <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg text-white shadow-lg shadow-pink-500/20">{icon}</div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
        </div>
        {desc && <p className="text-[10px] font-medium text-slate-500 ml-9">{desc}</p>}
    </div>
);

const InputBox = ({ label, helper, icon, value, onChange, type="text", placeholder }) => (
    <div className="relative group">
        <div className="flex justify-between items-baseline mb-1 ml-4">
             <label className="text-[10px] font-bold text-slate-500 uppercase group-focus-within:text-pink-500 transition-colors">{label}</label>
             {helper && <span className="text-[9px] text-slate-600 mr-2">{helper}</span>}
        </div>
        <div className="relative">
            {icon && <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-white transition-colors">{icon}</div>}
            <input 
                type={type}
                placeholder={placeholder}
                className={`w-full bg-white/5 border border-white/10 rounded-3xl py-3 pr-4 text-sm font-bold text-white outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600 ${icon ? 'pl-10' : 'pl-4'} ${type === 'date' ? 'appearance-none' : ''}`}
                value={value || ""}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    </div>
);

const SelectionGroup = ({ label, options, selected, onSelect }) => (
    <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
        <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wide">{label}</p>
        <div className="grid grid-cols-3 gap-2">
            {options.map(opt => {
                const isActive = selected === opt.value;
                return (
                    <button 
                    key={opt.value} 
                    type="button"
                    onClick={() => onSelect(opt.value)}
                    className={`py-3 px-1 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${isActive ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}
                    >
                        {opt.icon && <div className="mb-1">{opt.icon}</div>}
                        <span className="text-[11px] font-black block">{opt.value}</span>
                        {opt.desc && <span className={`text-[8px] font-medium leading-tight block ${isActive ? 'text-slate-600' : 'opacity-50'}`}>{opt.desc}</span>}
                    </button>
                );
            })}
        </div>
    </div>
);