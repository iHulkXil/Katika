import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { pushNotification } from '@/lib/notifications';

export type IdDocumentType = 'national_id' | 'passport' | 'drivers_license';
export type CarrierType = 'airtel' | 'other';
export type AirtelBonusStatus =
  | 'locked'
  | 'pending_phone'
  | 'pending_game'
  | 'unlocked'
  | 'claimed';

export interface KycRecord {
  privyUserId: string;
  fullName: string;
  dob: string;
  country: string;
  address: string;
  idType: IdDocumentType;
  idNumberMasked: string;
  kycCompleted: boolean;
  kycSubmittedAt?: string;
  phoneNumber?: string;
  maskedPhone?: string;
  carrier: CarrierType | null;
  phoneVerified: boolean;
  phoneVerifiedAt?: string;
  gamesPlayedCount: number;
  lastGamePlayed?: string;
  airtelBonusMb: 200;
  airtelBonusStatus: AirtelBonusStatus;
  airtelBonusClaimedAt?: string;
  airtelVoucherCode?: string;
  updatedAt: string;
}

export interface SubmitKycInput {
  fullName: string;
  dob: string;
  country: string;
  address: string;
  idType: IdDocumentType;
  idNumber: string;
}

export interface SendOtpResponse {
  ok: boolean;
  maskedPhone: string;
  carrier: CarrierType;
  isAirtel: boolean;
  expiresInSec: number;
  previewOtp?: string;
}

interface KycContextValue {
  record: KycRecord | null;
  loading: boolean;
  isKycComplete: boolean;
  needsKyc: boolean;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  refreshKyc: () => Promise<void>;
  submitKyc: (input: SubmitKycInput) => Promise<KycRecord>;
  sendPhoneOtp: (phoneNumber: string, carrier?: CarrierType) => Promise<SendOtpResponse>;
  verifyPhoneOtp: (code: string) => Promise<KycRecord>;
  recordGamePlay: (gameName: string) => Promise<void>;
  claimAirtelBonus: () => Promise<KycRecord>;
}

const KycContext = createContext<KycContextValue | null>(null);

const BASE_API = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export function detectAirtelNumber(rawPhone: string): boolean {
  const trimmed = rawPhone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return false;

  // Convert local 11-digit 0-prefix Nigerian number to 234...
  const normalizedDigits =
    digits.startsWith('0') && digits.length === 11 ? `234${digits.slice(1)}` : digits;

  // Nigeria (+234)
  if (normalizedDigits.startsWith('234') && normalizedDigits.length >= 13) {
    const local3 = normalizedDigits.slice(3, 6);
    if (['802', '808', '701', '708', '812', '901', '902', '904', '907', '912'].includes(local3)) {
      return true;
    }
  }
  // Kenya (+254)
  if (normalizedDigits.startsWith('254') && normalizedDigits.length >= 12) {
    const local2 = normalizedDigits.slice(3, 5);
    if (['73', '78', '10'].includes(local2)) return true;
  }
  // Uganda (+256)
  if (normalizedDigits.startsWith('256') && normalizedDigits.length >= 12) {
    const local2 = normalizedDigits.slice(3, 5);
    if (['70', '74', '75'].includes(local2)) return true;
  }
  // Tanzania (+255)
  if (normalizedDigits.startsWith('255') && normalizedDigits.length >= 12) {
    const local2 = normalizedDigits.slice(3, 5);
    if (['68', '69', '78', '79'].includes(local2)) return true;
  }
  // Ghana (+233)
  if (normalizedDigits.startsWith('233') && normalizedDigits.length >= 12) {
    const local2 = normalizedDigits.slice(3, 5);
    if (['26', '27', '56', '57'].includes(local2)) return true;
  }
  // India (+91)
  if (normalizedDigits.startsWith('91') && normalizedDigits.length >= 12) {
    const local2 = normalizedDigits.slice(2, 4);
    if (['98', '99', '97', '96', '81', '70'].includes(local2)) return true;
  }

  return false;
}

export function KycProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { toast } = useToast();
  const [record, setRecord] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const authFetch = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication token unavailable. Please sign in again.');
      }
      const res = await fetch(`${BASE_API}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }
      return body as T;
    },
    [getAccessToken],
  );

  const refreshKyc = useCallback(async () => {
    if (!ready || !authenticated || !user?.id) {
      setRecord(null);
      setLoading(false);
      setOnboardingOpen(false);
      return;
    }

    setLoading(true);
    try {
      const data = await authFetch<KycRecord>('/kyc');
      setRecord(data);
      if (!data.kycCompleted) {
        setOnboardingOpen(true);
      }
    } catch (err) {
      console.warn('Failed to fetch KYC status:', err);
    } finally {
      setLoading(false);
    }
  }, [ready, authenticated, user?.id, authFetch]);

  useEffect(() => {
    void refreshKyc();
  }, [refreshKyc]);

  const submitKyc = useCallback(
    async (input: SubmitKycInput) => {
      const updated = await authFetch<KycRecord>('/kyc/submit', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setRecord(updated);
      localStorage.setItem('sidebet_terms_accepted', 'true');
      pushNotification({
        id: `kyc-verified-${updated.privyUserId}`,
        title: 'KYC Identity Verified',
        message: 'Your account verification is complete. Verify an Airtel number & play any game to unlock 200MB free data.',
        type: 'system',
        href: '/profile',
        userId: user?.id,
      });
      return updated;
    },
    [authFetch, user?.id],
  );

  const sendPhoneOtp = useCallback(
    async (phoneNumber: string, carrier?: CarrierType) => {
      return authFetch<SendOtpResponse>('/kyc/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, carrier }),
      });
    },
    [authFetch],
  );

  const verifyPhoneOtp = useCallback(
    async (code: string) => {
      const updated = await authFetch<KycRecord>('/kyc/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setRecord(updated);

      if (updated.carrier === 'airtel') {
        if (updated.airtelBonusStatus === 'unlocked') {
          pushNotification({
            id: `airtel-unlocked-${updated.privyUserId}`,
            title: '200MB Airtel Bonus Unlocked!',
            message: 'Your Airtel number is verified and you played a game. Claim your 200MB data in Profile.',
            type: 'win',
            href: '/profile',
            userId: user?.id,
          });
        } else {
          pushNotification({
            id: `airtel-phone-verified-${updated.privyUserId}`,
            title: 'Airtel Number Verified',
            message: 'Play any game (Pool, Wheel of Fortune, or Markets) to unlock your 200MB free Airtel data!',
            type: 'system',
            href: '/pvp',
            userId: user?.id,
          });
        }
      }
      return updated;
    },
    [authFetch, user?.id],
  );

  const recordGamePlay = useCallback(
    async (gameName: string) => {
      if (!authenticated) return;
      try {
        const res = await authFetch<{ record: KycRecord; justUnlocked: boolean }>(
          '/kyc/record-game',
          {
            method: 'POST',
            body: JSON.stringify({ game: gameName }),
          },
        );
        setRecord(res.record);
        if (res.justUnlocked) {
          pushNotification({
            id: `airtel-200mb-unlocked-${res.record.privyUserId}`,
            title: '200MB Airtel Data Bonus Unlocked!',
            message: `You verified your Airtel number and played ${gameName}. Claim your 200MB bonus in Profile!`,
            type: 'win',
            href: '/profile',
            userId: user?.id,
          });
          toast({
            title: '200MB Airtel Data Bonus Unlocked!',
            description: `Thanks for playing ${gameName}. Visit Profile to claim your 200MB Airtel voucher!`,
          });
        }
      } catch (err) {
        console.warn('Could not record game play for Airtel bonus:', err);
      }
    },
    [authenticated, authFetch, toast, user?.id],
  );

  const claimAirtelBonus = useCallback(async () => {
    const updated = await authFetch<KycRecord>('/kyc/claim-bonus', {
      method: 'POST',
    });
    setRecord(updated);
    pushNotification({
      id: `airtel-200mb-claimed-${updated.privyUserId}`,
      title: '200MB Airtel Data Claimed',
      message: `Voucher ${updated.airtelVoucherCode || 'AIRTEL-200MB'} issued for ${updated.maskedPhone || 'your Airtel line'}.`,
      type: 'win',
      href: '/profile',
      userId: user?.id,
    });
    return updated;
  }, [authFetch, user?.id]);

  const isKycComplete = Boolean(record?.kycCompleted);
  const needsKyc = Boolean(ready && authenticated && !loading && !isKycComplete);

  const value = useMemo<KycContextValue>(
    () => ({
      record,
      loading,
      isKycComplete,
      needsKyc,
      onboardingOpen,
      setOnboardingOpen,
      refreshKyc,
      submitKyc,
      sendPhoneOtp,
      verifyPhoneOtp,
      recordGamePlay,
      claimAirtelBonus,
    }),
    [
      record,
      loading,
      isKycComplete,
      needsKyc,
      onboardingOpen,
      refreshKyc,
      submitKyc,
      sendPhoneOtp,
      verifyPhoneOtp,
      recordGamePlay,
      claimAirtelBonus,
    ],
  );

  return <KycContext.Provider value={value}>{children}</KycContext.Provider>;
}

export function useKyc(): KycContextValue {
  const ctx = useContext(KycContext);
  if (!ctx) {
    throw new Error('useKyc must be used within a KycProvider');
  }
  return ctx;
}
