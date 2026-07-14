import MediaBundleEditorClient from "@/components/admin/media/MediaBundleEditorClient";

type Props = { params: Promise<{ id: string }> };

export default async function MediaBundleEditorPage({ params }: Props) {
  const { id } = await params;
  return <MediaBundleEditorClient bundleId={id} />;
}
