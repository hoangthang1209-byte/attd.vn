import ContentReviewDetailClient from "@/components/admin/content/ContentReviewDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function ContentReviewDetailPage({ params }: Props) {
  const { id } = await params;
  return <ContentReviewDetailClient reviewId={id} />;
}
