import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, MapPin, Loader2, Check, User, Briefcase, IndianRupee, 
  LocateFixed, LogOut, Cloud, Moon, Sun, Wine, Heart, 
  Clock, Home, ChevronLeft, Star,
  Building, ArrowRight, Save, Image as ImageIcon, ShieldCheck, Send, KeyRound, Phone, Trash2,
  AlertCircle, MessageSquareWarning 
} from 'lucide-react';
import { saveProfile, deleteMyProfile } from '../services/profileService';
import { compressImage, getCityFromCoordinates } from '../services/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut, deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { auth, storage } from '../firebase';
import { PhoneVerifier } from './PhoneVerifier'; 
import { BugReportModal } from './Modals'; 

// ==========================================
// 1. HELPER COMPONENTS
// ==========================================

const SectionHeader = memo(({ icon, title, desc }) => (
    <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg text-white shadow-lg shadow-pink-500/20">{icon}</div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
        </div>
        {desc && <p className="text-[10px] font-medium text-slate-500 ml-9">{desc}</p>}
    </div>
));

const InputBox = memo(({ label, helper, icon, value, onChange, type="text", placeholder }) => (
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
));

const SelectionGroup = memo(({ label, options, selected, onSelect }) => (
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
                    className={`py-3 px-1 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${isActive ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}
                    >
                        {opt.icon && <div className="mb-1">{opt.icon}</div>}
                        <span className="text-[11px] font-black block">{opt.value}</span>
                        {opt.desc && <span className={`text-[8px] font-medium leading-tight block ${isActive ? 'text-slate-600' : 'opacity-50'}`}>{opt.desc}</span>}
                    </button>
                );
            })}
        </div>
    </div>
));

const WizardHeader = memo(({ currentStep, onCancel, onPrev, isSaving }) => (
    <div className="px-6 py-4 bg-black/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 flex-none">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                {currentStep > 0 ? (
                    <button onClick={onPrev} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95"><ChevronLeft size={22} className="text-slate-300" /></button>
                ) : (
                    <button onClick={onCancel} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95"><X size={22} className="text-slate-300" /></button>
                )}
                <div>
                    <h2 className="text-lg font-black italic tracking-tight uppercase text-white/90">{STEPS[currentStep]}</h2>
                    <div className="flex items-center gap-2">
                        {isSaving ? (
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Saving...</span>
                        ) : (
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><Check size={10}/> Saved</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex">
            {STEPS.map((_, i) => (
                <div key={i} className={`h-full flex-1 transition-all duration-500 ${i <= currentStep ? 'bg-gradient-to-r from-pink-600 to-indigo-600' : 'bg-transparent'} ${i < currentStep ? 'border-r border-black/20' : ''}`} />
            ))}
        </div>
    </div>
));

// ==========================================
// 2. ISOLATED STEP COMPONENTS
// ==========================================

const IdentityStep = memo(({ formData, updateField, isExistingUser }) => {
    
    // Callback when phone is successfully verified
    const handlePhoneVerified = useCallback((verifiedNumber) => {
        updateField('phoneNumber', verifiedNumber);
        updateField('isPhoneVerified', true);
    }, [updateField]);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
            {/* 1. DEMOGRAPHICS - LOCKED FOR EXISTING, OPEN FOR NEW */}
            {isExistingUser ? (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] border border-white/10 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><User size={100}/></div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Identity Secured</h3>
                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Verified Name</label>
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
                    </div>
                </div>
            ) : (
                <>
                    <SectionHeader icon={<User size={16}/>} title="Identity Setup" desc="Standard verification for community safety." />
                    <InputBox label="Full Name" helper="Real Name Only" value={formData.name} onChange={v => updateField('name', v)} placeholder="e.g. Vikram Singh" />
                    <div className="grid grid-cols-2 gap-4">
                        <InputBox label="Age" type="number" value={formData.age} onChange={v => updateField('age', v)} placeholder="24" />
                        <SelectionGroup label="Gender" options={[{value: 'Male'}, {value: 'Female'}, {value: 'Other'}]} selected={formData.gender} onSelect={v => updateField('gender', v)} />
                    </div>
                </>
            )}
            
            {/* 2. PHONE VERIFICATION - ALWAYS VISIBLE SO USER CAN ADD LATER */}
            <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-2 ml-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Verification</label>
                    {!formData.isPhoneVerified && <span className="text-[9px] font-bold text-pink-500 uppercase tracking-tighter">Optional for now</span>}
                </div>
                
                {formData.isPhoneVerified ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={20} className="text-emerald-500"/>
                            <div>
                                <p className="text-sm font-bold text-emerald-500">Verified Number</p>
                                <p className="text-xs text-emerald-400/80">{formData.phoneNumber}</p>
                            </div>
                        </div>
                        <Check size={16} className="text-emerald-500" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <PhoneVerifier 
                            initialNumber={formData.phoneNumber} 
                            onVerified={handlePhoneVerified} 
                        />
                        <div className="px-4 flex items-start gap-2 opacity-60">
                            <AlertCircle size={12} className="text-slate-400 mt-0.5" />
                            <p className="text-[9px] font-medium text-slate-400 leading-relaxed">
                                You can skip this step and start browsing, but a verified badge increases match rates by 3x.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. ROLE SELECTION */}
            <section className="pt-6 border-t border-white/10">
                <label className="text-xs font-bold text-slate-500 uppercase mb-4 block tracking-wide">Select your role</label>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => updateField('userRole', 'host')} className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all active:scale-95 ${formData.userRole === 'host' ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        <Home size={24}/>
                        <span className="font-bold text-xs">Have Room</span>
                    </button>
                    <button onClick={() => updateField('userRole', 'hunter')} className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all active:scale-95 ${formData.userRole === 'hunter' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        <User size={24}/>
                        <span className="font-bold text-xs">Need Room</span>
                    </button>
                </div>
            </section>
        </div>
    );
});

const DetailsStep = memo(({ formData, updateField, showToast }) => {
    const [locating, setLocating] = useState(false);
    const [uploadingRoom, setUploadingRoom] = useState(false);

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
            updateField('lat', p.coords.latitude);
            updateField('lng', p.coords.longitude);
            updateField('city', city || "Unknown");
            showToast("Location updated");
          } catch (e) { showToast("Could not fetch city"); }
          setLocating(false);
        }, (err) => { showToast("Enable location services"); setLocating(false); });
    };

    const handleRoomImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        if ((formData.roomImages?.length || 0) + files.length > 5) {
            showToast("Max 5 room photos allowed");
            return;
        }
        setUploadingRoom(true);
        try {
            const uploadPromises = files.map(async (file, index) => {
                const blob = await compressImage(file);
                const fileName = `room_${Date.now()}_${index}.webp`;
                const storageRef = ref(storage, `users/${auth.currentUser.uid}/${fileName}`);
                await uploadBytes(storageRef, blob);
                return await getDownloadURL(storageRef);
            });
            const newUrls = await Promise.all(uploadPromises);
            updateField('roomImages', [...(formData.roomImages || []), ...newUrls]);
            showToast(`${newUrls.length} photos added`);
        } catch (error) { showToast("Upload failed"); }
        setUploadingRoom(false);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300 pb-8">
            <InputBox label="Occupation" icon={<Briefcase size={14}/>} value={formData.occupation} onChange={v => updateField('occupation', v)} placeholder="e.g. Software Engineer" />
            
            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/20 rounded-2xl"><MapPin size={18} className="text-emerald-400"/></div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Current City</span>
                        <span className="text-sm font-black text-white block">{locating ? "Locating..." : formData.city}</span>
                    </div>
                </div>
                <button onClick={locate} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white">
                    <LocateFixed size={20}/>
                </button>
            </div>

            {formData.userRole === 'host' ? (
                <>
                    <SectionHeader icon={<Home size={16}/>} title="Room Details" desc="Details help hunters filter better" />
                    <InputBox label="Society Name" icon={<Building size={14}/>} value={formData.societyName} onChange={v => updateField('societyName', v)} placeholder="e.g. Godrej Eternity" />
                    <SelectionGroup label="Furnishing" options={FURNISHING_OPTS} selected={formData.furnishing} onSelect={v => updateField('furnishing', v)} />
                    <div className="grid grid-cols-2 gap-4">
                        <InputBox label="Rent Ask" type="number" icon={<IndianRupee size={14}/>} value={formData.rent} onChange={v => updateField('rent', v)} placeholder="15000" />
                        <InputBox label="Available From" type="date" value={formData.availableFrom} onChange={v => updateField('availableFrom', v)} />
                    </div>
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-3 block ml-4">Room Photos (Max 5)</label>
                        <div className="grid grid-cols-3 gap-3">
                            <label className="aspect-square bg-white/5 border-dashed border-2 border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 transition-colors">
                                {uploadingRoom ? <Loader2 className="animate-spin text-pink-500"/> : <ImageIcon size={20} className="text-slate-500"/>}
                                <span className="text-[9px] font-bold text-slate-500 mt-2">ADD</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleRoomImageUpload} />
                            </label>
                            <AnimatePresence>
                                {(formData.roomImages || []).map((img) => (
                                    <motion.div key={img} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => updateField('roomImages', formData.roomImages.filter(url => url !== img))} className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors">
                                            <Trash2 size={10}/>
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <InputBox label="Move-in Date" type="date" value={formData.moveInDate} onChange={v => updateField('moveInDate', v)} />
                        <InputBox label="Monthly Budget" type="number" icon={<IndianRupee size={14}/>} value={formData.rent} onChange={v => updateField('rent', v)} placeholder="12000" />
                    </div>
                    <InputBox label="Preferred Work Area" icon={<Briefcase size={14}/>} value={formData.workLocation} onChange={v => updateField('workLocation', v)} placeholder="e.g. Whitefield / Tech Park" />
                </>
            )}
        </div>
    );
});

const PhotosStep = memo(({ formData, updateField, user, showToast }) => {
    const [photoLoading, setPhotoLoading] = useState(false);

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (formData.images.length + files.length > 5) {
          showToast("Max 5 photos allowed");
          return;
        }
        setPhotoLoading(true);
        try {
          const uploadPromises = files.map(async (file, index) => {
            const blob = await compressImage(file);
            const fileName = `images_${Date.now()}_${index}.webp`;
            const storageRef = ref(storage, `users/${user.uid}/${fileName}`);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
          });
          const urls = await Promise.all(uploadPromises);
          updateField('images', [...formData.images, ...urls]);
        } catch (error) { showToast("Upload failed"); }
        setPhotoLoading(false);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300 pb-8">
            <SectionHeader icon={<Camera size={16}/>} title="Profile Photos" desc="Show your best self" />
            <div className="grid grid-cols-3 gap-3">
                <label className="aspect-[3/4] bg-white/5 border-dashed border-2 border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 transition-colors">
                    {photoLoading ? <Loader2 className="animate-spin text-pink-500"/> : <Camera size={24} className="text-slate-500"/>}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                </label>
                <AnimatePresence>
                    {formData.images.map((img, i) => (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg">
                        <img src={img} className="w-full h-full object-cover" />
                        {i === 0 && <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] font-bold flex items-center gap-1"><Star size={8} className="text-yellow-400 fill-yellow-400"/> Cover</div>}
                        <button onClick={() => updateField('images', formData.images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500/80 transition-colors"><X size={10}/></button>
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <div className="relative group pt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block ml-4">Bio</label>
                <textarea 
                    placeholder="Write a short intro..." 
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-4 text-sm font-medium text-white outline-none focus:border-pink-500/50 min-h-[120px] resize-none focus:bg-white/10 transition-colors"
                    value={formData.bio || ""} 
                    onChange={e => updateField('bio', e.target.value)} 
                />
            </div>
        </div>
    );
});

// ✅ UPDATED: LifestyleStep includes Bug Report Button
const LifestyleStep = memo(({ formData, updateField, user, onCancel, onReportBug }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); 

    const handleLogout = async () => { 
        try { await signOut(auth); window.location.reload(); } catch (e) { console.error(e); } 
    };

    const handleDeleteAccount = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        setIsDeleting(true); 

        try {
            await deleteMyProfile(user.uid);
            try {
                await deleteUser(auth.currentUser);
            } catch (error) {
                if (error.code === 'auth/requires-recent-login') {
                    const provider = new GoogleAuthProvider();
                    await reauthenticateWithPopup(auth.currentUser, provider);
                    await deleteUser(auth.currentUser);
                } else { throw error; }
            }
            await signOut(auth);
            sessionStorage.clear(); 
            localStorage.clear();   
            window.location.href = "/";
        } catch (e) {
            console.error("Delete failed:", e);
            alert("Could not delete account: " + e.message);
            setIsDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300 pb-20">
            <SelectionGroup label="Cleanliness" options={DETAILED_PREFS.cleanliness} selected={formData.cleanliness} onSelect={v => updateField('cleanliness', v)} />
            <SelectionGroup label="Guest Policy" options={DETAILED_PREFS.guests} selected={formData.guestPolicy} onSelect={v => updateField('guestPolicy', v)} />
            
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                {VIBE_TAGS.map(tag => {
                    const isActive = formData.tags && formData.tags.includes(tag.label);
                    return (
                        <button key={tag.label} type="button" onClick={() => {
                            const newTags = isActive ? formData.tags.filter(t => t !== tag.label) : [...formData.tags, tag.label];
                            updateField('tags', newTags);
                        }} className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${isActive ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                            {tag.icon} {tag.label}
                        </button>
                    );
                })}
            </div>

            {/* SETTINGS SECTION */}
            <div className="pt-8 mt-8 border-t border-white/5 flex flex-col gap-4">
                <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Settings</span>
                    
                    {/* ✅ Report Bug Button */}
                    <button 
                        onClick={onReportBug}
                        className="w-full text-left flex items-center gap-3 text-xs font-bold text-slate-300 hover:text-white transition-colors py-2"
                    >
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400"><MessageSquareWarning size={14}/></div>
                        Report Bug / Feedback
                    </button>

                    <div className="h-[1px] bg-white/5 w-full"/>

                    <div className="flex justify-between items-center">
                        <button onClick={handleLogout} className="text-xs font-bold text-white hover:text-slate-300 transition-colors flex items-center gap-2">
                            <LogOut size={14} /> Sign Out
                        </button>
                        
                        <button 
                            onClick={handleDeleteAccount} 
                            disabled={isDeleting}
                            className={`text-xs font-bold transition-colors flex items-center gap-2 ${confirmDelete ? "text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg" : "text-slate-500"}`}
                        >
                            {isDeleting ? <><Loader2 size={12} className="animate-spin"/> Erasing...</> : (confirmDelete ? "Confirm?" : "Delete Account")}
                        </button>
                    </div>
                </div>
                {isDeleting && <p className="text-center text-[9px] text-red-500 animate-pulse uppercase font-black">Permanent Wipe in progress...</p>}
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---
export const CreateProfileForm = ({ user, existingData, onCancel, showToast }) => {
  const [currentStep, setCurrentStep] = useState(0); 
  const [isSaving, setIsSaving] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false); // ✅ Local State for Bug Modal
  const isLoaded = useRef(false);

  const [formData, setFormData] = useState({
    name: "", age: "", gender: "Male",
    occupation: "", rent: "", bio: "", 
    tags: [], images: [], roomImages: [], 
    city: "Unknown", lat: null, lng: null,
    phoneNumber: "", isPhoneVerified: false,
    userRole: "hunter", 
    societyName: "", furnishing: "Semi-Furnished", availableFrom: "", 
    moveInDate: "", workLocation: "", teamUp: false, 
    cleanliness: "Moderate", guestPolicy: "Weekends", schedule: "9-5 Worker", socialVibe: "Friendly"
  });

  const lastSavedRef = useRef(formData);

  const isExistingUser = useMemo(() => {
      return existingData && existingData.name && existingData.name.length > 0;
  }, [existingData]);

  useEffect(() => {
    if (!isLoaded.current) {
      if (existingData) {
        const safeData = {
            ...formData,
            ...existingData,
            tags: existingData.tags || [],
            images: existingData.images || [],
            roomImages: existingData.roomImages || [],
            name: existingData.name || "",
            bio: existingData.bio || "",
            userRole: existingData.userRole || "hunter"
        };
        setFormData(safeData);
        lastSavedRef.current = safeData;
        isLoaded.current = true;
      } else {
        isLoaded.current = true;
      }
    }
  }, [existingData]);

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

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNext = () => {
     if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
     else handleSaveAndClose();
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

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <>
        <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }} 
        className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col font-sans md:max-w-xl w-full mx-auto md:border-x md:border-white/10 shadow-2xl h-[100dvh]" 
        >
        <WizardHeader currentStep={currentStep} onCancel={onCancel} onPrev={() => setCurrentStep(prev => prev - 1)} isSaving={isSaving} />
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8 scrollbar-hide pb-32">
            {currentStep === 0 && <IdentityStep formData={formData} updateField={updateField} isExistingUser={isExistingUser} />}
            {currentStep === 1 && <DetailsStep formData={formData} updateField={updateField} showToast={showToast} />}
            {currentStep === 2 && <PhotosStep formData={formData} updateField={updateField} user={user} showToast={showToast} />}
            {currentStep === 3 && (
                <LifestyleStep 
                    formData={formData} 
                    updateField={updateField} 
                    user={user} 
                    onCancel={onCancel}
                    onReportBug={() => setShowBugModal(true)} // ✅ Trigger
                />
            )}
        </div>
        <div className="flex-none p-6 bg-[#050505] border-t border-white/10 flex justify-between items-center z-50 pb-8 md:pb-6">
            <button onClick={isLastStep ? handleSaveAndClose : handleNext} className="w-full py-4 bg-white text-black rounded-full font-black text-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/10">
                {isLastStep ? <>FINISH & SAVE <Save size={18}/></> : <>NEXT STEP <ArrowRight size={18}/></>}
            </button>
        </div>
        </motion.div>

        {/* ✅ RENDER BUG MODAL */}
        <AnimatePresence>
            {showBugModal && <BugReportModal user={user} onClose={() => setShowBugModal(false)} />}
        </AnimatePresence>
    </>
  );
};

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