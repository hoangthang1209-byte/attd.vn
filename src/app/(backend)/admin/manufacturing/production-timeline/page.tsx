import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ItemProductionTimelineManager from "@/components/admin/item-production/ItemProductionTimelineManager";

export default function ItemProductionTimelinePage() {
  return (
    <>
      <AdminPageTitle title="Tiến độ sản xuất" />
      <ItemProductionTimelineManager />
    </>
  );
}
