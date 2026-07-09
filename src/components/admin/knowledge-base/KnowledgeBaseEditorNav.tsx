"use client";

import Link from "next/link";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  saving: boolean;
  isDirty: boolean;
  onSave: () => Promise<boolean>;
  onSaveAndBack: () => Promise<void>;
};

export default function KnowledgeBaseEditorNav({ saving, isDirty, onSave, onSaveAndBack }: Props) {
  function confirmLeave(): boolean {
    if (!isDirty) return true;
    return window.confirm("Bạn có thay đổi chưa lưu. Rời trang?");
  }

  return (
    <>
      <div className="admin-kb-editor-nav-top">
        <Link
          href="/admin/knowledge-base"
          className="admin-kb-back-link"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault();
          }}
        >
          ← Quay về Knowledge Base
        </Link>
      </div>

      <div className="admin-kb-editor-nav-bottom">
        <AdminLoadingButton variant="primary" pending={saving} pendingLabel="Đang lưu mục…" onClick={() => void onSave()}>
          Lưu
        </AdminLoadingButton>
        <AdminLoadingButton
          variant="secondary"
          pending={saving}
          pendingLabel="Đang lưu mục…"
          onClick={() => void onSaveAndBack()}
        >
          Lưu & Quay lại
        </AdminLoadingButton>
        <Link
          href="/admin/knowledge-base"
          className="admin-btn admin-btn--secondary"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault();
          }}
        >
          Quay về danh sách
        </Link>
      </div>
    </>
  );
}
