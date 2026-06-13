import AdminShell from "@/components/admin/AdminShell";
import MediaLibraryClient from "@/components/admin/MediaLibraryClient";

export default function MediaPage() {
  return (
    <AdminShell title="Thư viện ảnh">
      <MediaLibraryClient />
    </AdminShell>
  );
}
