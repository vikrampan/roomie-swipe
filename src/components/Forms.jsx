import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, MapPin, Loader2, Sparkles, Check } from 'lucide-react';
import { saveProfile } from '../services/profileService';
import { compressImage, getCityFromCoordinates } from '../services/utils';

const LIFESTYLE_TAGS = [
  { label: 'Early Bird', icon: '🌅' }, { label: 'Night Owl', icon: '🦉' },
  { label: 'Veg Only', icon: '🥗' }, { label: 'Party Vibe', icon: '🎉' },
  { label: 'Gym Freak', icon: '💪' }, { label: 'Pet Lover', icon: '🐶' },
  { label: 'Studious', icon: '📚' }, { label: 'Non-Smoker', icon: '🚭' }
];

export const CreateProfileForm = ({ user, existingData, onCancel, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(existingData || {
    name: user.displayName || "", age: "", occupation: "", rent: "", bio: "", tags: [], images: []
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const compressed = await Promise.all(files.map(f => compressImage(f)));
    setFormData({ ...formData, images: [...formData.images, ...compressed].slice(0, 4) });
  };

  const locate = async () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (p) => {
      const city = await getCityFromCoordinates(p.coords.latitude, p.coords.longitude);
      setFormData({ ...formData, lat: p.coords.latitude, lng: p.coords.longitude, city });
      setLoading(false);
      showToast("Location locked!");
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveProfile(user.uid, formData);
      showToast("Profile Live! 🔥");
      onCancel();
    } catch (err) { showToast("Error saving profile", "error"); }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl my-auto">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-white italic tracking-tighter">Your Vibe.</h2>
            <button onClick={onCancel} className="p-2 bg-white/5 rounded-full text-slate-400"><X/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IMAGE GRID */}
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden">
                {formData.images[i] ? (
                  <img src={formData.images[i]} className="w-full h-full object-cover" />
                ) : (
                  <label className="cursor-pointer p-4"><Camera className="text-slate-600"/><input type="file" hidden onChange={handleImageUpload} multiple/></label>
                )}
              </div>
            ))}
          </div>

          <input placeholder="Display Name" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white outline-none focus:border-pink-500" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required />
          
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Age" type="number" className="bg-white/5 p-4 rounded-2xl border border-white/10 text-white outline-none" value={formData.age} onChange={e=>setFormData({...formData, age: e.target.value})} required />
            <button type="button" onClick={locate} className="bg-pink-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" size={18}/> : <><MapPin size={18}/> {formData.city || "Locate"}</>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {LIFESTYLE_TAGS.map(tag => (
              <button key={tag.label} type="button" onClick={() => {
                const tags = formData.tags.includes(tag.label) ? formData.tags.filter(t=>t!==tag.label) : [...formData.tags, tag.label];
                setFormData({...formData, tags});
              }} className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${formData.tags.includes(tag.label) ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                {tag.icon} {tag.label} {formData.tags.includes(tag.label) && <Check size={12}/>}
              </button>
            ))}
          </div>

          <input placeholder="Budget (₹/month)" type="number" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white outline-none focus:border-emerald-500" value={formData.rent} onChange={e=>setFormData({...formData, rent: e.target.value})} required />
          
          <textarea placeholder="Your roommate bio... (e.g. Clean, loves to cook)" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-white outline-none h-24" value={formData.bio} onChange={e=>setFormData({...formData, bio: e.target.value})} />

          <button type="submit" disabled={loading} className="w-full bg-white text-black font-black py-5 rounded-2xl text-xl shadow-[0_10px_30px_rgba(255,255,255,0.2)] active:scale-95 transition-all">
            GO LIVE 🚀
          </button>
        </form>
      </div>
    </motion.div>
  );
};