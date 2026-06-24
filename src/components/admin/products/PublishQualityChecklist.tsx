import type { PublishChecklistItem } from "@/lib/seo/publish-quality-gate";

type PublishQualityChecklistProps = {
  items: PublishChecklistItem[];
  title?: string;
  legacyWarning?: boolean;
};

export default function PublishQualityChecklist({
  items,
  title = "Điều kiện xuất bản",
  legacyWarning = false,
}: PublishQualityChecklistProps) {
  if (items.length === 0) return null;

  return (
    <div className="admin-publish-quality-checklist">
      <p className="admin-subtitle" style={{ marginBottom: 8 }}>{title}</p>
      {legacyWarning && (
        <p className="admin-field-hint admin-publish-quality-legacy-warning">
          Nội dung hiện tại chưa đạt điều kiện SEO khuyến nghị. Hãy hoàn thiện trước lần xuất bản tiếp theo.
        </p>
      )}
      <ul className="admin-publish-quality-list">
        {items.map((item) => (
          <li
            key={item.key}
            className={item.complete ? "admin-publish-quality-item--complete" : "admin-publish-quality-item--missing"}
          >
            <span aria-hidden="true">{item.complete ? "✓" : "○"}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
