import SeoTopicDetailClient from "@/components/admin/seo-content/SeoTopicDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function SeoTopicDetailPage({ params }: Props) {
  const { id } = await params;
  return <SeoTopicDetailClient topicId={id} />;
}
