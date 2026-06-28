import MeasurementTemplateDetailManager from "@/components/admin/measurement-template/MeasurementTemplateDetailManager";

type Props = { params: Promise<{ id: string }> };

export default async function MeasurementTemplateDetailPage({ params }: Props) {
  const { id } = await params;
  return <MeasurementTemplateDetailManager templateId={id} />;
}
