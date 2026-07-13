import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MediaMasterDataManager from "@/components/admin/content/MediaMasterDataManager";

export default function MediaRolesPage() {
  return (
    <>
      <AdminPageTitle title="Vai trò hiển thị ảnh" />
      <MediaMasterDataManager
        kind="role"
        listPath="/api/content/media-roles"
        itemPath={(id) => `/api/content/media-roles/${id}`}
        listKey="roles"
        createLabel="Thêm vai trò"
        entityLabel="vai trò hiển thị"
      />
    </>
  );
}
