import { createPermissionErrorResponse } from "@/lib/errors/permission-errors";
import {
  PUBLIC_TOKEN_FORBIDDEN_FIELDS,
  type PublicTokenForbiddenField,
} from "@/lib/permissions/permission-registry";

export { PUBLIC_TOKEN_FORBIDDEN_FIELDS };

const FORBIDDEN_FIELD_SET = new Set<string>(
  PUBLIC_TOKEN_FORBIDDEN_FIELDS.map((field) => field.toLowerCase()),
);
const FORBIDDEN_FIELD_CANONICAL = new Map<string, string>(
  PUBLIC_TOKEN_FORBIDDEN_FIELDS.map((field) => [field.toLowerCase(), field]),
);

export function containsForbiddenPublicTokenField(value: unknown): boolean {
  return assertPublicTokenSafePayload(value).ok === false;
}

export function assertPublicTokenSafePayload(
  payload: unknown,
): { ok: true } | { ok: false; forbiddenFields: string[] } {
  const forbiddenFields = new Set<string>();
  collectForbiddenFields(payload, forbiddenFields, new WeakSet<object>());

  if (forbiddenFields.size === 0) return { ok: true };
  return { ok: false, forbiddenFields: [...forbiddenFields].sort() };
}

export function createPublicTokenForbiddenFieldResponse(fields: string[]) {
  void fields;
  return createPermissionErrorResponse(
    "PUBLIC_TOKEN_FORBIDDEN_FIELD",
    "Dữ liệu công khai chứa trường nội bộ.",
    500,
  );
}

function collectForbiddenFields(
  value: unknown,
  forbiddenFields: Set<string>,
  seen: WeakSet<object>,
): void {
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      const canonicalField = getForbiddenField(value);
      if (canonicalField) forbiddenFields.add(canonicalField);
    }
    return;
  }

  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectForbiddenFields(item, forbiddenFields, seen);
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    const canonicalField = getForbiddenField(key);
    if (canonicalField) forbiddenFields.add(canonicalField);
    collectForbiddenFields(childValue, forbiddenFields, seen);
  }
}

function getForbiddenField(field: string): PublicTokenForbiddenField | null {
  const normalized = field.toLowerCase();
  if (!FORBIDDEN_FIELD_SET.has(normalized)) return null;
  return (FORBIDDEN_FIELD_CANONICAL.get(normalized) ?? field) as PublicTokenForbiddenField;
}
