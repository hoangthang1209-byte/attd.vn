"use client";

import { useCallback, useState } from "react";
import { PRIVATE_FILE_HINT } from "@/features/tech-pack/tech-pack-labels";
import AdminUploadProgress, {
  type AdminUploadFileItem,
} from "@/components/admin/feedback/AdminUploadProgress";

type Props = {
  label?: string;
  accept?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
};

export default function PrivateFileUploadZone({
  label = "Kéo thả file hoặc bấm để chọn",
  accept,
  disabled = false,
  onUpload,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState<AdminUploadFileItem[]>([]);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file || disabled || uploading) return;
      const id = `${file.name}-${Date.now()}`;
      setLastFile(file);
      setQueue([
        {
          id,
          name: file.name,
          sizeBytes: file.size,
          state: "uploading",
          progress: null,
        },
      ]);
      setUploading(true);
      try {
        await onUpload(file);
        setQueue([{ id, name: file.name, sizeBytes: file.size, state: "done", progress: 100 }]);
      } catch {
        setQueue([
          {
            id,
            name: file.name,
            sizeBytes: file.size,
            state: "error",
            errorMessage: "Không thể tải file. Vui lòng thử lại.",
          },
        ]);
      } finally {
        setUploading(false);
      }
    },
    [disabled, onUpload, uploading],
  );

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
        <p className="tech-pack-upload-zone__label">{uploading ? "Đang tải lên…" : label}</p>
        <p className="tech-pack-upload-zone__hint">{PRIVATE_FILE_HINT}</p>
        {!disabled && (
          <label className="admin-btn admin-btn--secondary admin-btn--small" style={{ cursor: "pointer" }}>
            Chọn file
            <input
              type="file"
              hidden
              accept={accept}
              disabled={uploading}
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      <AdminUploadProgress
        files={queue}
        onRetry={
          lastFile
            ? () => {
                void (async () => {
                  const file = lastFile;
                  const id = `${file.name}-${Date.now()}`;
                  setQueue([
                    {
                      id,
                      name: file.name,
                      sizeBytes: file.size,
                      state: "uploading",
                      progress: null,
                    },
                  ]);
                  setUploading(true);
                  try {
                    await onUpload(file);
                    setQueue([
                      { id, name: file.name, sizeBytes: file.size, state: "done", progress: 100 },
                    ]);
                  } catch {
                    setQueue([
                      {
                        id,
                        name: file.name,
                        sizeBytes: file.size,
                        state: "error",
                        errorMessage: "Không thể tải file. Vui lòng thử lại.",
                      },
                    ]);
                  } finally {
                    setUploading(false);
                  }
                })();
              }
            : undefined
        }
      />
    </div>
  );
}
