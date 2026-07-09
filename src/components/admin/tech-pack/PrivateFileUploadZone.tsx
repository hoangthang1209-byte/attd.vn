"use client";

import { useCallback, useState } from "react";
import { PRIVATE_FILE_HINT } from "@/features/tech-pack/tech-pack-labels";
import AdminUploadProgress, {
  type AdminUploadFileItem,
} from "@/components/admin/feedback/AdminUploadProgress";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";

type Props = {
  label?: string;
  accept?: string;
  disabled?: boolean;
  multiple?: boolean;
  onUpload: (file: File) => Promise<void>;
};

export default function PrivateFileUploadZone({
  label = "Kéo thả file hoặc bấm để chọn",
  accept,
  disabled = false,
  multiple = true,
  onUpload,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState<AdminUploadFileItem[]>([]);
  const [retryMap, setRetryMap] = useState<Record<string, File>>({});

  const uploadSingle = useCallback(
    async (file: File, queueId: string) => {
      setQueue((prev) =>
        prev.map((item) =>
          item.id === queueId ? { ...item, state: "uploading", progress: null, errorMessage: undefined } : item,
        ),
      );
      try {
        await onUpload(file);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === queueId ? { ...item, state: "done", progress: 100 } : item,
          ),
        );
      } catch {
        setRetryMap((prev) => ({ ...prev, [queueId]: file }));
        setQueue((prev) =>
          prev.map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  state: "error",
                  errorMessage: "Không thể tải file. Vui lòng thử lại.",
                }
              : item,
          ),
        );
        throw new Error("upload failed");
      }
    },
    [onUpload],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled || uploading) return;
      const selected = Array.from(files);
      const items: AdminUploadFileItem[] = selected.map((file, index) => ({
        id: `${file.name}-${Date.now()}-${index}`,
        name: file.name,
        sizeBytes: file.size,
        state: "uploading",
        progress: null,
      }));

      setQueue((prev) => [...prev, ...items]);
      setUploading(true);

      const nextRetryMap: Record<string, File> = {};
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index]!;
        const queueId = items[index]!.id;
        nextRetryMap[queueId] = file;
        try {
          await uploadSingle(file, queueId);
        } catch {
          /* per-file error shown in queue */
        }
      }
      setRetryMap((prev) => ({ ...prev, ...nextRetryMap }));
      setUploading(false);
    },
    [disabled, uploadSingle, uploading],
  );

  function retryItem(id: string) {
    const file = retryMap[id];
    if (!file || uploading) return;
    setUploading(true);
    void uploadSingle(file, id).finally(() => setUploading(false));
  }

  return (
    <div>
      <div
        className={`tech-pack-upload-zone${dragging ? " is-dragging" : ""}${disabled || uploading ? " is-disabled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) void handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="tech-pack-upload-zone__label">
          {uploading ? <InlineLoading title="Đang tải file lên…" tone="admin" /> : label}
        </p>
        <p className="tech-pack-upload-zone__hint">
          {multiple ? "Có thể chọn hoặc kéo thả nhiều file cùng lúc. " : ""}
          {PRIVATE_FILE_HINT}
        </p>
        {!disabled && (
          <label className="admin-btn admin-btn--secondary admin-btn--small" style={{ cursor: "pointer" }}>
            Chọn file
            <input
              type="file"
              hidden
              multiple={multiple}
              accept={accept}
              disabled={uploading}
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <AdminUploadProgress
        files={queue}
        onRetry={(id) => retryItem(id)}
      />
    </div>
  );
}
