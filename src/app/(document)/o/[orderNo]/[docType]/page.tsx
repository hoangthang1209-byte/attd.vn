import { notFound } from "next/navigation";
import { headers } from "next/headers";
import OrderDocumentContent from "@/components/orders/documents/OrderDocumentContent";
import OrderDocumentPdfReady from "@/components/orders/documents/OrderDocumentPdfReady";
import { getOrderDocumentAvailability } from "@/features/orders/order-document-availability";
import { formatOrderDocument } from "@/features/orders/order-document";
import { getOrderDetailByOrderNo } from "@/features/orders/order.service";
import { verifyOrderDocumentPdfToken } from "@/features/orders/pdf/order-document-pdf-token";
import {
  parseOrderDocumentType,
  resolveOrderDocumentBaseUrl,
} from "@/features/orders/pdf/order-pdf-url";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { resolveQuoteDocumentBaseUrl } from "@/features/quotes/pdf/quote-pdf-url";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { isCookieAdminAuthenticated } from "@/lib/admin-auth/session-node";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orderNo: string; docType: string }>;
  searchParams: Promise<{ mode?: string; pdfToken?: string }>;
};

function resolveDocumentVariant(mode?: string): "screen" | "pdf" | "print" {
  if (mode === "pdf") return "pdf";
  if (mode === "print") return "print";
  return "screen";
}

export default async function OrderDocumentPage({ params, searchParams }: Props) {
  const { orderNo: rawOrderNo, docType: rawDocType } = await params;
  const orderNo = decodeURIComponent(rawOrderNo);
  const docType = parseOrderDocumentType(rawDocType);
  if (!docType) notFound();

  const { mode, pdfToken } = await searchParams;
  const variant = resolveDocumentVariant(mode);
  const pdfAccess =
    variant === "pdf" &&
    pdfToken &&
    verifyOrderDocumentPdfToken(pdfToken, orderNo, docType);

  if (!pdfAccess) {
    const isAdmin = await isCookieAdminAuthenticated();
    if (!isAdmin) notFound();
  }

  const order = await getOrderDetailByOrderNo(orderNo);
  if (!order) notFound();

  const availability = getOrderDocumentAvailability(docType, order);
  if (!availability.available) notFound();

  const [companySettings, branding, requestHeaders] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
    headers(),
  ]);

  const company = resolveQuoteCompanyProfile(companySettings);
  const logoUrl = branding.headerLogoUrl ?? branding.footerLogoUrl;
  const document = formatOrderDocument(order, docType);
  const mediaBaseUrl =
    variant === "pdf" || variant === "print"
      ? resolveOrderDocumentBaseUrl(requestHeaders)
      : resolveQuoteDocumentBaseUrl(requestHeaders);

  return (
    <>
      <OrderDocumentContent
        document={document}
        company={company}
        logoUrl={logoUrl}
        variant={variant}
        mediaBaseUrl={mediaBaseUrl}
      />
      {variant === "pdf" ? <OrderDocumentPdfReady /> : null}
    </>
  );
}
