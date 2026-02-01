import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase'; 
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Phone, CheckCircle, Loader2, Send, RefreshCw } from 'lucide-react';

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
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved automatically
                    console.log("Recaptcha Verified");
                },
                'expired-callback': () => {
                    setError("Recaptcha expired. Refresh and try again.");
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
  }, []); // Empty dependency array = run once on mount

  // --- 2. SEND SMS ---
  const onSignInSubmit = async () => {
    setError('');
    
    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(phoneNumber)) {
        setError("Enter a valid 10-digit Indian number");
        return;
    }

    const formattedNumber = "+91" + phoneNumber;
    setLoading(true);

    try {
      // Ensure verifier exists
      if (!recaptchaVerifierRef.current) {
          throw new Error("Recaptcha not initialized. Refresh page.");
      }

      const appVerifier = recaptchaVerifierRef.current;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      
      // Success
      window.confirmationResult = confirmationResult;
      setStep('OTP');
      setLoading(false);
      
    } catch (error) {
      console.error("SMS Error:", error);
      setLoading(false);
      
      if (error.code === 'auth/too-many-requests') {
        setError("Too many attempts. Try again later.");
      } else if (error.code === 'auth/invalid-phone-number') {
        setError("Invalid phone number.");
      } else {
        setError("SMS failed. Try reloading the page.");
      }
    }
  };

  // --- 3. VERIFY OTP ---
  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await window.confirmationResult.confirm(otp);
      setStep('VERIFIED');
      onVerified("+91" + phoneNumber); 
    } catch (error) {
      setLoading(false);
      setError("Invalid OTP. Please check again.");
    }
  };

  // --- 4. RENDER ---
  if (step === 'VERIFIED') {
      return (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-full text-white">
                      <CheckCircle size={20} />
                  </div>
                  <div>
                      <p className="text-sm font-bold text-emerald-500">Verified</p>
                      <p className="text-xs text-emerald-400/80">+91 {phoneNumber}</p>
                  </div>
              </div>
              {/* Optional: Allow change number */}
          </div>
      );
  }

  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 relative">
      
      {/* ⚠️ CRITICAL: THIS DIV MUST ALWAYS BE RENDERED */}
      <div id="recaptcha-container"></div> 
      
      <div className="flex items-center gap-2 mb-1">
          <Phone size={16} className="text-pink-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {step === 'INPUT' ? 'Verify Phone Number' : 'Enter OTP Code'}
          </h3>
      </div>

      {step === 'INPUT' && (
        <div className="flex gap-2">
            <div className="bg-black/40 border border-white/10 rounded-2xl px-3 flex items-center justify-center text-sm font-bold text-slate-400">
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
                className="bg-white text-black px-4 rounded-2xl font-bold text-xs disabled:opacity-50 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center min-w-[50px]"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
            </button>
        </div>
      )}

      {step === 'OTP' && (
        <div className="space-y-3">
            <p className="text-xs text-slate-400">Code sent to +91 {phoneNumber}</p>
            <div className="flex gap-2">
                <input 
                    type="number" 
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xl font-bold text-white outline-none focus:border-pink-500/50 transition-colors tracking-[0.5em] text-center"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                />
                <button 
                    onClick={verifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="bg-emerald-500 text-white px-6 rounded-2xl font-bold text-xs disabled:opacity-50 hover:bg-emerald-400 transition-colors flex items-center justify-center"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : "Confirm"}
                </button>
            </div>
            <div className="flex justify-between items-center">
                <button onClick={() => {
                    setStep('INPUT');
                    setOtp('');
                }} className="text-[10px] text-slate-500 underline hover:text-white">
                    Wrong Number?
                </button>
                <button onClick={onSignInSubmit} className="text-[10px] text-pink-500 hover:text-pink-400 flex items-center gap-1">
                    <RefreshCw size={10}/> Resend SMS
                </button>
            </div>
        </div>
      )}

      {error && (
          <p className="text-xs font-bold text-red-500 bg-red-500/10 p-2 rounded-lg text-center animate-pulse border border-red-500/20">
              {error}
          </p>
      )}
    </div>
  );
};