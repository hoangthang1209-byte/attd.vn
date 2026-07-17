import { redirect } from "next/navigation";

/** Legacy admin product edit form — canonical editor is /admin/products/[id]/edit. */
export default async function LegacyProductEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/products/${id}/edit`);
}
