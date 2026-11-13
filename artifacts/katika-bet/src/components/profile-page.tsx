import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { usePrivy, useLogout } from '@privy-io/react-auth';
import { BetHistory } from '@/components/bet-history';
import { getTelegramUser, isTelegramWebApp } from '@/lib/telegram';
import { useUserAvatar, saveCustomAvatar } from '@/lib/avatar';
import { processImageFile } from '@/lib/avatar-upload';
import { detectAirtelNumber, useKyc, type CarrierType, type IdDocumentType } from '@/lib/kyc';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  WalletCards,
  ArrowUpRight,
  Settings,
  Volume2,
  VolumeX,
  Vibrate,
  LogOut,
  History,
  Camera,
  RotateCcw,
  Check,
  Image as ImageIcon,
  ShieldCheck,
  Gift,
  Phone,
  CheckCircle2,
  Loader2,
  Wifi,
  IdCard,
  Lock,
} from 'lucide-react';

const ID_TYPE_LABELS: Record<IdDocumentType, string> = {
  national_id: 'National ID / NIN',
  passport: 'International Passport',
  drivers_license: "Driver's License",
};

export function ProfilePage() {
  const { user, authenticated, login } = usePrivy();
  const { logout } = useLogout();
  const { toast } = useToast();
  const tgUser = getTelegramUser();
  const { avatarUrl, hasCustomAvatar } = useUserAvatar();
  const {
    record: kycRecord,
    isLevel2Complete,
    setOnboardingOpen,
    submitLevel2Kyc,
    sendPhoneOtp,
    verifyPhoneOtp,
    claimAirtelBonus,
  } = useKyc();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('sidebet_sound') !== 'false');
  const [hapticEnabled, setHapticEnabled] = useState(() => localStorage.getItem('sidebet_haptic') !== 'false');
  const [showHistory, setShowHistory] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Level 2 KYC (ID document)
  const [idType, setIdType] = useState<IdDocumentType>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [submittingLevel2, setSubmittingLevel2] = useState(false);
  const [editingLevel2, setEditingLevel2] = useState(false);

  // Inline phone verification for Airtel 200MB bonus
  const [phoneInput, setPhoneInput] = useState('');
  const [carrierInput, setCarrierInput] = useState<CarrierType>('airtel');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otpSentChannel, setOtpSentChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [otpCapability, setOtpCapability] = useState<{
    whatsappLive: boolean;
    smsLive: boolean;
    whatsappMode: string;
  } | null>(null);

  useEffect(() => {
    const baseApi = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
    void fetch(`${baseApi}/kyc/otp-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.whatsappLive === 'boolean') setOtpCapability(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (phoneInput.replace(/\D/g, '').length >= 4 && detectAirtelNumber(phoneInput)) {
      setCarrierInput('airtel');
    }
  }, [phoneInput]);

  useEffect(() => { localStorage.setItem('sidebet_sound', soundEnabled ? 'true' : 'false'); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem('sidebet_haptic', hapticEnabled ? 'true' : 'false'); }, [hapticEnabled]);

  const displayName =
    kycRecord?.fullName ||
    tgUser?.first_name ||
    user?.google?.name ||
    user?.twitter?.name ||
    user?.farcaster?.displayName ||
    user?.email?.address ||
    user?.google?.email ||
    'Pro Trader';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await processImageFile(file, 400, 400);
      saveCustomAvatar(dataUrl);
      toast({
        title: 'Profile Picture Updated',
        description: 'Your new avatar is now active across SIDEBET.',
      });
      setShowAvatarEditor(false);
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err?.message || 'Could not process image file.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCustomUrl = () => {
    const trimmed = avatarUrlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/|^data:image\/|^\/assets\//i.test(trimmed)) {
      toast({
        title: 'Invalid Image URL',
        description: 'Please enter a valid https:// image link or upload a photo.',
        variant: 'destructive',
      });
      return;
    }
    saveCustomAvatar(trimmed);
    setAvatarUrlInput('');
    setShowAvatarEditor(false);
    toast({
      title: 'Profile Picture Updated',
      description: 'Custom profile picture saved.',
    });
  };

  const handleResetToConnected = () => {
    saveCustomAvatar(null);
    setShowAvatarEditor(false);
    toast({
      title: 'Synced to Connected Account',
      description: 'Your profile picture now follows your connected sign-in account.',
    });
  };

  const handleSendPhoneOtp = async () => {
    if (phoneInput.replace(/\D/g, '').length < 7) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Enter a valid Airtel or mobile phone number.',
        variant: 'destructive',
      });
      return;
    }
    setSendingOtp(true);
    try {
      const res = await sendPhoneOtp(phoneInput, carrierInput, otpChannel);
      setOtpSentTo(res.maskedPhone);
      setOtpSentChannel(res.channel ?? otpChannel);
      setPreviewOtp(res.previewOtp ?? null);
      toast({
        title: res.channel === 'sms' ? 'SMS OTP Sent' : 'WhatsApp OTP Sent',
        description: `6-digit verification code sent via ${res.channel === 'sms' ? 'SMS' : 'WhatsApp'} to ${res.maskedPhone}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to Send OTP',
        description: err?.message || 'Could not send OTP.',
        variant: 'destructive',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (otpInput.trim().length !== 6) return;
    setVerifyingOtp(true);
    try {
      const updated = await verifyPhoneOtp(otpInput.trim());
      setOtpSentTo(null);
      setPreviewOtp(null);
      setOtpInput('');
      toast({
        title: updated.carrier === 'airtel' ? 'Airtel Line Verified!' : 'Phone Verified!',
        description:
          updated.airtelBonusStatus === 'unlocked'
            ? 'Your 200MB Airtel Data Bonus is unlocked and ready to claim below!'
            : updated.carrier === 'airtel'
            ? 'Play any game (e.g. Free Practice 8-Ball Pool) to unlock your 200MB Airtel bonus!'
            : 'Phone number linked to your account.',
      });
    } catch (err: any) {
      toast({
        title: 'Verification Failed',
        description: err?.message || 'Invalid OTP code.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleClaimBonus = async () => {
    setClaimingBonus(true);
    try {
      const updated = await claimAirtelBonus();
      toast({
        title: '200MB Airtel Data Claimed!',
        description: `Voucher ${updated.airtelVoucherCode || 'AIRTEL-200MB'} issued to ${updated.maskedPhone || 'your Airtel number'}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Cannot Claim Yet',
        description: err?.message || 'Verify an Airtel number and play a game first.',
        variant: 'destructive',
      });
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleSubmitLevel2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idNumber.trim().length < 4) {
      toast({
        title: 'Invalid ID Number',
        description: 'Enter at least 4 characters from your government-issued ID.',
        variant: 'destructive',
      });
      return;
    }
    setSubmittingLevel2(true);
    try {
      await submitLevel2Kyc({ idType, idNumber: idNumber.trim() });
      setIdNumber('');
      setEditingLevel2(false);
      toast({
        title: 'Level 2 KYC Verified!',
        description: 'Your government ID document has been verified on your profile.',
      });
    } catch (err: any) {
      toast({
        title: 'Level 2 Verification Failed',
        description: err?.message || 'Could not verify ID document.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingLevel2(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 pb-24 space-y-5">
      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Profile Card with Avatar */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setShowAvatarEditor(!showAvatarEditor)}
              title="Change profile picture"
              className="group relative h-14 w-14 overflow-hidden rounded-full border-2 border-[#22c55e]/50 bg-[#121820] ring-2 ring-black/40 shrink-0"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Trader Profile"
                  className="h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
              {authenticated && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-[#0E1318]" />
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-display text-white">{displayName}</h1>
                {authenticated && (
                  <span className="rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#4ade80]">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {isTelegramWebApp() ? 'Telegram Mini App Account' : 'Multi-Chain Web Session'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAvatarEditor(!showAvatarEditor)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121820] hover:border-[#22c55e]/50 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors"
          >
            <Camera size={13} className="text-[#4ade80]" />
            <span>{showAvatarEditor ? 'Close' : 'Edit Photo'}</span>
          </button>
        </div>

        {/* Profile Picture Customization Drawer */}
        {showAvatarEditor && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#080C0F] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ImageIcon size={14} className="text-[#4ade80]" />
                <span>Profile Picture Settings</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {hasCustomAvatar ? 'Custom Avatar Active' : 'Synced with Connected Account'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] px-3.5 py-2 text-xs font-bold text-black transition-all disabled:opacity-50"
              >
                <Camera size={13} />
                <span>{uploadingAvatar ? 'Processing...' : 'Upload Photo'}</span>
              </button>

              {hasCustomAvatar && (
                <button
                  type="button"
                  onClick={handleResetToConnected}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121820] hover:bg-[#18222b] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all"
                >
                  <RotateCcw size={13} className="text-[#4ade80]" />
                  <span>Use Connected Account</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="url"
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
                placeholder="Or paste an image URL (https://...)"
                className="flex-1 rounded-xl border border-white/10 bg-[#0E1318] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-[#4ade80] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveCustomUrl}
                disabled={!avatarUrlInput.trim()}
                className="inline-flex items-center gap-1 rounded-xl border border-[#22c55e]/40 bg-[#121B16] px-3 py-2 text-xs font-bold text-[#4ade80] hover:bg-[#16251d] disabled:opacity-40"
              >
                <Check size={13} />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated KYC Verification Section (Level 1 + Level 2) */}
      <section id="kyc-section" className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-[#4ade80]" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">KYC Verification</h2>
              <p className="text-[10px] text-slate-400">Tiered identity status for your SIDEBET account</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
              isLevel2Complete
                ? 'bg-[#22c55e]/15 border border-[#22c55e]/35 text-[#4ade80]'
                : kycRecord?.kycCompleted
                ? 'bg-sky-500/15 border border-sky-500/35 text-sky-300'
                : 'bg-amber-500/15 border border-amber-500/35 text-amber-300'
            }`}
          >
            {isLevel2Complete ? (
              <>
                <CheckCircle2 size={11} /> LEVEL 2 VERIFIED
              </>
            ) : kycRecord?.kycCompleted ? (
              <>
                <CheckCircle2 size={11} /> LEVEL 1 VERIFIED
              </>
            ) : (
              <>
                <Lock size={11} /> UNVERIFIED
              </>
            )}
          </span>
        </div>

        {/* Level 1 KYC Card */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#080C0F] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#4ade80] font-bold">
                Level 1 · Basic Profile (Completed at Signup)
              </span>
              <h3 className="text-xs font-bold text-white mt-0.5">Personal Identity &amp; Age Check (18+)</h3>
            </div>
            {kycRecord?.kycCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#4ade80]">
                <CheckCircle2 size={10} /> PASSED
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="rounded-full bg-[#22c55e] px-3 py-1 text-[10px] font-black text-black"
              >
                Complete Level 1
              </button>
            )}
          </div>

          {kycRecord?.kycCompleted ? (
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] border-t border-white/5">
              <div>
                <span className="text-slate-500 block font-mono text-[9px] uppercase">Full Name</span>
                <span className="font-semibold text-white">{kycRecord.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-mono text-[9px] uppercase">Date of Birth</span>
                <span className="font-mono text-white">{kycRecord.dob} (18+)</span>
              </div>
              <div>
                <span className="text-slate-500 block font-mono text-[9px] uppercase">Country</span>
                <span className="text-slate-200">{kycRecord.country}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-mono text-[9px] uppercase">Address</span>
                <span className="text-slate-200 truncate block">{kycRecord.address}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Complete Level 1 basic identity (name, DOB, country, address) to unlock trading and Level 2 verification.
            </p>
          )}
        </div>

        {/* Level 2 KYC Card (ID Document) */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#080C0F] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300">
                <IdCard size={16} />
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-sky-300 font-bold block">
                  Level 2 · Government ID Document
                </span>
                <h3 className="text-xs font-bold text-white">Enhanced Verification</h3>
              </div>
            </div>

            {isLevel2Complete ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#4ade80]">
                  <CheckCircle2 size={10} /> VERIFIED
                </span>
                <button
                  type="button"
                  onClick={() => setEditingLevel2(!editingLevel2)}
                  className="text-[10px] font-semibold text-slate-400 hover:text-white underline"
                >
                  {editingLevel2 ? 'Cancel' : 'Update ID'}
                </button>
              </div>
            ) : (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                OPTIONAL UPGRADE
              </span>
            )}
          </div>

          {isLevel2Complete && !editingLevel2 ? (
            <div className="grid grid-cols-2 gap-2.5 pt-2 text-[11px] border-t border-white/5">
              <div>
                <span className="text-slate-500 block font-mono text-[9px] uppercase">Document Type</span>
                <span className="font-semibold text-white">
                  {kycRecord?.idType ? ID_TYPE_LABELS[kycRecord.idType] : 'Government ID'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-mono text-[9px] uppercase">ID Number</span>
                <span className="font-mono text-[#4ade80]">{kycRecord?.idNumberMasked}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitLevel2} className="space-y-3 pt-1 border-t border-white/5">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Submit a valid government ID document to upgrade your account to <strong className="text-white">Level 2 KYC</strong> for higher withdrawal &amp; market limits.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    ID Document Type
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as IdDocumentType)}
                    className="w-full rounded-xl border border-white/10 bg-[#0E1318] px-3 py-2 text-xs text-white focus:border-[#22c55e] focus:outline-none"
                  >
                    <option value="national_id">National ID / NIN</option>
                    <option value="passport">International Passport</option>
                    <option value="drivers_license">Driver&apos;s License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    ID Document Number
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Enter ID number (4+ chars)"
                    className="w-full rounded-xl border border-white/10 bg-[#0E1318] px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#22c55e] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingLevel2 || !kycRecord?.kycCompleted}
                className="w-full rounded-xl bg-[#22c55e] hover:bg-[#16a34a] py-2.5 text-xs font-black text-black shadow-md shadow-[#22c55e]/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submittingLevel2 ? <Loader2 size={14} className="animate-spin" /> : <IdCard size={14} />}
                <span>{submittingLevel2 ? 'Verifying Document...' : 'Verify Level 2 ID Document'}</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Post-Signup Airtel 200MB Data Offer Card */}
      <section id="airtel-offer" className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-[#200C12] via-[#13131A] to-[#0B1610] p-5 space-y-3 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Gift size={17} />
            </div>
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">Airtel 200MB Data Offer</h2>
              <p className="text-[11px] text-slate-300">Verify an Airtel phone number &amp; play any game</p>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#FACC15]">
            {kycRecord?.airtelBonusStatus === 'claimed'
              ? 'CLAIMED'
              : kycRecord?.airtelBonusStatus === 'unlocked'
              ? 'READY TO CLAIM'
              : kycRecord?.airtelBonusStatus === 'pending_game'
              ? 'PLAY 1 GAME'
              : 'STEP 1: PHONE'}
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={13}
              className={
                kycRecord?.phoneVerified && kycRecord?.carrier === 'airtel'
                  ? 'text-[#4ade80]'
                  : 'text-slate-600'
              }
            />
            <span className={kycRecord?.phoneVerified && kycRecord?.carrier === 'airtel' ? 'text-white font-semibold' : 'text-slate-400'}>
              {kycRecord?.phoneVerified
                ? `Phone Verified: ${kycRecord.maskedPhone} (${kycRecord.carrier === 'airtel' ? 'Airtel' : 'Other Network'})`
                : '1. Verify your Airtel phone number'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={13}
              className={(kycRecord?.gamesPlayedCount ?? 0) > 0 ? 'text-[#4ade80]' : 'text-slate-600'}
            />
            <span className={(kycRecord?.gamesPlayedCount ?? 0) > 0 ? 'text-white font-semibold' : 'text-slate-400'}>
              {(kycRecord?.gamesPlayedCount ?? 0) > 0
                ? `Played ${kycRecord?.lastGamePlayed || 'a game'} (${kycRecord?.gamesPlayedCount} play${kycRecord?.gamesPlayedCount === 1 ? '' : 's'})`
                : '2. Play any game (Penalty Shootout, Pool, Wheel, or Markets)'}
            </span>
          </div>
        </div>

        {/* Inline Phone OTP form if not yet verified as Airtel */}
        {(!kycRecord?.phoneVerified || kycRecord?.carrier !== 'airtel') && kycRecord?.airtelBonusStatus !== 'claimed' && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-200">
                <Phone size={12} className="text-rose-400" />
                <span>{kycRecord?.phoneVerified ? 'Switch to an Airtel number' : 'Verify Phone Number via WhatsApp for 200MB Offer'}</span>
              </div>
              <div className="inline-flex rounded-lg border border-white/10 bg-[#080C0F] p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setOtpChannel('whatsapp')}
                  className={`rounded-md px-2 py-0.5 font-bold transition-colors ${
                    otpChannel === 'whatsapp' ? 'bg-[#22c55e] text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setOtpChannel('sms')}
                  className={`rounded-md px-2 py-0.5 font-bold transition-colors ${
                    otpChannel === 'sms' ? 'bg-[#22c55e] text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SMS
                </button>
              </div>
            </div>
            {otpCapability && (
              <p className="text-[10px] text-slate-400">
                {otpChannel === 'whatsapp'
                  ? otpCapability.whatsappLive
                    ? `Live WhatsApp OTP active (${otpCapability.whatsappMode === 'twilio_verify' ? 'Twilio Verify' : 'Twilio WhatsApp'}).`
                    : 'Sandbox preview active — add Twilio keys in environment for live WhatsApp delivery.'
                  : otpCapability.smsLive
                  ? 'Live Twilio SMS OTP active.'
                  : 'Sandbox preview active — add Twilio keys in environment for live SMS delivery.'}
              </p>
            )}
            <div className="flex gap-2">
              <select
                value={carrierInput}
                onChange={(e) => setCarrierInput(e.target.value as CarrierType)}
                className="rounded-xl border border-white/10 bg-[#080C0F] px-2.5 py-2 text-[11px] text-white"
              >
                <option value="airtel">Airtel</option>
                <option value="other">Other</option>
              </select>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="0802 123 4567"
                className="flex-1 rounded-xl border border-white/10 bg-[#080C0F] px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#22c55e] focus:outline-none"
              />
              <button
                type="button"
                disabled={sendingOtp}
                onClick={handleSendPhoneOtp}
                className="rounded-xl bg-[#22c55e] hover:bg-[#16a34a] px-3 py-2 text-[11px] font-black text-black disabled:opacity-50 whitespace-nowrap"
              >
                {sendingOtp ? '...' : otpSentTo ? 'Resend' : otpChannel === 'whatsapp' ? 'Send WhatsApp OTP' : 'Send OTP'}
              </button>
            </div>

            {otpSentTo && (
              <div className="space-y-2 rounded-xl border border-[#22c55e]/30 bg-[#080C0F] p-2.5">
                <div className="text-[10px] font-mono text-emerald-300">
                  Sent via {otpSentChannel === 'sms' ? 'SMS' : 'WhatsApp'} to {otpSentTo}
                </div>
                {previewOtp && (
                  <button
                    type="button"
                    onClick={() => setOtpInput(previewOtp)}
                    className="text-[11px] font-mono text-[#FACC15] hover:underline block"
                  >
                    Sandbox Code: <strong>{previewOtp}</strong> (tap to fill)
                  </button>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    className="flex-1 rounded-xl border border-white/10 bg-[#0E1318] px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    disabled={verifyingOtp || otpInput.length !== 6}
                    onClick={handleVerifyPhoneOtp}
                    className="rounded-xl bg-[#22c55e] px-3.5 py-1.5 text-xs font-black text-black disabled:opacity-50"
                  >
                    {verifyingOtp ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {kycRecord?.airtelBonusStatus === 'pending_game' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/games/penalty"
              className="inline-flex items-center gap-1 rounded-xl bg-[#22c55e] px-3.5 py-2 text-xs font-black text-black hover:bg-[#16a34a]"
            >
              <Wifi size={13} />
              <span>Play Penalty Shootout (Free)</span>
            </Link>
            <Link
              href="/games/pool"
              className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#121820] px-3.5 py-2 text-xs font-bold text-white hover:border-[#22c55e]"
            >
              <span>8-Ball Pool</span>
            </Link>
            <Link
              href="/games/wheel"
              className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#121820] px-3.5 py-2 text-xs font-bold text-white hover:border-[#22c55e]"
            >
              <span>Wheel of Fortune</span>
            </Link>
          </div>
        )}

        {kycRecord?.airtelBonusStatus === 'unlocked' && (
          <button
            type="button"
            disabled={claimingBonus}
            onClick={handleClaimBonus}
            className="w-full rounded-xl bg-[#22c55e] hover:bg-[#16a34a] py-2.5 text-xs font-black text-black shadow-lg shadow-[#22c55e]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {claimingBonus ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
            <span>{claimingBonus ? 'Issuing Data Bundle...' : 'Claim 200MB Airtel Data Bonus'}</span>
          </button>
        )}

        {kycRecord?.airtelBonusStatus === 'claimed' && (
          <div className="rounded-xl border border-[#22c55e]/40 bg-[#0B1711] p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-[#4ade80] font-bold block">200MB Airtel Data Issued!</span>
              <span className="text-[10px] text-slate-400">Sent to {kycRecord.maskedPhone}</span>
            </div>
            <span className="font-mono font-black text-[#FACC15]">{kycRecord.airtelVoucherCode}</span>
          </div>
        )}
      </section>

      {/* Wallet Management Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={17} className="text-[#4ade80]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Wallet & Custody</h2>
          </div>
          <Link href="/wallet" className="text-xs font-semibold text-[#4ade80] hover:underline flex items-center gap-1">
            Open Crypto Wallet <ArrowUpRight size={13} />
          </Link>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          On-chain deposits and withdrawals operate across segregated multi-chain vaults (Solana, Base, Ethereum, Arbitrum, Polygon). Market creation executes directly on fast AMM order books.
        </p>

        <div className="pt-2 grid grid-cols-2 gap-3">
          <Link
            href="/wallet"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#22c55e]/30 bg-[#121B16] py-3 text-center transition hover:border-[#22c55e] active:scale-95"
          >
            <WalletCards size={16} className="text-[#4ade80]" />
            <span className="text-xs font-bold text-white">Cashier & Balances</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#121820] py-3 text-center transition hover:bg-[#16202a] active:scale-95"
          >
            <History size={16} className="text-slate-300" />
            <span className="text-xs font-bold text-white">Tx Ledger</span>
          </button>
        </div>

        {showHistory && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <BetHistory />
          </div>
        )}
      </div>

      {/* Settings Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Settings size={17} className="text-slate-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Preferences</h2>
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            {soundEnabled ? <Volume2 size={16} className="text-[#4ade80]" /> : <VolumeX size={16} className="text-slate-500" />}
            <div>
              <span className="text-xs font-semibold text-white">Sound Effects</span>
              <p className="text-[11px] text-slate-400">Audio feedback on trades</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
              soundEnabled ? 'bg-[#22c55e] text-black shadow-sm' : 'bg-white/10 text-slate-400'
            }`}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <Vibrate size={16} className={hapticEnabled ? 'text-[#4ade80]' : 'text-slate-500'} />
            <div>
              <span className="text-xs font-semibold text-white">Haptic Vibration</span>
              <p className="text-[11px] text-slate-400">Mobile haptic tap sensations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHapticEnabled(!hapticEnabled)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
              hapticEnabled ? 'bg-[#22c55e] text-black shadow-sm' : 'bg-white/10 text-slate-400'
            }`}
          >
            {hapticEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Account Authentication & Logout */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white">Multi-Chain Session</h3>
            <p className="text-[11px] text-slate-400">Encrypted account & custody session active</p>
          </div>
          {authenticated ? (
            <button
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => void login()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-4 py-1.5 text-xs font-bold text-black shadow-md shadow-[#22c55e]/20 transition-all"
            >
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

