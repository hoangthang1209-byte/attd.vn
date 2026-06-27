import type { EmployeeRole, PermissionScope } from "@prisma/client";
import { isEmployeeRole } from "@/features/employees/employee-role";

export const ADMIN_SESSION_PAYLOAD_VERSION = 2;
export const ADMIN_SESSION_MESSAGE_PREFIX = `attd-admin-session:v${ADMIN_SESSION_PAYLOAD_VERSION}:`;

/** Compact permission grant stored in signed session cookie. */
export type SessionPermissionGrant = [code: string, scope: PermissionScope];

export type AdminSessionPayload = {
  v: typeof ADMIN_SESSION_PAYLOAD_VERSION;
  mode: "owner" | "user" | "legacy";
  userId: string | null;
  username: string | null;
  employeeId: string | null;
  roleId: string | null;
  roleCode: string | null;
  legacyEmployeeRole: EmployeeRole | null;
  permissions: SessionPermissionGrant[];
};

export type LegacyStaffSessionPayloadV1 = {
  employeeId: string | null;
  role: EmployeeRole | null;
};

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

export function encodeAdminSessionPayload(payload: AdminSessionPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

function parsePermissionGrants(raw: unknown): SessionPermissionGrant[] {
  if (!Array.isArray(raw)) return [];
  const grants: SessionPermissionGrant[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length !== 2) continue;
    const [code, scope] = item;
    if (typeof code !== "string" || typeof scope !== "string") continue;
    if (!["NONE", "OWN", "ASSIGNED", "TEAM", "ALL"].includes(scope)) continue;
    grants.push([code, scope as PermissionScope]);
  }
  return grants;
}

export function parseAdminSessionPayloadJson(json: string): AdminSessionPayload | LegacyStaffSessionPayloadV1 | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;

    if (record.v === ADMIN_SESSION_PAYLOAD_VERSION) {
      const legacyRoleRaw = record.legacyEmployeeRole;
      const legacyEmployeeRole =
        legacyRoleRaw === null || legacyRoleRaw === undefined
          ? null
          : typeof legacyRoleRaw === "string" && isEmployeeRole(legacyRoleRaw)
            ? legacyRoleRaw
            : null;
      const mode =
        record.mode === "owner" || record.mode === "user" || record.mode === "legacy"
          ? record.mode
          : "legacy";
      return {
        v: ADMIN_SESSION_PAYLOAD_VERSION,
        mode,
        userId: typeof record.userId === "string" ? record.userId : null,
        username: typeof record.username === "string" ? record.username : null,
        employeeId:
          record.employeeId === null
            ? null
            : typeof record.employeeId === "string"
              ? record.employeeId
              : null,
        roleId: typeof record.roleId === "string" ? record.roleId : null,
        roleCode: typeof record.roleCode === "string" ? record.roleCode : null,
        legacyEmployeeRole,
        permissions: parsePermissionGrants(record.permissions),
      };
    }

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

export function decodeAdminSessionPayload(encoded: string): AdminSessionPayload | LegacyStaffSessionPayloadV1 | null {
  const bytes = base64UrlToBytes(encoded);
  if (!bytes) return null;
  const json = new TextDecoder().decode(bytes);
  return parseAdminSessionPayloadJson(json);
}

export function splitAdminSessionToken(token: string): { payloadPart: string; signature: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  return {
    payloadPart: token.slice(0, dot),
    signature: token.slice(dot + 1),
  };
}

export function isAdminSessionPayloadV2(
  payload: AdminSessionPayload | LegacyStaffSessionPayloadV1,
): payload is AdminSessionPayload {
  return "v" in payload && payload.v === ADMIN_SESSION_PAYLOAD_VERSION;
}
