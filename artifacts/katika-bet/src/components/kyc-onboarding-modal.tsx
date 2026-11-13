import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  Calendar,
  Loader2,
  LogOut,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useKyc } from '@/lib/kyc';

const COUNTRIES = [
  'Nigeria',
  'Kenya',
  'Ghana',
  'South Africa',
  'Uganda',
  'Tanzania',
  'United Kingdom',
  'United States',
  'Canada',
  'India',
  'Other',
];

export function KycOnboardingModal() {
  const { authenticated, user, logout } = usePrivy();
  const {
    loading,
    needsKyc,
    onboardingOpen,
    setOnboardingOpen,
    submitKyc,
  } = useKyc();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [address, setAddress] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [submittingKyc, setSubmittingKyc] = useState(false);

  // Pre-fill name from connected Google profile if available
  useEffect(() => {
    if (!fullName && user?.google?.name) {
      setFullName(user.google.name);
    }
  }, [user?.google?.name, fullName]);

  // Keep modal strictly locked until Level 1 signup KYC is completed
  useEffect(() => {
    if (needsKyc) {
      setOnboardingOpen(true);
    }
  }, [needsKyc, setOnboardingOpen]);

  if (!authenticated || loading) return null;
  if (!needsKyc && !onboardingOpen) return null;

  const computeAge = (val: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
    const [y, m, d] = val.split('-').map(Number);
    const now = new Date();
    let age = now.getUTCFullYear() - y;
    const diff = now.getUTCMonth() - (m - 1);
    if (diff < 0 || (diff === 0 && now.getUTCDate() < d)) age--;
    return age;
  };

  const age = computeAge(dob);
  const maxDobDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  const handleSubmitLevel1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please confirm you are 18+ and agree to SIDEBET terms.',
        variant: 'destructive',
      });
      return;
    }
    if (age === null || age < 18) {
      toast({
        title: 'Age Requirement',
        description: 'You must be at least 18 years old to create an account.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingKyc(true);
    try {
      await submitKyc({
        fullName: fullName.trim(),
        dob,
        country,
        address: address.trim(),
      });
      toast({
        title: 'Level 1 Verification Complete!',
        description: 'Welcome to SIDEBET. You can upgrade to Level 2 ID verification anytime under Profile.',
      });
      setOnboardingOpen(false);
    } catch (err: any) {
      toast({
        title: 'Verification Error',
        description: err?.message || 'Please check your profile details.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingKyc(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="my-auto w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#0D1217] p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80]">
              <UserCheck size={22} />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#4ADE80] font-bold">
                LEVEL 1 KYC · QUICK SIGNUP
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">
                Complete Basic Profile Verification
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            title="Sign out"
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#121820] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={12} />
            <span>Sign out</span>
          </button>
        </div>

        <p className="rounded-2xl border border-white/[0.06] bg-[#080C0F] px-3.5 py-2.5 text-[11px] text-slate-300 leading-relaxed">
          No ID document is required at signup. Government ID upload is part of <strong className="text-white">Level 2 KYC</strong> inside your Profile later.
        </p>

        <form onSubmit={handleSubmitLevel1} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Full Legal Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First & Last Name"
                className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} className="text-[#4ADE80]" />
                  Date of Birth <span className="text-rose-400">*</span>
                </span>
                {age !== null && (
                  <span
                    className={`font-mono text-[10px] ${
                      age >= 18 ? 'text-[#4ADE80]' : 'text-rose-400'
                    }`}
                  >
                    {age >= 18 ? `${age} yrs (18+ OK)` : `${age} yrs (Must be 18+)`}
                  </span>
                )}
              </label>
              <input
                type="date"
                required
                max={maxDobDate}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Country <span className="text-rose-400">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white focus:border-[#22C55E] focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 mb-1">
                <MapPin size={11} className="text-[#4ADE80]" />
                Residential Address / City <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City & State"
                className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-[#080C0F] p-3 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#22C55E]"
            />
            <span>
              I certify I am <strong>18+</strong>, the profile details above are accurate, and I agree to SIDEBET&apos;s responsible trading terms.
            </span>
          </label>

          <button
            type="submit"
            disabled={submittingKyc}
            className="w-full rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-xs font-black text-black shadow-lg shadow-[#22C55E]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submittingKyc ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={16} />}
            <span>{submittingKyc ? 'Completing Signup...' : 'Complete Signup & Enter SIDEBET'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
