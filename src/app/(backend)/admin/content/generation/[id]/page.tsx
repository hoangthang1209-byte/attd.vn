import ContentGenerationDetailClient from "@/components/admin/content/ContentGenerationDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function ContentGenerationDetailPage({ params }: Props) {
  const { id } = await params;
  return <ContentGenerationDetailClient runId={id} />;
}
