"use client";

type Template = {
  id: string;
  label: string;
  description?: string;
};

type Props = {
  heading: string;
  subtitle?: string;
  templates: Template[];
  apiBase: string;
  /** notes shown below the buttons */
  notes?: string[];
};

/**
 * Reusable "download template" card for every bulk import page.
 * Downloads as CSV (default) or XLSX via the provided API base URL.
 *
 * Convention: every bulk import page must have one of these.
 */
export default function ImportTemplateSection({
  heading,
  subtitle = "Trước khi nhập dữ liệu, hãy tải file mẫu để điền đúng cột. Sau khi hoàn tất, lưu lại dưới dạng .CSV hoặc .XLSX rồi upload lên CMS.",
  templates,
  apiBase,
  notes = [],
}: Props) {
  function download(id: string, format: "csv" | "xlsx") {
    const url = `${apiBase}?type=${encodeURIComponent(id)}&format=${format}`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  return (
    <div className="admin-import-template-section">
      <div className="admin-import-template-header">
        <span className="admin-import-template-icon">📄</span>
        <div>
          <h3 className="admin-import-template-title">{heading}</h3>
          <p className="admin-field-hint">{subtitle}</p>
        </div>
      </div>

      <div className="admin-import-template-grid">
        {templates.map((t) => (
          <div key={t.id} className="admin-import-template-card">
            <div className="admin-import-template-card-label">{t.label}</div>
            {t.description && (
              <p className="admin-field-hint admin-import-template-card-desc">{t.description}</p>
            )}
            <div className="admin-import-template-card-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => download(t.id, "csv")}
              >
                ↓ CSV
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => download(t.id, "xlsx")}
              >
                ↓ Excel
              </button>
            </div>
          </div>
        ))}
      </div>

      {notes.length > 0 && (
        <ul className="admin-import-template-notes">
          {notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
