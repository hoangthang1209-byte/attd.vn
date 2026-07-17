import { redirect } from "next/navigation";

/** Legacy admin product detail — use the one-screen catalog editor. */
export default async function LegacyProductDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/products/${id}/edit`);
}
