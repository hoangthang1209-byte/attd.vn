import type { EmployeeRole } from "@prisma/client";
import { isEmployeeRole } from "@/features/employees/employee-role";

export const STAFF_SESSION_VERSION = "v1";
export const STAFF_SESSION_MESSAGE_PREFIX = `attd-admin-staff:${STAFF_SESSION_VERSION}:`;

export type AdminStaffSessionPayload = {
  employeeId: string | null;
  /** `null` = trusted full-access admin (password login without employee). */
  role: EmployeeRole | null;
};

export function serializeStaffSessionPayload(payload: AdminStaffSessionPayload): string {
  return JSON.stringify({
    employeeId: payload.employeeId,
    role: payload.role,
  });
}

export function parseStaffSessionPayloadJson(json: string): AdminStaffSessionPayload | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const employeeId =
      record.employeeId === null
        ? null
        : typeof record.employeeId === "string"
          ? record.employeeId
          : null;
    const roleRaw = record.role;
    const role =
      roleRaw === null || roleRaw === undefined
        ? null
        : typeof roleRaw === "string" && isEmployeeRole(roleRaw)
          ? roleRaw
          : null;
    return { employeeId, role };
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(encoded: string): Uint8Array | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function encodeStaffSessionPayload(payload: AdminStaffSessionPayload): string {
  const json = serializeStaffSessionPayload(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function decodeStaffSessionPayload(encoded: string): AdminStaffSessionPayload | null {
  const bytes = base64UrlToBytes(encoded);
  if (!bytes) return null;
  const json = new TextDecoder().decode(bytes);
  return parseStaffSessionPayloadJson(json);
}

export function buildStaffSessionToken(
  payload: AdminStaffSessionPayload,
  signatureHex: string,
): string {
  return `${encodeStaffSessionPayload(payload)}.${signatureHex}`;
}

export function splitStaffSessionToken(token: string): { payloadPart: string; signature: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  return {
    payloadPart: token.slice(0, dot),
    signature: token.slice(dot + 1),
  };
}
