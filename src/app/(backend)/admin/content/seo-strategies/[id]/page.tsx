import SeoStrategyDetailClient from "@/components/admin/seo-content/SeoStrategyDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function SeoStrategyDetailPage({ params }: Props) {
  const { id } = await params;
  return <SeoStrategyDetailClient strategyId={id} />;
}
