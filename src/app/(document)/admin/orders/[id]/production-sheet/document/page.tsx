import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ProductionSheetDocument from "@/components/admin/orders/production-sheet/ProductionSheetDocument";
import ProductionSheetPdfReady from "@/components/admin/orders/production-sheet/ProductionSheetPdfReady";
import { getProductionSheetAvailability } from "@/features/orders/production-sheet/production-sheet-availability";
import { verifyProductionSheetPdfToken } from "@/features/orders/production-sheet/production-sheet-pdf-token";
import { resolveOrderDocumentBaseUrl } from "@/features/orders/production-sheet/production-sheet-pdf-url";
import {
  attachProductionSheetPdfMeta,
  buildProductionSheetViewModel,
} from "@/features/orders/production-sheet/production-sheet.service";
import type { ProductionSheetPdfData } from "@/features/orders/production-sheet/production-sheet.types";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { resolveQuoteDocumentBaseUrl } from "@/features/quotes/pdf/quote-pdf-url";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { isCookieAdminAuthenticated } from "@/lib/admin-auth/session-node";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; pdfToken?: string }>;
};

function resolveDocumentVariant(mode?: string): "screen" | "pdf" | "print" {
  if (mode === "pdf") return "pdf";
  if (mode === "print") return "print";
  return "screen";
}

function withResolvedMediaUrls(
  data: ProductionSheetPdfData,
  mediaBaseUrl: string,
): ProductionSheetPdfData {
  return {
    ...data,
    logoUrl: resolveAbsoluteMediaUrl(data.logoUrl, mediaBaseUrl),
    variantRows: data.variantRows.map((row) => ({
      ...row,
      designImageUrl: resolveAbsoluteMediaUrl(row.designImageUrl, mediaBaseUrl),
    })),
    orderLevelFiles: data.orderLevelFiles.map((file) => ({
      ...file,
      previewUrl: resolveAbsoluteMediaUrl(file.previewUrl, mediaBaseUrl),
    })),
    itemLevelFiles: data.itemLevelFiles.map((group) => ({
      ...group,
      files: group.files.map((file) => ({
        ...file,
        previewUrl: resolveAbsoluteMediaUrl(file.previewUrl, mediaBaseUrl),
      })),
    })),
  };
}

export default async function ProductionSheetDocumentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { mode, pdfToken } = await searchParams;
  const variant = resolveDocumentVariant(mode);
  const pdfAccess =
    variant === "pdf" && pdfToken && verifyProductionSheetPdfToken(pdfToken, id);

  if (!pdfAccess) {
    const isAdmin = await isCookieAdminAuthenticated();
    if (!isAdmin) notFound();
  }

  const sheet = await buildProductionSheetViewModel(id);
  if (!sheet) notFound();

  const availability = getProductionSheetAvailability(sheet);
  if (!availability.available) notFound();

  const [companySettings, branding, requestHeaders] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
    headers(),
  ]);

  const company = resolveQuoteCompanyProfile(companySettings);
  const logoUrl = branding.headerLogoUrl ?? branding.footerLogoUrl;
  const mediaBaseUrl =
    variant === "pdf" || variant === "print"
      ? resolveOrderDocumentBaseUrl(requestHeaders)
      : resolveQuoteDocumentBaseUrl(requestHeaders);

  const data = withResolvedMediaUrls(
    attachProductionSheetPdfMeta(sheet, company, logoUrl),
    mediaBaseUrl,
  );

  return (
    <>
      <ProductionSheetDocument data={data} variant={variant} />
      {variant === "pdf" ? <ProductionSheetPdfReady /> : null}
    </>
  );
}
