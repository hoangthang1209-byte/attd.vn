"use client";

import { Loader2, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

export type AdminUploadFileState =
  | "preparing"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export type AdminUploadFileItem = {
  id: string;
  name: string;
  sizeBytes?: number;
  state: AdminUploadFileState;
  progress?: number | null;
  errorMessage?: string | null;
};

const STATE_LABELS: Record<AdminUploadFileState, string> = {
  preparing: "Đang chuẩn bị tệp...",
  uploading: "Đang tải tệp lên...",
  processing: "Đang xử lý tệp...",
  done: "Hoàn tất",
  error: "Không thể tải file",
};

function formatSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  files: AdminUploadFileItem[];
  onRetry?: (id: string) => void;
  className?: string;
};

export default function AdminUploadProgress({ files, onRetry, className }: Props) {
  if (files.length === 0) return null;

  return (
    <ul className={`admin-upload-progress${className ? ` ${className}` : ""}`}>
      {files.map((file) => {
        const indeterminate =
          file.state === "uploading" && (file.progress == null || file.progress < 0);
        const percent =
          file.progress != null && file.progress >= 0
            ? Math.min(100, Math.round(file.progress))
            : null;

        return (
          <li
            key={file.id}
            className={`admin-upload-progress__item admin-upload-progress__item--${file.state}`}
          >
            <div className="admin-upload-progress__row">
              <div className="admin-upload-progress__meta">
                <strong className="admin-upload-progress__name">{file.name}</strong>
                {file.sizeBytes != null && (
                  <span className="admin-upload-progress__size">{formatSize(file.sizeBytes)}</span>
                )}
              </div>
              <div className="admin-upload-progress__status">
                {file.state === "done" && (
                  <CheckCircle2 size={16} className="admin-upload-progress__icon--done" aria-hidden />
                )}
                {file.state === "error" && (
                  <AlertCircle size={16} className="admin-upload-progress__icon--error" aria-hidden />
                )}
                {(file.state === "preparing" ||
                  file.state === "uploading" ||
                  file.state === "processing") && (
                  <Loader2 size={16} className="admin-upload-progress__icon--spin" aria-hidden />
                )}
                <span>
                  {file.state === "error" && file.errorMessage
                    ? file.errorMessage
                    : STATE_LABELS[file.state]}
                </span>
              </div>
            </div>
            {(file.state === "uploading" || file.state === "processing") && (
              <div
                className="admin-upload-progress__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent ?? undefined}
                aria-label={STATE_LABELS[file.state]}
              >
                <div
                  className={`admin-upload-progress__bar-fill${
                    indeterminate ? " is-indeterminate" : ""
                  }`}
                  style={percent != null ? { width: `${percent}%` } : undefined}
                />
              </div>
            )}
            {file.state === "error" && onRetry && (
              <AdminLoadingButton
                variant="ghost"
                size="xs"
                className="admin-upload-progress__retry"
                onClick={() => onRetry(file.id)}
              >
                <RotateCcw size={12} aria-hidden style={{ marginRight: 4 }} />
                Thử lại
              </AdminLoadingButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
