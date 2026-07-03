import ProductionJobDetailView from "@/components/admin/production-planning/ProductionJobDetailView";

type Props = { params: Promise<{ orderItemId: string }> };

export default async function ProductionJobDetailPage({ params }: Props) {
  const { orderItemId } = await params;
  return <ProductionJobDetailView orderItemId={orderItemId} />;
}
