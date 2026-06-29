import DealerRfqDetailView from "@/components/admin/dealer/DealerRfqDetailView";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminDealerRfqDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <DealerRfqDetailView rfqId={id} />;
}
