import PortalSidebar from "@/components/portal/PortalSidebar";
import PortalTopbar from "@/components/portal/PortalTopbar";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";

type PortalShellProps = {
  children: React.ReactNode;
};

export default async function PortalShell({ children }: PortalShellProps) {
  const ctx = await getDealerPortalContext();

  return (
    <div className="portal-shell">
      <PortalSidebar ctx={ctx} />
      <div className="portal-main">
        <PortalTopbar ctx={ctx} />
        <div className="portal-content">{children}</div>
      </div>
    </div>
  );
}
