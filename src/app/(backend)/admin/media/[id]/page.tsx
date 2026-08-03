import { Suspense } from "react";
import MediaAssetWorkspaceClient from "@/components/admin/media/MediaAssetWorkspaceClient";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";

type Props = { params: Promise<{ id: string }> };

export default async function MediaAssetWorkspacePage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<InlineLoading title="Đang tải Asset Workspace…" />}>
      <MediaAssetWorkspaceClient assetId={id} />
    </Suspense>
  );
}
