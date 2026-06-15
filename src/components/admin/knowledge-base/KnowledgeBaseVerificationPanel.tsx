"use client";

type Props = {
  isVerified: boolean;
  verifiedAt: string | null;
  onChange: (isVerified: boolean) => void;
};

export default function KnowledgeBaseVerificationPanel({ isVerified, verifiedAt, onChange }: Props) {
  return (
    <div className="admin-kb-verification">
      <label className="admin-radio-item">
        <input type="checkbox" checked={isVerified} onChange={(e) => onChange(e.target.checked)} />
        <span>Đã kiểm chứng</span>
      </label>
      {!isVerified && (
        <p className="admin-kb-warning">
          Entry chưa verified — cẩn thận khi dùng cho AI viết nội dung tự động.
        </p>
      )}
      {isVerified && verifiedAt && (
        <p className="admin-field-hint">
          Kiểm chứng lúc: {new Date(verifiedAt).toLocaleString("vi-VN")}
        </p>
      )}
    </div>
  );
}
