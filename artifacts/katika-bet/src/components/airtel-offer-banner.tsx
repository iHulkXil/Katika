import { useState } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowRight, Gift, Loader2, Sparkles, Wifi, X } from 'lucide-react';
import { useKyc } from '@/lib/kyc';
import { useToast } from '@/hooks/use-toast';

export function AirtelOfferBanner() {
  const { authenticated, user } = usePrivy();
  const { record, isKycComplete, claimAirtelBonus } = useKyc();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Only show AFTER signup (authenticated + Level 1 signup completed) and until claimed or dismissed
  if (!authenticated || !isKycComplete || !record) return null;
  if (record.airtelBonusStatus === 'claimed') return null;

  const dismissKey = user?.id ? `sidebet_airtel_banner_dismissed_${user.id}` : null;
  if (dismissed || (dismissKey && sessionStorage.getItem(dismissKey) === 'true')) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (dismissKey) {
      sessionStorage.setItem(dismissKey, 'true');
    }
  };

  const handleQuickClaim = async () => {
    setClaiming(true);
    try {
      const updated = await claimAirtelBonus();
      toast({
        title: '200MB Airtel Data Claimed!',
        description: `Voucher ${updated.airtelVoucherCode || 'AIRTEL-200MB'} issued to ${updated.maskedPhone || 'your Airtel line'}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Cannot Claim Yet',
        description: err?.message || 'Verify your Airtel number and play a game first.',
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  };

  const status = record.airtelBonusStatus;

  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-8 pt-4">
      <div className="relative flex flex-col gap-3 rounded-2xl border border-rose-500/35 bg-gradient-to-r from-[#260B14] via-[#15121D] to-[#0B1912] px-4 py-3.5 shadow-[0_8px_30px_rgba(244,63,94,0.12)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-3 pr-7 sm:pr-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
            {status === 'unlocked' ? <Gift size={19} /> : <Wifi size={19} />}
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-rose-300">
                <Sparkles size={10} />
                Airtel Post-Signup Offer
              </span>
              <span className="text-xs font-extrabold text-white">
                {status === 'unlocked'
                  ? 'Your 200MB Free Airtel Data Bonus is Ready!'
                  : status === 'pending_game'
                  ? 'Airtel Line Verified — Play 1 Game to Unlock 200MB Free Data'
                  : 'Claim 200MB Free Data for Airtel Users'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {status === 'unlocked'
                ? `Airtel line ${record.maskedPhone || ''} verified & game played. Claim your instant 200MB bundle now.`
                : status === 'pending_game'
                ? 'Play Penalty Shootout, 8-Ball Pool (Free Practice at $0), Wheel of Fortune, or Markets to unlock.'
                : 'Verify your Airtel phone number under Profile KYC and play any game to unlock 200MB FREE mobile data.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === 'unlocked' ? (
            <button
              type="button"
              disabled={claiming}
              onClick={handleQuickClaim}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] px-4 py-2 text-xs font-black text-black shadow-md shadow-[#22c55e]/25 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {claiming ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
              <span>{claiming ? 'Issuing...' : 'Claim 200MB Now'}</span>
            </button>
          ) : status === 'pending_game' ? (
            <Link
              href="/pvp"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] px-4 py-2 text-xs font-black text-black shadow-md shadow-[#22c55e]/25 transition-all whitespace-nowrap"
            >
              <span>Play Any Game</span>
              <ArrowRight size={13} />
            </Link>
          ) : (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 px-4 py-2 text-xs font-black text-white shadow-md shadow-rose-500/25 transition-all whitespace-nowrap"
            >
              <span>Verify Airtel &amp; Claim</span>
              <ArrowRight size={13} />
            </Link>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss 200MB offer banner"
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-black/30 text-slate-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
