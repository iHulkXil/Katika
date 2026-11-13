import { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Check } from 'lucide-react';

export function ComplianceModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('sidebet_terms_accepted');
    if (!accepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('sidebet_terms_accepted', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0D1217] p-6 shadow-2xl space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80]">
          <ShieldCheck size={28} />
        </div>

        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#4ADE80] font-bold">
            COMPLIANCE & TERMS
          </span>
          <h2 className="text-xl font-extrabold font-display text-white mt-1">
            Age Gate & Responsible Trading
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed text-left bg-[#080C0F] p-4 rounded-2xl border border-white/5 space-y-2">
          <span>
            1. You verify you are at least <strong>18 years of age</strong> (or legal age in your jurisdiction).
          </span>
          <br />
          <span>
            2. You understand prediction markets and binary contracts carry financial risk. Only trade what you can afford.
          </span>
          <br />
          <span>
            3. All global prediction markets and events are settled via decentralized consensus oracles and verified public sources.
          </span>
        </p>

        <button
          type="button"
          onClick={handleAccept}
          className="w-full rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-xs font-black text-black shadow-lg shadow-[#22C55E]/25 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <Check size={16} />
          <span>I am 18+ and Agree to Terms</span>
        </button>
      </div>
    </div>
  );
}
