import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CaseStudiesManager from "@/components/admin/CaseStudiesManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Case Study");

export default function CaseStudiesPage() {
  return (
    <>
      <AdminPageTitle title={"Dự án tiêu biểu"} />
      <CaseStudiesManager />
    </>
  );
}
