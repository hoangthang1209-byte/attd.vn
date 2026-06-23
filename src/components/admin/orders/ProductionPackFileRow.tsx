"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ProductionFileType } from "@prisma/client";
import {
  PRODUCTION_FILE_STATUS_LABELS,
  PRODUCTION_FILE_TYPE_LABELS,
} from "@/features/orders/production-pack-labels";
import {
  formatFileExtension,
  formatProductionFileScopeLabel,
  formatProductionFileUpdatedAt,
} from "@/features/orders/production-file-scope";
import type { OrderProductionFileRecord } from "@/features/orders/production-pack.types";
import { isPreviewableProductionMime } from "@/lib/productionFileValidation";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function resolveFileIconLabel(file: OrderProductionFileRecord): string {
  const ext = formatFileExtension(file.mediaAsset.format, file.mediaAsset.filename);
  if (ext === "PDF") return "PDF";
  return ext;
}

type Props = {
  file: OrderProductionFileRecord;
  onSetActive: (fileId: string) => void;
  onArchive: (fileId: string) => void;
  onDelete: (file: OrderProductionFileRecord) => void;
  onEdit: (file: OrderProductionFileRecord) => void;
  onNewVersion: (file: OrderProductionFileRecord) => void;
};

export default function ProductionPackFileRow({
  file,
  onSetActive,
  onArchive,
  onDelete,
  onEdit,
  onNewVersion,
}: Props) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isR2 = file.mediaAsset.storageProvider === "CLOUDFLARE_R2";
  const isCloudinaryImage =
    !isR2 &&
    file.mediaAsset.mimeType.startsWith("image/") &&
    isPreviewableProductionMime(file.mediaAsset.mimeType);
  const openUrl = `/api/production-files/${file.id}/open`;
  const downloadUrl = `/api/production-files/${file.id}/download`;
  const displayName =
    file.mediaAsset.originalName ?? file.mediaAsset.filename;
  const scopeLabel = formatProductionFileScopeLabel(file);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="production-pack-file-row">
      <div className="production-pack-file-row__main">
        {isCloudinaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.mediaAsset.thumbnailUrl ?? file.mediaAsset.url}
            alt=""
            className="production-pack-file-thumb"
          />
        ) : (
          <div
            className={`production-pack-file-icon${
              resolveFileIconLabel(file) === "PDF" ? " production-pack-file-icon--pdf" : ""
            }`}
            aria-hidden
          >
            {resolveFileIconLabel(file)}
          </div>
        )}
        <div className="production-pack-file-row__body">
          <div className="production-pack-file-row__title-line">
            <strong className="production-pack-file-row__title">
              {file.title ?? file.mediaAsset.filename}
            </strong>
            <span
              className={`production-pack-status production-pack-status--${file.status.toLowerCase()}`}
            >
              {PRODUCTION_FILE_STATUS_LABELS[file.status]}
            </span>
          </div>
          <p className="production-pack-file-row__meta">
            <span>{PRODUCTION_FILE_TYPE_LABELS[file.type as ProductionFileType]}</span>
            <span aria-hidden>·</span>
            <span>v{file.version}</span>
            <span aria-hidden>·</span>
            <span>{formatBytes(file.mediaAsset.sizeBytes)}</span>
            <span aria-hidden>·</span>
            <span>{formatFileExtension(file.mediaAsset.format, file.mediaAsset.filename)}</span>
          </p>
          <p className="production-pack-file-row__filename" title={displayName}>
            {displayName}
          </p>
          <p className="production-pack-file-row__meta">
            <span>{scopeLabel}</span>
            <span aria-hidden>·</span>
            <span>Cập nhật {formatProductionFileUpdatedAt(file.updatedAt)}</span>
          </p>
          {file.note && <p className="production-pack-file-row__note">{file.note}</p>}
        </div>
      </div>

      <div className="production-pack-file-row__actions" ref={menuRef}>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn--secondary admin-btn--xs"
        >
          Mở file
        </a>
        <div className="production-pack-file-menu">
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs production-pack-file-menu__trigger"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Thao tác
          </button>
          {menuOpen && (
            <div id={menuId} className="production-pack-file-menu__panel" role="menu">
              <a
                href={downloadUrl}
                className="production-pack-file-menu__item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Tải xuống
              </a>
              <button
                type="button"
                className="production-pack-file-menu__item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(file);
                }}
              >
                Chỉnh sửa thông tin
              </button>
              <button
                type="button"
                className="production-pack-file-menu__item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onNewVersion(file);
                }}
              >
                Tạo phiên bản mới
              </button>
              {file.status !== "ACTIVE" && (
                <button
                  type="button"
                  className="production-pack-file-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSetActive(file.id);
                  }}
                >
                  Đặt làm bản đang sử dụng
                </button>
              )}
              {file.status === "ACTIVE" && (
                <button
                  type="button"
                  className="production-pack-file-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive(file.id);
                  }}
                >
                  Lưu trữ
                </button>
              )}
              <button
                type="button"
                className="production-pack-file-menu__item production-pack-file-menu__item--danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(file);
                }}
              >
                Xóa file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
