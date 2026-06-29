import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";
import PortalRfqDetail from "@/components/portal/PortalRfqDetail";

type PageProps = { params: Promise<{ id: string }> };

export default async function PortalRfqDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PortalBusinessGuard>
      <PortalRfqDetail rfqId={id} />
    </PortalBusinessGuard>
  );
}
