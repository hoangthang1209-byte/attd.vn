import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialsList from "@/components/admin/materials/MaterialsList";

export default function AdminMaterialsPage() {
  return (
    <>
      <AdminPageTitle title="Danh mục vật tư" />
      <MaterialsList />
    </>
  );
}
