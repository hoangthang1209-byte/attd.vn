import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MediaMasterDataManager from "@/components/admin/content/MediaMasterDataManager";

export default function MediaLibrariesPage() {
  return (
    <>
      <AdminPageTitle title="Nhóm thư viện ảnh" />
      <MediaMasterDataManager
        kind="library"
        listPath="/api/content/media-libraries"
        itemPath={(id) => `/api/content/media-libraries/${id}`}
        listKey="libraries"
        createLabel="Thêm thư viện"
        entityLabel="thư viện ảnh"
      />
    </>
  );
}
