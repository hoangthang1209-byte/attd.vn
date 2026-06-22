import { notFound, redirect } from "next/navigation";
import DeliveryNoteDocument from "@/components/admin/orders/delivery-note/DeliveryNoteDocument";
import { buildDeliveryNoteViewModel } from "@/features/orders/delivery-note/delivery-note.service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ executionId?: string }>;
};

export default async function DeliveryNotePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { executionId } = await searchParams;
  if (!executionId) notFound();

  const data = await buildDeliveryNoteViewModel(id, executionId);
  if (!data) notFound();

  redirect(`/admin/orders/${id}/delivery-note/document?executionId=${executionId}`);
}
