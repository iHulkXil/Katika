import { PrivyClient } from "@privy-io/node";
import type { Request } from "express";

export class AuthConfigError extends Error {
  readonly code = "AUTH_CONFIG" as const;

  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export class AuthError extends Error {
  readonly code = "UNAUTHENTICATED" as const;

  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export type VerifiedPrivyIdentity = {
  privyUserId: string;
  sessionId?: string;
};

let client: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  const appId = process.env.PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    throw new AuthConfigError(
      "Server authentication is not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET.",
    );
  }

  if (!client) {
    client = new PrivyClient({
      appId,
      appSecret,
    });
  }

  return client;
}

export function extractAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  const cookieToken = req.cookies?.["privy-token"];
  if (typeof cookieToken === "string" && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }

  return null;
}

export async function authenticateRequest(
  req: Request,
): Promise<VerifiedPrivyIdentity> {
  const token = extractAccessToken(req);
  if (!token) {
    throw new AuthError("Missing Privy access token");
  }

  const privy = getPrivyClient();

  try {
    const claims = await privy.utils().auth().verifyAuthToken(token);
    const privyUserId =
      (claims as { userId?: string; user_id?: string; sub?: string }).userId ??
      (claims as { user_id?: string }).user_id ??
      (claims as { sub?: string }).sub;

    if (!privyUserId || typeof privyUserId !== "string") {
      throw new AuthError("Privy token did not contain a user id");
    }

    const sessionId =
      (claims as { sessionId?: string; session_id?: string; sid?: string })
        .sessionId ??
      (claims as { session_id?: string }).session_id ??
      (claims as { sid?: string }).sid;

    return {
      privyUserId,
      sessionId: typeof sessionId === "string" ? sessionId : undefined,
    };
  } catch (error) {
    if (error instanceof AuthConfigError || error instanceof AuthError) {
      throw error;
    }
    throw new AuthError("Invalid Privy access token");
  }
}
