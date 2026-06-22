import { notFound } from "next/navigation";
import { headers } from "next/headers";
import DeliveryNoteDocument from "@/components/admin/orders/delivery-note/DeliveryNoteDocument";
import { buildDeliveryNoteViewModel } from "@/features/orders/delivery-note/delivery-note.service";
import { verifyDeliveryNotePdfToken } from "@/features/orders/delivery-note/delivery-note-pdf-token";
import { isCookieAdminAuthenticated } from "@/lib/admin-auth/session-node";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ executionId?: string; mode?: string; pdfToken?: string }>;
};

function resolveVariant(mode?: string): "screen" | "pdf" | "print" {
  if (mode === "pdf") return "pdf";
  if (mode === "print") return "print";
  return "screen";
}

export default async function DeliveryNoteDocumentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { executionId, mode, pdfToken } = await searchParams;
  if (!executionId) notFound();

  const variant = resolveVariant(mode);
  const pdfAccess =
    variant === "pdf" && pdfToken && verifyDeliveryNotePdfToken(pdfToken, id, executionId);

  if (!pdfAccess) {
    const isAdmin = await isCookieAdminAuthenticated();
    if (!isAdmin) notFound();
  }

  const data = await buildDeliveryNoteViewModel(id, executionId);
  if (!data) notFound();

  await headers();

  return (
    <div className="order-document-page">
      <DeliveryNoteDocument data={data} variant={variant} />
    </div>
  );
}
