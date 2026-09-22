import type { Metadata } from "next";
import "./portal.css";
import PortalShell from "@/components/portal/PortalShell";
import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/indexation-policy";

export const metadata: Metadata = {
  robots: ROBOTS_NOINDEX_NOFOLLOW,
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
