import { createHmac, timingSafeEqual } from "crypto";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";

const TOKEN_TTL_MS = 5 * 60 * 1000;

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createDeliveryNotePdfToken(orderId: string, executionId: string): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${orderId}|${executionId}|${exp}`;
  const signature = signPayload(payload, secret);
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export function verifyDeliveryNotePdfToken(
  token: string,
  orderId: string,
  executionId: string,
): boolean {
  const secret = getAdminSessionSecret();
  if (!secret) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 4) return false;
    const [tokenOrderId, tokenExecutionId, expRaw, signature] = parts;
    if (tokenOrderId !== orderId || tokenExecutionId !== executionId) return false;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${tokenOrderId}|${tokenExecutionId}|${expRaw}`;
    const expected = signPayload(payload, secret);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function deliveryNotePdfFilename(executionCode: string): string {
  return `phieu-giao-hang-${executionCode}.pdf`;
}
