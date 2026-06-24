export type CustomerAddressParts = {
  addressLine1?: string | null;
  wardNameSnapshot?: string | null;
  provinceNameSnapshot?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
};

export function formatCustomerAddressPreview(parts: CustomerAddressParts): string {
  const structured = [parts.addressLine1, parts.wardNameSnapshot, parts.provinceNameSnapshot]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  if (structured) return structured;

  return [parts.address, parts.district, parts.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function getLegacyAddressDisplay(parts: CustomerAddressParts): string | null {
  const legacy = [parts.address, parts.district, parts.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return legacy || null;
}

export function hasStructuredAddress(parts: CustomerAddressPartsWithIds): boolean {
  return Boolean(
    parts.addressLine1?.trim() ||
      parts.wardNameSnapshot?.trim() ||
      parts.provinceNameSnapshot?.trim() ||
      parts.provinceId ||
      parts.wardId,
  );
}

export type CustomerAddressPartsWithIds = CustomerAddressParts & {
  provinceId?: string | null;
  wardId?: string | null;
};

export function buildNormalizedAddressFromLegacy(parts: CustomerAddressParts): {
  addressLine1: string | null;
  provinceNameSnapshot: string | null;
  wardNameSnapshot: string | null;
} {
  return {
    addressLine1: parts.address?.trim() || null,
    provinceNameSnapshot: parts.province?.trim() || null,
    wardNameSnapshot: parts.district?.trim() || null,
  };
}
