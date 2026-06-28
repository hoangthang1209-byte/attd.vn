import { createHmac, timingSafeEqual } from "crypto";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";

const TOKEN_TTL_MS = 5 * 60 * 1000;

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createTechPackPdfToken(techPackId: string): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${techPackId}|${exp}`;
  const signature = signPayload(payload, secret);
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export function verifyTechPackPdfToken(token: string, techPackId: string): boolean {
  const secret = getAdminSessionSecret();
  if (!secret) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;
    const [tokenId, expRaw, signature] = parts;
    if (tokenId !== techPackId) return false;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${tokenId}|${expRaw}`;
    const expected = signPayload(payload, secret);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
