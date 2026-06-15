import AdminShell from "@/components/admin/AdminShell";
import DemoContentSeeder from "@/components/admin/demo/DemoContentSeeder";

export const metadata = { title: "Dữ liệu demo website | ATTD CMS" };

export default function DemoPage() {
  return (
    <AdminShell title="Dữ liệu demo website">
      <DemoContentSeeder />
    </AdminShell>
  );
}
