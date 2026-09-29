export function normalizeLeadEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function normalizeLeadPhone(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw || raw === "—") return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("84") && digits.length >= 10) {
    digits = "0" + digits.slice(2);
  }
  if (!digits.startsWith("0") && digits.length === 9) digits = "0" + digits;
  return digits;
}
