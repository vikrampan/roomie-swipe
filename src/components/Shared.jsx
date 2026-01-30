import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, CheckCircle, AlertCircle, ShieldCheck, Flame } from 'lucide-react';

export const Toast = ({ message, type }) => (
  <motion.div initial={{ y: 50, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.9 }} className={`fixed bottom-24 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center justify-center gap-3 font-bold backdrop-blur-xl border ${type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-emerald-500/90 border-emerald-400 text-white'}`}>
    {type === 'error' ? <AlertCircle size={24}/> : <CheckCircle size={24}/>} 
    <span className="text-sm md:text-base">{message}</span>
  </motion.div>
);

export const LocationInput = ({ onSelect, placeholder = "Search city..." }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${text}&limit=5`);
        const data = await res.json();
        setSuggestions(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, 400); 
  };

  return (
    <div className="relative w-full z-50">
      <div className="relative group">
        <input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder={placeholder} className="w-full p-3 pl-10 rounded-2xl bg-slate-800/80 backdrop-blur-md text-white border border-slate-700/50 outline-none focus:border-pink-500/50 focus:bg-slate-800 transition-all placeholder-slate-500 shadow-lg"/>
        <Search className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-pink-500 transition-colors" size={18} />
        {loading && <Loader2 className="absolute right-3 top-3.5 animate-spin text-pink-500" size={18} />}
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-[60]">
          {suggestions.map((place) => (
            <li key={place.place_id} onClick={() => { onSelect({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), name: place.display_name.split(",")[0] }); setQuery(place.display_name.split(",")[0]); setSuggestions([]); }} className="p-4 hover:bg-slate-800 cursor-pointer text-sm border-b border-slate-800 last:border-0 flex justify-between items-center transition-colors">
              <span className="font-bold text-white text-base">{place.display_name.split(",")[0]}</span>
              <span className="text-xs text-slate-500 truncate max-w-[120px]">{place.display_name.split(",").slice(1).join(",")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const LoginScreen = ({ onLogin }) => (
  <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-950 overflow-hidden font-sans">
    <div className="absolute top-[-20%] left-[-20%] w-[150vw] h-[150vw] bg-pink-600/10 rounded-full blur-[100px] animate-pulse" />
    <div className="absolute bottom-[-20%] right-[-20%] w-[150vw] h-[150vw] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
    <div className="z-10 text-center p-6 w-full max-w-sm relative">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="mb-12">
        <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-[0_20px_50px_rgba(236,72,153,0.3)] rotate-6 mb-8 border-4 border-white/10 backdrop-blur-sm">
          <Flame size={48} className="text-white drop-shadow-md" fill="white" />
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tight drop-shadow-lg">
          Roomie<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">Swipe</span>
        </h1>
        <p className="text-slate-400 text-lg font-light">Global Vibe Check. 🌍</p>
      </motion.div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={onLogin} className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] transition-all">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G" />
        Continue with Google
      </motion.button>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 flex justify-center gap-4 text-slate-500 text-xs font-medium flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 rounded-full border border-slate-800"><CheckCircle size={12} className="text-green-500"/> Verified Profiles</div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 rounded-full border border-slate-800"><ShieldCheck size={12} className="text-blue-500"/> Safe & Secure</div>
      </motion.div>
    </div>
  </div>
);