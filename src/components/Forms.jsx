import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, MapPin, Loader2, Check, Mail, User, Briefcase, IndianRupee, 
  RefreshCw, LogOut, Trash2, AlertTriangle, Cloud, 
  Moon, Sun, Coffee, Wine, Gamepad2, Music, Book, Heart, 
  Clock, Home, Zap, ChevronLeft, Sparkles, Star
} from 'lucide-react';
import { saveProfile, deleteMyProfile } from '../services/profileService';
import { compressImage, getCityFromCoordinates } from '../services/utils';
import { signOut, deleteUser } from 'firebase/auth';
import { auth } from '../firebase';

// --- CONSTANTS ---
const VIBE_TAGS = [
  { label: 'Non-Smoker', icon: <Check size={14}/> }, { label: 'Smoker', icon: <Cloud size={14}/> },
  { label: 'Vegetarian', icon: <Check size={14}/> }, { label: 'Non-Veg', icon: <Check size={14}/> },
  { label: 'Drinker', icon: <Wine size={14}/> }, { label: 'Teetotaler', icon: <Check size={14}/> },
  { label: 'Pet Friendly', icon: <Heart size={14}/> }, { label: 'Has Pets', icon: <Heart size={14}/> },
];

const DETAILED_PREFS = {
  cleanliness: [
    { value: 'Relaxed', desc: 'Messy is okay.' },
    { value: 'Moderate', desc: 'Tidy common areas.' },
    { value: 'Sparkling', desc: 'Clean freak.' }
  ],
  guests: [
    { value: 'Rarely', desc: 'Prefer privacy.' },
    { value: 'Weekends', desc: 'Okay on weekends.' },
    { value: 'Anytime', desc: 'House is open.' }
  ],
  noise: [
    { value: 'Quiet', desc: 'Library silence.' },
    { value: 'Moderate', desc: 'TV/Music fine.' },
    { value: 'Loud', desc: 'Party vibe.' }
  ],
  schedule: [
    { value: 'Early Bird', icon: <Sun size={16}/> },
    { value: 'Night Owl', icon: <Moon size={16}/> },
    { value: '9-5 Worker', icon: <Briefcase size={16}/> },
    { value: 'Shift Work', icon: <Clock size={16}/> }
  ],
  social: [
    { value: 'Private', desc: 'Keep to myself.' },
    { value: 'Friendly', desc: 'Chat in kitchen.' },
    { value: 'Besties', desc: 'Do everything.' }
  ]
};

export const CreateProfileForm = ({ user, existingData, onCancel, showToast }) => {
  const [photoLoading, setPhotoLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Ref to prevent re-loading data while user types
  const isLoaded = useRef(false);

  // Initialize state with safe defaults
  const [formData, setFormData] = useState({
    name: user.displayName || "", 
    age: "", 
    occupation: "", 
    rent: "", 
    bio: "", 
    tags: [], 
    images: [], 
    city: "Unknown", 
    lat: null, 
    lng: null,
    cleanliness: "Moderate",
    guestPolicy: "Weekends",
    noiseLevel: "Moderate",
    schedule: "9-5 Worker",
    socialVibe: "Friendly"
  });

  const lastSavedRef = useRef(formData);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    if (!isLoaded.current) {
      if (existingData) {
        // Merge with defaults to ensure no undefined values crash the UI
        const safeData = {
            ...formData,
            ...existingData,
            tags: existingData.tags || [],
            images: existingData.images || [],
            name: existingData.name || user.displayName || "",
            bio: existingData.bio || ""
        };
        setFormData(safeData);
        lastSavedRef.current = safeData;
        isLoaded.current = true;
      } else {
        // New user? Try locating immediately
        locate();
        isLoaded.current = true;
      }
    }
  }, [existingData, user.displayName]);

  // --- 2. PROGRESS CALCULATION (CRASH PROOF) ---
  const completionPercent = useMemo(() => {
    const fields = ['name', 'age', 'rent', 'occupation', 'bio', 'city'];
    // Use String() wrapper to prevent crashes if a field is null/undefined
    let filled = fields.filter(f => formData[f] && String(formData[f]).trim().length > 0).length;
    
    if (formData.images && formData.images.length > 0) filled += 2;
    if (formData.tags && formData.tags.length > 0) filled += 1;
    
    const total = fields.length + 3;
    return Math.round((filled / total) * 100);
  }, [formData]);

  // --- 3. AUTO-SAVE LOGIC (Debounced) ---
  useEffect(() => {
    if (!isLoaded.current) return;

    const isDirty = JSON.stringify(formData) !== JSON.stringify(lastSavedRef.current);
    if (!isDirty) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveProfile(user.uid, formData, [], formData.images);
        lastSavedRef.current = formData;
      } catch (e) {
        console.error("Auto-save failed", e);
      }
      setIsSaving(false);
    }, 3000); // 3-second delay

    return () => clearTimeout(timer);
  }, [formData, user.uid]);

  // --- 4. ACTION HANDLERS ---

  const handleSaveAndClose = async () => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(lastSavedRef.current);
    
    // Cost Saver: If no changes, just close
    if (!isDirty) {
      onCancel(); 
      return;
    }

    setIsSaving(true);
    try {
      await saveProfile(user.uid, formData, [], formData.images);
      showToast("Profile Saved");
      onCancel();
    } catch (e) {
      console.error(e);
      showToast("Error saving profile");
      onCancel(); 
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (formData.images.length + files.length > 5) {
      showToast("Max 5 photos allowed");
      return;
    }
    setPhotoLoading(true);
    try {
      const compressedBatch = await Promise.all(files.map(f => compressImage(f)));
      const newImages = [...formData.images, ...compressedBatch].slice(0, 5);
      
      setFormData(prev => ({ ...prev, images: newImages }));
      
      // Save images immediately
      await saveProfile(user.uid, { ...formData, images: newImages }, [], newImages);
      lastSavedRef.current = { ...formData, images: newImages }; 
      showToast("Photo uploaded");
    } catch (e) {
      showToast("Error uploading image");
    }
    setPhotoLoading(false);
  };

  const removeImage = async (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
    await saveProfile(user.uid, { ...formData, images: newImages }, [], newImages);
    lastSavedRef.current = { ...formData, images: newImages };
  };

  const locate = async () => {
    setLocating(true);
    if (!navigator.geolocation) {
        showToast("Geolocation not supported");
        setLocating(false);
        return;
    }
    navigator.geolocation.getCurrentPosition(async (p) => {
      try {
        const city = await getCityFromCoordinates(p.coords.latitude, p.coords.longitude);
        // FIX: Correctly using 'prev' in callback to avoid ReferenceError
        setFormData(prev => ({ 
          ...prev, 
          lat: p.coords.latitude, 
          lng: p.coords.longitude, 
          city: city || "Unknown"
        }));
        showToast("Location updated");
      } catch (e) { 
        console.error(e);
        showToast("Could not fetch city"); 
      }
      setLocating(false);
    }, (err) => { 
        console.error(err);
        showToast("Enable location services"); 
        setLocating(false); 
    });
  };

  const handleLogout = async () => { try { await signOut(auth); onCancel(); } catch (e) {} };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteMyProfile(user.uid);
      await deleteUser(auth.currentUser);
      onCancel();
    } catch (e) { showToast("Re-login to delete account"); }
  };

  return (
    <motion.div 
      initial={{ x: "-100%" }} 
      animate={{ x: 0 }} 
      exit={{ x: "-100%" }} 
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col font-sans border-r border-white/10 shadow-2xl md:max-w-xl w-full"
    >
      {/* --- HEADER --- */}
      <div className="px-6 pt-6 pb-4 bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <button onClick={handleSaveAndClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95">
                    <ChevronLeft size={22} className="text-slate-300" />
                </button>
                <div>
                    <h2 className="text-xl font-black italic tracking-tight">EDIT PROFILE</h2>
                    <div className="flex items-center gap-2">
                        {isSaving ? (
                            <span className="text-[10px] font-bold text-pink-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> SAVING...</span>
                        ) : (
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><Check size={10}/> SAVED</span>
                        )}
                    </div>
                </div>
            </div>
            
            <button 
              onClick={handleSaveAndClose} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
            >
               DONE
            </button>
        </div>

        {/* Profile Strength Meter */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${completionPercent}%` }} 
                className={`h-full ${completionPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-600 to-indigo-600'}`}
            />
        </div>
        <div className="flex justify-between mt-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Profile Strength</span>
            <span className="text-[9px] font-bold text-white">{completionPercent}%</span>
        </div>
      </div>

      {/* --- FORM BODY --- */}
      <div className="flex-1 overflow-y-auto p-5 md:p-8 pb-32 scrollbar-hide space-y-10">
        
        {/* 1. PHOTOS */}
        <section>
          <SectionHeader icon={<Camera size={16}/>} title="My Photos" desc="First photo is your cover" />
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x pr-4">
            <label className="flex-shrink-0 w-32 h-48 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-pink-500/50 transition-all snap-start group">
                {photoLoading ? <Loader2 className="animate-spin text-pink-500" /> : <Camera size={28} className="text-slate-500 group-hover:text-pink-500 transition-colors" />}
                <span className="text-[10px] text-slate-500 font-bold uppercase mt-2 group-hover:text-white">Add Photo</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>
            
            <AnimatePresence>
                {formData.images.map((img, i) => (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    key={i} 
                    className="relative flex-shrink-0 w-32 h-48 rounded-3xl overflow-hidden group border border-white/10 bg-slate-900 snap-start shadow-xl"
                >
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-50"/>
                    
                    {/* Badge for Main Photo */}
                    {i === 0 && (
                        <div className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                            <Star size={10} className="text-yellow-400 fill-yellow-400"/> 
                            <span className="text-[9px] font-bold">Main</span>
                        </div>
                    )}

                    <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 p-1.5 rounded-full text-white backdrop-blur-md transition-colors">
                        <X size={12} />
                    </button>
                </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </section>

        {/* 2. BASICS */}
        <section className="space-y-5">
           <SectionHeader icon={<User size={16}/>} title="The Essentials" desc="Introduce yourself" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputBox label="Full Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="e.g. Vikram" />
              <div className="grid grid-cols-2 gap-4">
                 <InputBox label="Age" type="number" value={formData.age} onChange={v => setFormData({...formData, age: v})} placeholder="24" />
                 <InputBox label="Budget" type="number" icon={<IndianRupee size={14}/>} value={formData.rent} onChange={v => setFormData({...formData, rent: v})} placeholder="15000" />
              </div>
           </div>
           <InputBox label="Occupation" icon={<Briefcase size={14}/>} value={formData.occupation} onChange={v => setFormData({...formData, occupation: v})} placeholder="Student / Professional" />
           
           <div className="relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase absolute left-4 top-3 group-focus-within:text-pink-500 transition-colors">Bio</label>
              <textarea 
                placeholder="I'm a chill person looking for..." 
                className="w-full bg-white/5 border border-white/10 rounded-3xl pt-8 pb-4 px-4 text-sm font-medium text-white outline-none focus:border-pink-500/50 focus:bg-white/10 min-h-[100px] leading-relaxed resize-none transition-all placeholder:text-slate-600"
                value={formData.bio || ""} 
                onChange={e => setFormData({...formData, bio: e.target.value})} 
              />
           </div>
        </section>

        {/* 3. AGREEMENT */}
        <section className="space-y-8">
            <SectionHeader icon={<Home size={16}/>} title="Roommate Agreement" desc="Set your boundaries" />
            
            <SelectionGroup label="Cleanliness Level" options={DETAILED_PREFS.cleanliness} selected={formData.cleanliness} onSelect={v => setFormData({...formData, cleanliness: v})} />
            <SelectionGroup label="Guest Policy" options={DETAILED_PREFS.guests} selected={formData.guestPolicy} onSelect={v => setFormData({...formData, guestPolicy: v})} />
            <SelectionGroup label="Noise Tolerance" options={DETAILED_PREFS.noise} selected={formData.noiseLevel} onSelect={v => setFormData({...formData, noiseLevel: v})} />

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><Clock size={12}/> Daily Schedule</p>
                    <div className="grid grid-cols-2 gap-2">
                        {DETAILED_PREFS.schedule.map(opt => (
                            <button key={opt.value} type="button" 
                                onClick={() => setFormData({...formData, schedule: opt.value})}
                                className={`p-3 rounded-2xl border text-[10px] font-bold flex flex-col items-center gap-2 transition-all ${formData.schedule === opt.value ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}
                            >
                                {opt.icon} {opt.value}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><Zap size={12}/> Social Battery</p>
                    <div className="space-y-2">
                        {DETAILED_PREFS.social.map(opt => (
                            <button key={opt.value} type="button" 
                                onClick={() => setFormData({...formData, socialVibe: opt.value})}
                                className={`w-full p-3 px-4 rounded-2xl border text-left flex justify-between items-center transition-all ${formData.socialVibe === opt.value ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}
                            >
                                <span className="text-[11px] font-bold">{opt.value}</span>
                                {formData.socialVibe === opt.value && <Check size={14}/>}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
        </section>

        {/* 4. TRAITS */}
        <section>
          <SectionHeader icon={<Sparkles size={16}/>} title="Vibe Check" desc="Select all that apply" />
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map(tag => {
               const isActive = formData.tags && formData.tags.includes(tag.label);
               return (
                 <motion.button 
                   whileTap={{ scale: 0.95 }}
                   key={tag.label} type="button" onClick={() => {
                      const currentTags = formData.tags || [];
                      const newTags = isActive ? currentTags.filter(t => t !== tag.label) : [...currentTags, tag.label];
                      setFormData({...formData, tags: newTags});
                   }}
                   className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${isActive ? 'bg-gradient-to-r from-pink-600 to-rose-500 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                 >
                   {tag.icon} {tag.label}
                 </motion.button>
               );
            })}
          </div>
        </section>

        {/* 5. DANGER ZONE */}
        <section className="pt-8 border-t border-white/10">
          <div className="bg-gradient-to-r from-slate-900 to-slate-900/50 p-4 rounded-3xl border border-white/10 mb-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl"><MapPin size={18} className="text-emerald-400"/></div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current City</span>
                      <span className="text-sm font-black text-white">{locating ? "Updating..." : formData.city}</span>
                  </div>
              </div>
              <button onClick={locate} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-colors"><RefreshCw size={16}/></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={handleLogout} className="p-4 rounded-3xl border border-white/10 text-slate-300 font-bold flex items-center justify-center gap-2 text-xs hover:bg-white/5 transition-colors">
                <LogOut size={16} /> Logout
            </button>
            <button type="button" onClick={handleDeleteAccount} className="p-4 rounded-3xl border border-red-500/20 text-red-500 font-bold flex items-center justify-center gap-2 text-xs hover:bg-red-500/10 transition-colors">
                {confirmDelete ? "Tap to Confirm" : "Delete Account"}
            </button>
          </div>
        </section>
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

const InputBox = ({ label, icon, value, onChange, type="text", placeholder }) => (
    <div className="relative group">
        <label className="text-[10px] font-bold text-slate-500 uppercase absolute left-4 top-3 group-focus-within:text-pink-500 transition-colors">{label}</label>
        {icon && <div className="absolute left-4 bottom-3 text-slate-400 group-focus-within:text-white transition-colors">{icon}</div>}
        <input 
            type={type}
            placeholder={placeholder}
            className={`w-full bg-white/5 border border-white/10 rounded-3xl pt-8 pb-3 pr-4 text-sm font-bold text-white outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600 ${icon ? 'pl-10' : 'pl-4'}`}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
        />
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
                        <span className="text-[11px] font-black block">{opt.value}</span>
                        <span className={`text-[8px] font-medium leading-tight block ${isActive ? 'text-slate-600' : 'opacity-50'}`}>{opt.desc}</span>
                    </button>
                );
            })}
        </div>
    </div>
);