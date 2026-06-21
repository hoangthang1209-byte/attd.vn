import AdminPageTitle from "@/components/admin/AdminPageTitle";
import SeoBriefGenerator from "@/components/admin/seo/SeoBriefGenerator";

export default function SeoBriefGeneratorPage() {
  return (
    <>
      <AdminPageTitle title={"Trình tạo SEO Brief"} />
      <SeoBriefGenerator />
    </>
  );
}
