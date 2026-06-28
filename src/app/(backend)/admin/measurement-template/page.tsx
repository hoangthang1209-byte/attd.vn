import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MeasurementTemplateListManager from "@/components/admin/measurement-template/MeasurementTemplateListManager";

export default function MeasurementTemplatePage() {
  return (
    <>
      <AdminPageTitle title="Mẫu thông số" />
      <MeasurementTemplateListManager />
    </>
  );
}
