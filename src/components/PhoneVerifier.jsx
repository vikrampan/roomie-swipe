import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase'; 
import { RecaptchaVerifier, signInWithPhoneNumber, linkWithPhoneNumber } from 'firebase/auth';
import { Phone, CheckCircle, Loader2, Send, RefreshCw, KeyRound } from 'lucide-react';

export const PhoneVerifier = ({ onVerified, initialNumber }) => {
  const [phoneNumber, setPhoneNumber] = useState(initialNumber || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('INPUT'); // INPUT, OTP, VERIFIED
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Ref to hold the verifier instance so it doesn't get lost on re-renders
  const recaptchaVerifierRef = useRef(null);

  // --- 1. SETUP RECAPTCHA ON MOUNT ---
  useEffect(() => {
    // Only initialize if the container exists in the DOM
    const container = document.getElementById('recaptcha-container');
    
    if (container && !recaptchaVerifierRef.current) {
        try {
            // We use 'invisible' so it doesn't pop up unless suspicious
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    console.log("Recaptcha Verified Automatically");
                },
                'expired-callback': () => {
                    setError("Recaptcha expired. Please refresh the page.");
                    setLoading(false);
                }
            });
        } catch (e) {
            console.error("Recaptcha Init Error:", e);
        }
    }

    // CLEANUP: Destroy verifier when this component leaves the screen
    return () => {
        if (recaptchaVerifierRef.current) {
            try {
                recaptchaVerifierRef.current.clear();
                recaptchaVerifierRef.current = null;
            } catch (e) {
                console.error(e);
            }
        }
    };
  }, []); 

  // --- 2. SEND SMS (Smart Linking) ---
  const onSignInSubmit = async () => {
    setError('');
    
    // Basic validation for Indian numbers (10 digits starting with 6-9)
    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(phoneNumber)) {
        setError("Enter a valid 10-digit Indian number");
        return;
    }

    const formattedNumber = "+91" + phoneNumber;
    setLoading(true);

    try {
      if (!recaptchaVerifierRef.current) {
          throw new Error("Recaptcha not initialized. Refresh page.");
      }

      const appVerifier = recaptchaVerifierRef.current;
      let confirmationResult;

      // ✅ CRITICAL FIX: Link to existing Google User instead of creating new account
      if (auth.currentUser) {
          // This tries to LINK the phone to the currently logged-in user
          confirmationResult = await linkWithPhoneNumber(auth.currentUser, formattedNumber, appVerifier);
      } else {
          // Fallback: Normal Phone Sign-in
          confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      }
      
      // Store result globally/locally to confirm later
      window.confirmationResult = confirmationResult;
      
      setStep('OTP');
      setLoading(false);
      
    } catch (error) {
      console.error("SMS Error:", error);
      setLoading(false);
      
      // ✅ SPECIFIC ERROR HANDLING FOR YOUR CONSOLE LOGS
      if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/account-exists-with-different-credential') {
        setError("This number is already linked to another account.");
      } else if (error.code === 'auth/invalid-app-credential') {
        setError("Domain not authorized in Firebase Console.");
      } else if (error.code === 'auth/too-many-requests') {
        setError("Too many attempts. Try again later.");
      } else if (error.code === 'auth/invalid-phone-number') {
        setError("Invalid phone number format.");
      } else {
        setError("SMS failed. " + error.message);
      }
    }
  };

  // --- 3. VERIFY OTP ---
  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Confirm the code
      await window.confirmationResult.confirm(otp);
      
      setStep('VERIFIED');
      setLoading(false);
      
      // Notify parent component to update FormData
      if (onVerified) {
        onVerified("+91" + phoneNumber);
      }
      
    } catch (error) {
      setLoading(false);
      console.error("OTP Error:", error);
      
      // Handle the case where the user entered the code correctly but the merge failed
      if (error.code === 'auth/credential-already-in-use') {
         setError("This number is already taken by another user.");
      } else {
         setError("Invalid OTP. Please check the code.");
      }
    }
  };

  // --- 4. RENDER STATES ---

  // State A: Success
  if (step === 'VERIFIED') {
      return (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/20">
                      <CheckCircle size={20} />
                  </div>
                  <div>
                      <p className="text-sm font-bold text-emerald-500">Verified</p>
                      <p className="text-xs text-emerald-400/80 tracking-wider">+91 {phoneNumber}</p>
                  </div>
              </div>
          </div>
      );
  }

  // State B: Input & OTP
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 relative">
      
      {/* ⚠️ INVISIBLE RECAPTCHA CONTAINER (REQUIRED) */}
      <div id="recaptcha-container"></div> 
      
      <div className="flex items-center gap-2 mb-1">
          <Phone size={16} className="text-pink-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {step === 'INPUT' ? 'Verify Phone Number' : 'Enter OTP Code'}
          </h3>
      </div>

      {step === 'INPUT' && (
        <div className="flex gap-2">
            <div className="bg-black/40 border border-white/10 rounded-2xl px-3 flex items-center justify-center text-sm font-bold text-slate-400 select-none">
                +91
            </div>
            <input 
                type="tel" 
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-pink-500/50 transition-colors placeholder:text-slate-600"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g,'').slice(0,10))} 
                disabled={loading}
            />
            <button 
                onClick={onSignInSubmit}
                disabled={loading || phoneNumber.length !== 10}
                className="bg-white text-black px-4 rounded-2xl font-bold text-xs disabled:opacity-50 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center min-w-[50px] shadow-lg"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
            </button>
        </div>
      )}

      {step === 'OTP' && (
        <div className="space-y-3 animate-in slide-in-from-right-4">
            <p className="text-xs text-slate-400 flex items-center gap-1">
                Code sent to <span className="text-white font-bold">+91 {phoneNumber}</span>
            </p>
            
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <KeyRound size={16} className="absolute left-4 top-3.5 text-slate-500"/>
                    <input 
                        type="number" 
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 pl-10 text-lg font-bold text-white outline-none focus:border-pink-500/50 transition-colors tracking-[0.3em] text-center"
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.slice(0,6))}
                        disabled={loading}
                        autoFocus
                    />
                </div>
                <button 
                    onClick={verifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="bg-emerald-500 text-white px-6 rounded-2xl font-bold text-xs disabled:opacity-50 hover:bg-emerald-400 transition-colors flex items-center justify-center shadow-lg shadow-emerald-500/20"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : "Confirm"}
                </button>
            </div>
            
            <div className="flex justify-between items-center pt-1">
                <button 
                    onClick={() => {
                        setStep('INPUT');
                        setOtp('');
                        setError('');
                    }} 
                    className="text-[10px] text-slate-500 underline hover:text-white transition-colors"
                >
                    Wrong Number?
                </button>
                <button 
                    onClick={onSignInSubmit} 
                    disabled={loading}
                    className="text-[10px] text-pink-500 hover:text-pink-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={10}/> Resend SMS
                </button>
            </div>
        </div>
      )}

      {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
      )}
    </div>
  );
};