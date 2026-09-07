import SeoDashboardClient from "@/components/admin/seo-content/SeoDashboardClient";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("SEO");

export default function SeoDashboardPage() {
  return <SeoDashboardClient />;
}
