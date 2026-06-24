const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_RE = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;
const VN_TAX_CODE_RE = /^\d{10}(?:-\d{3})?$/;

export function normalizeOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function validateCrmEmail(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  if (!EMAIL_RE.test(normalized)) {
    throw new Error("Email không đúng định dạng.");
  }
  return normalized.toLowerCase();
}

export function validateCrmPhone(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  const digits = normalized.replace(/[\s().-]/g, "");
  if (!VN_PHONE_RE.test(digits) && digits.length < 6) {
    throw new Error("Số điện thoại không hợp lệ.");
  }
  return normalized;
}

export function validateCrmTaxCode(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  const compact = normalized.replace(/[\s.-]/g, "");
  if (/^\d{10,13}$/.test(compact) || VN_TAX_CODE_RE.test(normalized.replace(/\s/g, ""))) {
    return normalized;
  }
  if (/^[A-Za-z0-9-]{3,20}$/.test(normalized)) {
    return normalized;
  }
  throw new Error("Mã số thuế không hợp lệ.");
}

export function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
}

export function displayWebsiteUrl(value: string | null | undefined): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return "";
  return normalized.replace(/^https?:\/\//i, "");
}
