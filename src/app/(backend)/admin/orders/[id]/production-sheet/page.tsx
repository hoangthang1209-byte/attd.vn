import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductionSheetPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/orders/${encodeURIComponent(id)}/production-sheet/document`);
}
