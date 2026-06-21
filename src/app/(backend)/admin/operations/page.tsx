import AdminPageTitle from "@/components/admin/AdminPageTitle";
import OperationsDashboard from "@/components/admin/operations/OperationsDashboard";

export default function OperationsPage() {
  return (
    <>
      <AdminPageTitle title={"Tổng quan vận hành"} />
      <OperationsDashboard />
    </>
  );
}
