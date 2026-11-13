import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  Calendar,
  CheckCircle2,
  Gift,
  IdCard,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wifi,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  detectAirtelNumber,
  useKyc,
  type CarrierType,
  type IdDocumentType,
} from '@/lib/kyc';

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
    record,
    loading,
    needsKyc,
    onboardingOpen,
    setOnboardingOpen,
    submitKyc,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useKyc();
  const { toast } = useToast();

  // Step 1: Mandatory KYC fields, Step 2: Airtel 200MB Phone Verification
  const [step, setStep] = useState<1 | 2>(1);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState<IdDocumentType>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [submittingKyc, setSubmittingKyc] = useState(false);

  // Step 2: Phone + Airtel OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [carrier, setCarrier] = useState<CarrierType>('airtel');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Pre-fill name from connected Google profile if available
  useEffect(() => {
    if (!fullName && user?.google?.name) {
      setFullName(user.google.name);
    }
  }, [user?.google?.name, fullName]);

  // Keep modal strictly locked on Step 1 when KYC is not yet completed
  useEffect(() => {
    if (needsKyc) {
      setStep(1);
      setOnboardingOpen(true);
    }
  }, [needsKyc, setOnboardingOpen]);

  // Auto-detect Airtel carrier as user types phone number
  useEffect(() => {
    if (phoneNumber.replace(/\D/g, '').length >= 4) {
      if (detectAirtelNumber(phoneNumber)) {
        setCarrier('airtel');
      }
    }
  }, [phoneNumber]);

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

  const handleSubmitStep1 = async (e: React.FormEvent) => {
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
        idType,
        idNumber: idNumber.trim(),
      });
      toast({
        title: 'Identity Verified!',
        description: 'Next: Verify your Airtel number to unlock your 200MB data bonus.',
      });
      setStep(2);
    } catch (err: any) {
      toast({
        title: 'KYC Validation Error',
        description: err?.message || 'Please check your KYC details.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingKyc(false);
    }
  };

  const handleSendOtp = async () => {
    if (phoneNumber.replace(/\D/g, '').length < 7) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Enter a valid mobile number (e.g. 08021234567 or +2348021234567).',
        variant: 'destructive',
      });
      return;
    }
    setSendingOtp(true);
    try {
      const res = await sendPhoneOtp(phoneNumber, carrier);
      setOtpSentTo(res.maskedPhone);
      setPreviewOtp(res.previewOtp ?? null);
      toast({
        title: 'Verification Code Sent',
        description: `Enter the 6-digit OTP sent to ${res.maskedPhone}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to Send OTP',
        description: err?.message || 'Could not send verification code.',
        variant: 'destructive',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      toast({
        title: 'Enter 6-Digit Code',
        description: 'Please enter the full 6-digit verification code.',
        variant: 'destructive',
      });
      return;
    }
    setVerifyingOtp(true);
    try {
      const updated = await verifyPhoneOtp(otpCode.trim());
      toast({
        title:
          updated.carrier === 'airtel'
            ? 'Airtel Phone Verified!'
            : 'Phone Number Verified!',
        description:
          updated.carrier === 'airtel'
            ? 'Now play any game (Pool, Wheel of Fortune, or Markets) to unlock your 200MB Airtel bonus!'
            : 'Your phone number is verified and linked to your profile.',
      });
      setOnboardingOpen(false);
    } catch (err: any) {
      toast({
        title: 'Verification Failed',
        description: err?.message || 'Invalid or expired verification code.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="my-auto w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#0D1217] p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Header & Step Progress */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80]">
              {step === 1 ? <UserCheck size={22} /> : <Wifi size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#4ADE80] font-bold">
                  STEP {step} OF 2 · SIGNUP KYC
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">
                {step === 1 ? 'Complete Identity Verification' : 'Verify Phone & Unlock 200MB'}
              </h2>
            </div>
          </div>

          {step === 1 && (
            <button
              type="button"
              onClick={() => void logout()}
              title="Sign out"
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#121820] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={12} />
              <span>Sign out</span>
            </button>
          )}
        </div>

        {/* Promised Airtel 200MB Data Bonus Banner */}
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-[#240B12] via-[#171219] to-[#0E1813] p-3.5 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
            <Gift size={18} />
          </div>
          <div className="text-xs leading-relaxed">
            <div className="flex flex-wrap items-center gap-1.5 font-bold text-white">
              <span>Airtel 200MB Free Data Bonus</span>
              <span className="rounded-md bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-300">
                AIRTEL PROMO
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-300">
              Airtel users who <strong className="text-white">verify their phone number</strong> during signup and <strong className="text-[#4ADE80]">play any game</strong> receive <strong className="text-[#FACC15]">200MB FREE data</strong>.
            </p>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSubmitStep1} className="space-y-3.5">
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
                  placeholder="First & Last Name (as on ID)"
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

              <div>
                <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 mb-1">
                  <IdCard size={11} className="text-[#4ADE80]" />
                  ID Document Type <span className="text-rose-400">*</span>
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as IdDocumentType)}
                  className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white focus:border-[#22C55E] focus:outline-none"
                >
                  <option value="national_id">National ID / NIN</option>
                  <option value="passport">International Passport</option>
                  <option value="drivers_license">Driver&apos;s License</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ID Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Last 4+ characters"
                  className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none"
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
                I certify I am <strong>18+</strong>, the KYC details above are accurate, and I agree to SIDEBET&apos;s responsible trading terms.
              </span>
            </label>

            <button
              type="submit"
              disabled={submittingKyc}
              className="w-full rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-xs font-black text-black shadow-lg shadow-[#22C55E]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submittingKyc ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={16} />}
              <span>{submittingKyc ? 'Verifying KYC...' : 'Submit KYC & Continue to Airtel Phone Bonus'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#080C0F] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Phone size={14} className="text-[#4ADE80]" />
                  Mobile Network &amp; Number
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  KYC Verified: {record?.fullName || fullName}
                </span>
              </div>

              {/* Network selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCarrier('airtel')}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    carrier === 'airtel'
                      ? 'border-rose-500/60 bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
                      : 'border-white/10 bg-[#121820] text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Airtel (200MB Bonus)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCarrier('other')}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    carrier === 'other'
                      ? 'border-[#22C55E]/50 bg-[#121B16] text-[#4ADE80]'
                      : 'border-white/10 bg-[#121820] text-slate-400 hover:text-white'
                  }`}
                >
                  Other Network
                </button>
              </div>

              {/* Phone input + Send OTP */}
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0802 123 4567 or +2348021234567"
                  className="flex-1 rounded-xl border border-white/10 bg-[#0E1318] px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="rounded-xl bg-[#22C55E] hover:bg-[#16A34A] px-4 py-2.5 text-xs font-black text-black whitespace-nowrap disabled:opacity-50"
                >
                  {sendingOtp ? 'Sending...' : otpSentTo ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>

              {carrier === 'airtel' && (
                <p className="text-[11px] text-rose-300/90">
                  Airtel eligible: Verify OTP below, then play any game (including Free Practice 8-Ball Pool) to claim 200MB!
                </p>
              )}
            </div>

            {otpSentTo && (
              <div className="rounded-2xl border border-[#22C55E]/30 bg-[#0B1711] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">
                    Enter 6-digit OTP sent to <span className="font-mono text-[#4ADE80]">{otpSentTo}</span>
                  </span>
                </div>

                {previewOtp && (
                  <div className="rounded-xl border border-[#FACC15]/30 bg-[#17160F] px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Verification Code:</span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(previewOtp)}
                      className="font-mono font-black text-[#FACC15] hover:underline"
                      title="Click to autofill OTP"
                    >
                      {previewOtp} (tap to fill)
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit OTP code"
                  className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-[0.35em] text-white placeholder:tracking-normal placeholder:text-xs placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="w-full rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-xs font-black text-black shadow-lg shadow-[#22C55E]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verifyingOtp ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>{verifyingOtp ? 'Verifying Code...' : 'Verify Phone & Finish Signup'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOnboardingOpen(false)}
              className="w-full rounded-xl border border-white/10 bg-[#121820] hover:bg-[#16202a] py-2.5 text-[11px] font-semibold text-slate-300 transition-colors"
            >
              Skip phone check for now (verify later in Profile)
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
