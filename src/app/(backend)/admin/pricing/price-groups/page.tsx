import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PriceGroupsManager from "@/components/admin/pricing/PriceGroupsManager";

export default function PriceGroupsPage() {
  return (
    <>
      <AdminPageTitle title={"Nhóm giá"} />
      <PriceGroupsManager />
    </>
  );
}
