import ProductionMasterListManager from "@/components/admin/production-master/ProductionMasterListManager";
import { PRODUCTION_SUPPLIER_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

export default function ProductionSuppliersPage() {
  return <ProductionMasterListManager config={PRODUCTION_SUPPLIER_ADMIN} />;
}
