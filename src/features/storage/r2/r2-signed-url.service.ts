import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";
import type { R2UploadSessionPayload } from "@/features/storage/r2/r2-types";

const SESSION_TTL_MS = 15 * 60 * 1000;

function getSigningSecret(): string {
  const secret = getAdminSessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET chưa được cấu hình.");
  return secret;
}

function signPayload(encoded: string): string {
  return createHmac("sha256", getSigningSecret()).update(encoded).digest("base64url");
}

export function createUploadSessionToken(payload: Omit<R2UploadSessionPayload, "expiresAt">): {
  sessionToken: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const body: R2UploadSessionPayload = { ...payload, expiresAt };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = signPayload(encoded);
  return {
    sessionToken: `${encoded}.${signature}`,
    expiresAt,
  };
}

export function verifyUploadSessionToken(token: string): R2UploadSessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signPayload(encoded);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as R2UploadSessionPayload;
    if (!payload.expiresAt || Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sanitizeProductionFileName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "file";
  const sanitized = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sanitized || "file";
}

export function buildR2ProductionObjectKey(input: {
  orderNo: string;
  orderItemId?: string | null;
  fileName: string;
  uploadId?: string;
}): string {
  const uploadId = input.uploadId ?? randomUUID().slice(0, 8);
  const sanitized = sanitizeProductionFileName(input.fileName);
  const scope = input.orderItemId ? `items/${input.orderItemId}` : "order";
  return `production-files/orders/${input.orderNo}/${scope}/${uploadId}-${sanitized}`;
}
