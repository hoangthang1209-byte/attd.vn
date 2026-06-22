import { variantStatusLabel } from "@/features/products/product-variant-labels";
import { isValidProductImageUrl } from "@/features/products/product-image-url";

export type VariantLike = {
  id: string;
  variantStatus?: string;
  moqOverride?: number | null;
  leadTimeOverride?: string | null;
  imageUrl?: string | null;
};

export function filterActivePublicVariants<T extends { variantStatus?: string }>(
  variants: T[],
): T[] {
  return variants.filter((v) => (v.variantStatus ?? "ACTIVE") === "ACTIVE");
}

export function resolveEffectiveMoq(
  variantMoq: number | null | undefined,
  productMoq: number | null | undefined,
): number | null {
  if (variantMoq != null && Number.isFinite(variantMoq)) return variantMoq;
  if (productMoq != null && Number.isFinite(productMoq)) return productMoq;
  return null;
}

export function resolveEffectiveLeadTime(
  variantLeadTime: string | null | undefined,
  productLeadTime: string | null | undefined,
): string | null {
  const trimmed = variantLeadTime?.trim();
  if (trimmed) return trimmed;
  const productTrimmed = productLeadTime?.trim();
  return productTrimmed || null;
}

export function isMoqOverridden(variantMoq: string | number | null | undefined): boolean {
  if (variantMoq == null) return false;
  if (typeof variantMoq === "number") return Number.isFinite(variantMoq);
  return variantMoq.trim() !== "";
}

export function isLeadTimeOverridden(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function isImageOverridden(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Quote payloads must reference an active variant when variants exist. */
export function resolveQuoteVariantId(
  variants: VariantLike[],
  selectedVariantId: string | null,
): string | null {
  const active = filterActivePublicVariants(variants);
  if (!active.length) return null;
  if (selectedVariantId && active.some((v) => v.id === selectedVariantId)) {
    return selectedVariantId;
  }
  return null;
}

/** Saving basics must not change variant status unless explicitly provided. */
export function mergeVariantStatusOnSave(
  currentStatus: string,
  incomingStatus: string | undefined,
): string {
  if (incomingStatus === undefined) return currentStatus;
  return incomingStatus;
}

export function mapImportVariantStatusForDisplay(status: string | undefined): string {
  if (!status) return "—";
  return variantStatusLabel(status.toUpperCase());
}

export function exportIncludesPricingByDefault(flags: {
  includeWholesalePrice?: boolean;
  includeDealerPrice?: boolean;
}): boolean {
  return Boolean(flags.includeWholesalePrice || flags.includeDealerPrice);
}

export type QaRegressionIssue = { scenario: string; message: string };

export function runProductCatalogQaRegressionSelfTest(): QaRegressionIssue[] {
  const issues: QaRegressionIssue[] = [];

  if (variantStatusLabel("ACTIVE") !== "Đang hoạt động") {
    issues.push({ scenario: "labels", message: "ACTIVE label mismatch" });
  }
  if (variantStatusLabel("INACTIVE") !== "Ngừng sử dụng") {
    issues.push({ scenario: "labels", message: "INACTIVE label mismatch" });
  }
  if (variantStatusLabel("ARCHIVED") !== "Lưu trữ") {
    issues.push({ scenario: "labels", message: "ARCHIVED label mismatch" });
  }

  const activeOnly = filterActivePublicVariants([
    { variantStatus: "ACTIVE" },
    { variantStatus: "INACTIVE" },
    { variantStatus: "ARCHIVED" },
  ]);
  if (activeOnly.length !== 1) {
    issues.push({ scenario: "pdp-filter", message: "Active variant filter failed" });
  }

  if (resolveEffectiveMoq(100, 50) !== 100) {
    issues.push({ scenario: "moq", message: "MOQ override not preferred" });
  }
  if (resolveEffectiveMoq(null, 50) !== 50) {
    issues.push({ scenario: "moq", message: "MOQ inherit failed" });
  }

  if (resolveEffectiveLeadTime("3 ngày", "7 ngày") !== "3 ngày") {
    issues.push({ scenario: "leadTime", message: "Lead time override failed" });
  }

  if (mergeVariantStatusOnSave("INACTIVE", undefined) !== "INACTIVE") {
    issues.push({ scenario: "save", message: "Status resurrected on undefined" });
  }

  if (isValidProductImageUrl("ftp://bad.com/a.jpg")) {
    issues.push({ scenario: "image", message: "FTP URL should be rejected" });
  }
  if (!isValidProductImageUrl("https://cdn.example.com/a.jpg")) {
    issues.push({ scenario: "image", message: "HTTPS URL should be accepted" });
  }

  const quoteId = resolveQuoteVariantId(
    [
      { id: "a", variantStatus: "INACTIVE" },
      { id: "b", variantStatus: "ACTIVE" },
    ],
    "a",
  );
  if (quoteId !== null) {
    issues.push({ scenario: "quote", message: "Inactive variant must not be quoted" });
  }

  if (exportIncludesPricingByDefault({})) {
    issues.push({ scenario: "export", message: "Pricing should be off by default" });
  }

  return issues;
}
