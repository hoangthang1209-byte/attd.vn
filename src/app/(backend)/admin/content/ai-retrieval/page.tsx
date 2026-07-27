import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AiRetrievalPreviewClient from "@/components/admin/ai-retrieval/AiRetrievalPreviewClient";
import type {
  AiRetrievalConsumer,
  AiRetrievalPurpose,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { AI_RETRIEVAL_ENABLED_CONSUMERS, AI_RETRIEVAL_PURPOSES } from "@/features/ai-retrieval/ai-retrieval-types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AiRetrievalPreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const consumerRaw = pickString(params.consumer);
  const purposeRaw = pickString(params.purpose);
  const query = pickString(params.query);
  const seoTopicId = pickString(params.seoTopicId);

  const consumer = AI_RETRIEVAL_ENABLED_CONSUMERS.includes(consumerRaw as AiRetrievalConsumer)
    ? (consumerRaw as AiRetrievalConsumer)
    : "SEO_CONTENT";
  const purpose = AI_RETRIEVAL_PURPOSES.includes(purposeRaw as AiRetrievalPurpose)
    ? (purposeRaw as AiRetrievalPurpose)
    : "PUBLIC_OUTPUT";

  return (
    <>
      <AdminPageTitle title="Kiểm tra ngữ cảnh bài viết" />
      <AiRetrievalPreviewClient
        initialConsumer={consumer}
        initialPurpose={purpose}
        initialQuery={query}
        initialSeoTopicId={seoTopicId}
      />
    </>
  );
}
