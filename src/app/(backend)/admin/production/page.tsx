import ProductionDashboardManager from "@/components/admin/production-planning/ProductionDashboardManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Tổng quan sản xuất");

export default function ProductionDashboardPage() {
  return <ProductionDashboardManager />;
}
