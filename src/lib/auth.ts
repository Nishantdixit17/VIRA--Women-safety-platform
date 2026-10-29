import crypto from "crypto";
import { cookies } from "next/headers";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

const COOKIE_NAME = "vira_session";

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    "vira-sih-predictive-safety-secret-key-2026"
  );
}

export function createSessionToken(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    return decoded as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
