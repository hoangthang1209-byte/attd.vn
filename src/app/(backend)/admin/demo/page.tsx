import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DemoContentSeeder from "@/components/admin/demo/DemoContentSeeder";

export const metadata = { title: "Dữ liệu demo website | ATTD CMS" };

export default function DemoPage() {
  return (
    <>
      <AdminPageTitle title={"Dữ liệu demo website"} />
      <DemoContentSeeder />
    </>
  );
}
