import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";
import PortalRfqForm from "@/components/portal/PortalRfqForm";

export default function PortalRfqNewPage() {
  return (
    <PortalBusinessGuard>
      <PortalRfqForm />
    </PortalBusinessGuard>
  );
}
