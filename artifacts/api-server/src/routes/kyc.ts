import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Router, type IRouter, type Request, type Response } from "express";
import { AuthConfigError, AuthError, authenticateRequest } from "../lib/privy-auth";

const router: IRouter = Router();

export type IdDocumentType = "national_id" | "passport" | "drivers_license";
export type CarrierType = "airtel" | "other";
export type AirtelBonusStatus =
  | "locked"
  | "pending_phone"
  | "pending_game"
  | "unlocked"
  | "claimed";

export interface KycRecord {
  privyUserId: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  country: string;
  address: string;
  idType?: IdDocumentType;
  idNumberMasked?: string;
  kycCompleted: boolean;
  kycSubmittedAt?: string;
  kycLevel2Completed: boolean;
  kycLevel2SubmittedAt?: string;
  kycLevel: 0 | 1 | 2;
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

export type OtpChannel = "whatsapp" | "sms";

interface PendingOtp {
  code: string;
  phoneNumber: string;
  maskedPhone: string;
  carrier: CarrierType;
  channel: OtpChannel;
  provider: "twilio_verify" | "twilio_whatsapp" | "twilio_sms" | "sandbox";
  attempts: number;
  expiresAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), ".data");
const KYC_FILE = path.join(DATA_DIR, "sidebet_kyc.json");

function loadKycStore(): Record<string, KycRecord> {
  try {
    if (fs.existsSync(KYC_FILE)) {
      const raw = fs.readFileSync(KYC_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, KycRecord>;
      }
    }
  } catch (err) {
    console.warn("Failed to read sidebet_kyc.json:", err);
  }
  return {};
}

function saveKycStore(store: Record<string, KycRecord>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(KYC_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist sidebet_kyc.json:", err);
  }
}

const kycStore: Record<string, KycRecord> = loadKycStore();
const pendingOtps = new Map<string, PendingOtp>();

function defaultRecord(privyUserId: string): KycRecord {
  return {
    privyUserId,
    fullName: "",
    dob: "",
    country: "",
    address: "",
    kycCompleted: false,
    kycLevel2Completed: false,
    kycLevel: 0,
    carrier: null,
    phoneVerified: false,
    gamesPlayedCount: 0,
    airtelBonusMb: 200,
    airtelBonusStatus: "locked",
    updatedAt: new Date().toISOString(),
  };
}

function normalizeRecord(record: KycRecord): KycRecord {
  const hasLevel2 = Boolean(record.kycLevel2Completed || record.idNumberMasked);
  const kycLevel: 0 | 1 | 2 = !record.kycCompleted ? 0 : hasLevel2 ? 2 : 1;
  return {
    ...record,
    kycLevel2Completed: hasLevel2,
    kycLevel,
    airtelBonusStatus: computeBonusStatus(record),
  };
}

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus) return `+${digits}`;
  // Convert common local Nigerian/African 0-prefixed mobile numbers cleanly
  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  return `+${digits}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "****";
  const prefix = phone.startsWith("+") ? `+${digits.slice(0, 3)}` : digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${prefix} •••• ${tail}`;
}

export function maskIdNumber(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, "");
  if (clean.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

export function detectAirtelNumber(rawPhone: string): boolean {
  const norm = normalizePhone(rawPhone);
  const digits = norm.replace(/\D/g, "");
  if (!digits) return false;

  // Nigeria (+234)
  if (digits.startsWith("234") && digits.length >= 13) {
    const local3 = digits.slice(3, 6);
    if (["802", "808", "701", "708", "812", "901", "902", "904", "907", "912"].includes(local3)) {
      return true;
    }
  }
  // Kenya (+254)
  if (digits.startsWith("254") && digits.length >= 12) {
    const local2 = digits.slice(3, 5);
    if (["73", "78", "10"].includes(local2)) return true;
  }
  // Uganda (+256)
  if (digits.startsWith("256") && digits.length >= 12) {
    const local2 = digits.slice(3, 5);
    if (["70", "74", "75"].includes(local2)) return true;
  }
  // Tanzania (+255)
  if (digits.startsWith("255") && digits.length >= 12) {
    const local2 = digits.slice(3, 5);
    if (["68", "69", "78", "79"].includes(local2)) return true;
  }
  // Ghana (+233 - AirtelTigo)
  if (digits.startsWith("233") && digits.length >= 12) {
    const local2 = digits.slice(3, 5);
    if (["26", "27", "56", "57"].includes(local2)) return true;
  }
  // India (+91)
  if (digits.startsWith("91") && digits.length >= 12) {
    const local2 = digits.slice(2, 4);
    if (["98", "99", "97", "96", "81", "70"].includes(local2)) return true;
  }

  return false;
}

function calculateAge(dobStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) return null;
  const [y, m, d] = dobStr.split("-").map(Number);
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(birth.getTime())) return null;
  if (
    birth.getUTCFullYear() !== y ||
    birth.getUTCMonth() !== m - 1 ||
    birth.getUTCDate() !== d
  ) {
    return null;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const monthDiff = now.getUTCMonth() - (m - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < d)) {
    age--;
  }
  return age;
}

function computeBonusStatus(record: KycRecord): AirtelBonusStatus {
  if (record.airtelBonusStatus === "claimed" || record.airtelBonusClaimedAt) {
    return "claimed";
  }
  if (!record.kycCompleted) {
    return "locked";
  }
  if (record.phoneVerified && record.carrier === "airtel") {
    return record.gamesPlayedCount > 0 ? "unlocked" : "pending_game";
  }
  return "pending_phone";
}

function handleAuthError(res: Response, error: unknown) {
  if (error instanceof AuthConfigError) {
    return res.status(503).json({ error: error.message });
  }
  if (error instanceof AuthError) {
    return res.status(401).json({ error: error.message });
  }
  return res.status(500).json({ error: "KYC service error" });
}

// GET /api/kyc - Fetch current authenticated user's KYC (Level 1 + Level 2) & Airtel 200MB bonus state
router.get("/kyc", async (req: Request, res: Response) => {
  try {
    const identity = await authenticateRequest(req);
    const record = normalizeRecord(
      kycStore[identity.privyUserId] ?? defaultRecord(identity.privyUserId),
    );
    return res.json(record);
  } catch (error) {
    return handleAuthError(res, error);
  }
});

// GET /api/kyc/otp-status - Safe capability check for WhatsApp/SMS Twilio configuration (no secrets)
router.get("/kyc/otp-status", (_req: Request, res: Response) => {
  const hasTwilioAuth = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
  const hasVerify = hasTwilioAuth && Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim());
  const hasWhatsappSender = hasTwilioAuth && Boolean(process.env.TWILIO_WHATSAPP_FROM?.trim());
  const hasSmsSender = hasTwilioAuth && Boolean(process.env.TWILIO_PHONE_NUMBER?.trim());

  const whatsappMode = hasVerify
    ? "twilio_verify"
    : hasWhatsappSender
    ? "twilio_whatsapp"
    : "sandbox";

  return res.json({
    whatsappLive: hasVerify || hasWhatsappSender,
    smsLive: hasVerify || hasSmsSender,
    whatsappMode,
  });
});

// POST /api/kyc/submit - Submit Level 1 KYC details on initial signup (ID document NOT required here)
router.post("/kyc/submit", async (req: Request, res: Response) => {
  try {
    const identity = await authenticateRequest(req);
    const { fullName, dob, country, address, idType, idNumber } = req.body ?? {};

    if (typeof fullName !== "string" || fullName.trim().length < 2) {
      return res.status(400).json({ error: "Full legal name is required." });
    }
    if (typeof dob !== "string") {
      return res.status(400).json({ error: "Date of birth is required (YYYY-MM-DD)." });
    }
    const age = calculateAge(dob.trim());
    if (age === null || age < 18 || age > 120) {
      return res.status(400).json({
        error: "You must be at least 18 years old with a valid date of birth to register.",
      });
    }
    if (typeof country !== "string" || country.trim().length < 2) {
      return res.status(400).json({ error: "Country of residence is required." });
    }
    if (typeof address !== "string" || address.trim().length < 3) {
      return res.status(400).json({ error: "Residential address or city is required." });
    }

    const validIdTypes: IdDocumentType[] = ["national_id", "passport", "drivers_license"];
    const hasOptionalId =
      validIdTypes.includes(idType) &&
      typeof idNumber === "string" &&
      idNumber.trim().length >= 4;

    const existing = kycStore[identity.privyUserId] ?? defaultRecord(identity.privyUserId);
    const nowIso = new Date().toISOString();

    const updated = normalizeRecord({
      ...existing,
      privyUserId: identity.privyUserId,
      fullName: fullName.trim(),
      dob: dob.trim(),
      country: country.trim(),
      address: address.trim(),
      ...(hasOptionalId
        ? {
            idType,
            idNumberMasked: maskIdNumber(idNumber),
            kycLevel2Completed: true,
            kycLevel2SubmittedAt: existing.kycLevel2SubmittedAt ?? nowIso,
          }
        : {}),
      kycCompleted: true,
      kycSubmittedAt: existing.kycSubmittedAt ?? nowIso,
      updatedAt: nowIso,
    });

    kycStore[identity.privyUserId] = updated;
    saveKycStore(kycStore);

    return res.json(updated);
  } catch (error) {
    return handleAuthError(res, error);
  }
});

// POST /api/kyc/level2 - Submit Level 2 KYC (Government ID document) under Profile
router.post("/kyc/level2", async (req: Request, res: Response) => {
  try {
    const identity = await authenticateRequest(req);
    const { idType, idNumber } = req.body ?? {};

    const existing = kycStore[identity.privyUserId] ?? defaultRecord(identity.privyUserId);
    if (!existing.kycCompleted) {
      return res.status(400).json({
        error: "Please complete Level 1 profile verification first.",
      });
    }

    const validIdTypes: IdDocumentType[] = ["national_id", "passport", "drivers_license"];
    if (!validIdTypes.includes(idType)) {
      return res.status(400).json({ error: "Please choose a valid ID document type." });
    }
    if (typeof idNumber !== "string" || idNumber.trim().length < 4) {
      return res.status(400).json({ error: "ID document number must be at least 4 characters." });
    }

    const nowIso = new Date().toISOString();
    const updated = normalizeRecord({
      ...existing,
      privyUserId: identity.privyUserId,
      idType,
      idNumberMasked: maskIdNumber(idNumber),
      kycLevel2Completed: true,
      kycLevel2SubmittedAt: existing.kycLevel2SubmittedAt ?? nowIso,
      updatedAt: nowIso,
    });

    kycStore[identity.privyUserId] = updated;
    saveKycStore(kycStore);

    return res.json(updated);
  } catch (error) {
    return handleAuthError(res, error);
  }
});

async function dispatchTwilioOtp(params: {
  phoneNumber: string;
  code: string;
  channel: OtpChannel;
}): Promise<{ provider: PendingOtp["provider"]; delivered: boolean }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const smsFrom = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken) {
    return { provider: "sandbox", delivered: false };
  }

  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;

  // 1. Prefer Twilio Verify API (supports Channel=whatsapp or sms natively with managed templates)
  if (verifyServiceSid) {
    const body = new URLSearchParams({
      To: params.phoneNumber,
      Channel: params.channel === "whatsapp" ? "whatsapp" : "sms",
    });
    const resp = await fetch(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifyServiceSid)}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Twilio Verify failed (${resp.status}): ${errText}`);
    }
    return { provider: "twilio_verify", delivered: true };
  }

  // 2. Twilio Programmable WhatsApp Messages API
  if (params.channel === "whatsapp" && whatsappFrom) {
    const fromAddr = whatsappFrom.startsWith("whatsapp:")
      ? whatsappFrom
      : `whatsapp:${whatsappFrom}`;
    const toAddr = `whatsapp:${params.phoneNumber}`;
    const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();
    const body = contentSid
      ? new URLSearchParams({
          From: fromAddr,
          To: toAddr,
          ContentSid: contentSid,
          ContentVariables: JSON.stringify({ "1": params.code }),
        })
      : new URLSearchParams({
          From: fromAddr,
          To: toAddr,
          Body: `Your SIDEBET verification code is: ${params.code}. It expires in 10 minutes.`,
        });
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Twilio WhatsApp failed (${resp.status}): ${errText}`);
    }
    return { provider: "twilio_whatsapp", delivered: true };
  }

  // 3. Twilio Programmable SMS fallback
  if (smsFrom) {
    const body = new URLSearchParams({
      From: smsFrom,
      To: params.phoneNumber,
      Body: `Your SIDEBET verification code is: ${params.code}. It expires in 10 minutes.`,
    });
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Twilio SMS failed (${resp.status}): ${errText}`);
    }
    return { provider: "twilio_sms", delivered: true };
  }

  return { provider: "sandbox", delivered: false };
}

async function checkTwilioVerifyOtp(phoneNumber: string, code: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!accountSid || !authToken || !verifyServiceSid) return false;

  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  const body = new URLSearchParams({
    To: phoneNumber,
    Code: code,
  });

  const resp = await fetch(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifyServiceSid)}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );
  if (!resp.ok) {
    return false;
  }
  const data = (await resp.json()) as { status?: string; valid?: boolean };
  return data.status === "approved" || data.valid === true;
}

// POST /api/kyc/send-otp - Send 6-digit OTP via WhatsApp (Twilio Verify / WhatsApp) or SMS
router.post("/kyc/send-otp", async (req: Request, res: Response) => {
  try {
    const identity = await authenticateRequest(req);
    const { phoneNumber, carrier, channel } = req.body ?? {};

    if (typeof phoneNumber !== "string" || phoneNumber.replace(/\D/g, "").length < 7) {
      return res.status(400).json({ error: "Enter a valid mobile phone number." });
    }

    const normalized = normalizePhone(phoneNumber);
    const autoAirtel = detectAirtelNumber(normalized);
    const resolvedCarrier: CarrierType =
      carrier === "airtel" || carrier === "other"
        ? carrier
        : autoAirtel
        ? "airtel"
        : "other";
    const resolvedChannel: OtpChannel = channel === "sms" ? "sms" : "whatsapp";

    const code = String(crypto.randomInt(100000, 999999));
    const masked = maskPhone(normalized);

    const dispatch = await dispatchTwilioOtp({
      phoneNumber: normalized,
      code,
      channel: resolvedChannel,
    });

    pendingOtps.set(identity.privyUserId, {
      code,
      phoneNumber: normalized,
      maskedPhone: masked,
      carrier: resolvedCarrier,
      channel: resolvedChannel,
      provider: dispatch.provider,
      attempts: 0,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return res.json({
      ok: true,
      maskedPhone: masked,
      carrier: resolvedCarrier,
      channel: resolvedChannel,
      provider: dispatch.provider,
      isAirtel: resolvedCarrier === "airtel",
      expiresInSec: 600,
      ...(dispatch.delivered ? {} : { previewOtp: code }),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Twilio ")) {
      return res.status(502).json({ error: error.message });
    }
    return handleAuthError(res, error);
  }
});

// POST /api/kyc/verify-otp - Verify 6-digit WhatsApp/SMS phone OTP
router.post("/kyc/verify-otp", async (req: Request, res: Response) => {
  try {
    const identity = await authenticateRequest(req);
    const { code } = req.body ?? {};

    const pending = pendingOtps.get(identity.privyUserId);
    if (!pending) {
      return res.status(400).json({ error: "No pending verification code found. Request a new OTP." });
    }
    if (Date.now() > pending.expiresAt) {
      pendingOtps.delete(identity.privyUserId);
      return res.status(400).json({ error: "Verification code expired. Please request a new OTP." });
    }

    if (typeof code !== "string" || !/^\d{4,8}$/.test(code.trim())) {
      return res.status(400).json({ error: "Enter a valid numeric verification code." });
    }

    const trimmedCode = code.trim();
    let isValid = false;

    if (pending.provider === "twilio_verify") {
      isValid = await checkTwilioVerifyOtp(pending.phoneNumber, trimmedCode);
    } else {
      isValid = trimmedCode === pending.code;
    }

    if (!isValid) {
      pending.attempts += 1;
      if (pending.attempts >= 5) {
        pendingOtps.delete(identity.privyUserId);
        return res.status(429).json({
          error: "Too many invalid attempts. Please request a new WhatsApp OTP.",
        });
      }
      return res.status(400).json({ error: "Invalid verification code." });
    }

    pendingOtps.delete(identity.privyUserId);

    const existing = kycStore[identity.privyUserId] ?? defaultRecord(identity.privyUserId);
    const nowIso = new Date().toISOString();

    const updated = normalizeRecord({
      ...existing,
      privyUserId: identity.privyUserId,
      phoneNumber: pending.phoneNumber,
      maskedPhone: pending.maskedPhone,
      carrier: pending.carrier,
      phoneVerified: true,
      phoneVerifiedAt: nowIso,
      updatedAt: nowIso,
    });

    kycStore[identity.privyUserId] = updated;
    saveKycStore(kycStore);

    return res.json(updated);
  } catch (error) {
    return handleAuthError(res, error);
  }
});

// POST /api/kyc/record-game - Track playing any game and unlock 200MB Airtel bonus if phone verified
router.post("/kyc/record-game", async (req: Request, res: Response) => {
  try {
    const identity = await authenticateRequest(req);
    const gameName =
      typeof req.body?.game === "string" && req.body.game.trim().length > 0
        ? req.body.game.trim()
        : "Sidebet Game";

    const existing = kycStore[identity.privyUserId] ?? defaultRecord(identity.privyUserId);
    const prevStatus = computeBonusStatus(existing);
    const nowIso = new Date().toISOString();

    const updated = normalizeRecord({
      ...existing,
      privyUserId: identity.privyUserId,
      gamesPlayedCount: (existing.gamesPlayedCount || 0) + 1,
      lastGamePlayed: gameName,
      updatedAt: nowIso,
    });

    kycStore[identity.privyUserId] = updated;
    saveKycStore(kycStore);

    const justUnlocked =
      prevStatus !== "unlocked" &&
      prevStatus !== "claimed" &&
      updated.airtelBonusStatus === "unlocked";

    return res.json({ record: updated, justUnlocked });
  } catch (error) {
    return handleAuthError(res, error);
  }
});

// POST /api/kyc/claim-bonus - Claim unlocked 200MB Airtel Data Bonus
router.post("/kyc/claim-bonus", async (req: Request, res: Response) => {
  try {
    const identity = await authenticateRequest(req);
    const existing = kycStore[identity.privyUserId] ?? defaultRecord(identity.privyUserId);
    const status = computeBonusStatus(existing);

    if (status === "claimed") {
      return res.json(normalizeRecord(existing));
    }
    if (status !== "unlocked") {
      return res.status(400).json({
        error: "Verify an Airtel phone number and play any game first to unlock the 200MB Airtel data bonus.",
      });
    }

    const voucher = `AIRTEL-200MB-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const updated = normalizeRecord({
      ...existing,
      airtelBonusStatus: "claimed",
      airtelBonusClaimedAt: new Date().toISOString(),
      airtelVoucherCode: voucher,
      updatedAt: new Date().toISOString(),
    });

    kycStore[identity.privyUserId] = updated;
    saveKycStore(kycStore);

    return res.json(updated);
  } catch (error) {
    return handleAuthError(res, error);
  }
});

export default router;
