const LandingPage = ({ onLogin }) => (
  <div className="max-w-4xl mx-auto px-6 py-20">
    <nav className="flex justify-between mb-20">
      <h1 className="text-2xl font-black italic">VIBE.</h1>
      <button onClick={onLogin} className="bg-white text-black px-6 py-2 rounded-full font-bold">Login</button>
    </nav>
    
    <header className="text-center mb-20">
      <h2 className="text-6xl font-black mb-6 tracking-tighter">Find your perfect <br/><span className="text-pink-600">roommate vibe.</span></h2>
      <p className="text-slate-400 text-lg max-w-xl mx-auto">
        Stop swiping on boring listings. Vibe connects you with roommates based on lifestyle, budget, and personality. Join thousands of students and professionals in India finding better living spaces.
      </p>
    </header>

    <section className="grid md:grid-cols-3 gap-8 mb-20">
      <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10">
        <h3 className="font-bold mb-2 text-pink-500">Lifestyle Matching</h3>
        <p className="text-sm text-slate-400">Early bird or night owl? Find someone who matches your clock.</p>
      </div>
      <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10">
        <h3 className="font-bold mb-2 text-pink-500">Verified Profiles</h3>
        <p className="text-sm text-slate-400">Secure Google authentication ensures you only meet real people.</p>
      </div>
      <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10">
        <h3 className="font-bold mb-2 text-pink-500">Budget Filter</h3>
        <p className="text-sm text-slate-400">Set your rent range and find spaces that fit your wallet.</p>
      </div>
    </section>

    <footer className="border-t border-white/10 pt-10 flex gap-6 text-xs text-slate-500 font-bold uppercase">
      <a href="/privacy" className="hover:text-white">Privacy Policy</a>
      <a href="/terms" className="hover:text-white">Terms of Service</a>
      <span>© 2026 Vibe Roommate Finder</span>
    </footer>
  </div>
);