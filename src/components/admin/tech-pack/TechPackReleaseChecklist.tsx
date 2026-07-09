"use client";

import { useCallback, useEffect, useState } from "react";

type ChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
};

type BomCheck = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  bomItemId: string;
  category: string;
  field?: string;
};

type Readiness = {
  canRelease: boolean;
  items: ChecklistItem[];
  errors: string[];
  bomChecks?: BomCheck[];
  hasDiff?: boolean;
};

type Props = {
  techPackId: string;
  status: string;
  hasPattern: boolean;
  patternExceptionReason: string | null;
  readOnly?: boolean;
  onPatternExceptionChange?: (value: string | null) => void;
  onRelease?: () => void;
};

export default function TechPackReleaseChecklist({
  techPackId,
  status,
  hasPattern,
  patternExceptionReason,
  readOnly,
  onPatternExceptionChange,
  onRelease,
}: Props) {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [readinessRes, diffRes] = await Promise.all([
        fetch(`/api/tech-packs/${techPackId}/release-readiness`),
        fetch(`/api/tech-packs/${techPackId}/diff`),
      ]);
      const data = (await readinessRes.json()) as Readiness;
      const diff = (await diffRes.json()) as { hasPrevious?: boolean; items?: unknown[] };
      if (readinessRes.ok) {
        setReadiness({
          ...data,
          hasDiff: Boolean(diff.hasPrevious && (diff.items?.length ?? 0) > 0),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [techPackId]);

  useEffect(() => {
    void load();
  }, [load, patternExceptionReason, hasPattern]);

  const showChecklist = status === "DRAFT";

  if (!showChecklist) return null;

  const bomChecks = readiness?.bomChecks ?? [];
  const bomErrors = bomChecks.filter((c) => c.severity === "error");
  const bomWarnings = bomChecks.filter((c) => c.severity === "warning");
  const bomInfo = bomChecks.filter((c) => c.severity === "info");
  const duplicateWarnings = bomWarnings.filter((c) =>
    ["DUPLICATE_MATERIAL", "DUPLICATE_TRIM", "DUPLICATE_BOM_TEXT"].includes(c.code),
  );
  const otherWarnings = bomWarnings.filter(
    (c) => !["DUPLICATE_MATERIAL", "DUPLICATE_TRIM", "DUPLICATE_BOM_TEXT"].includes(c.code),
  );

  return (
    <div className="tech-pack-release-checklist">
      <h3 className="tech-pack-sidebar__title">Điều kiện phát hành</h3>
      {loading && <p className="admin-muted">Đang kiểm tra...</p>}
      {readiness && (
        <>
          <ul className="tech-pack-release-checklist__list">
            {readiness.items
              .filter((item) =>
                ["product", "bom", "bomMaster", "artwork", "pattern", "measurements"].includes(item.key),
              )
              .map((item) => (
                <li key={item.key} className={item.passed ? "is-passed" : "is-failed"}>
                  <span className="tech-pack-release-checklist__icon">{item.passed ? "✓" : "✗"}</span>
                  <span>{item.label}</span>
                  {!item.passed && item.required && (
                    <span className="tech-pack-release-checklist__badge">Thiếu</span>
                  )}
                </li>
              ))}
          </ul>

          {readiness.hasDiff && (
            <p className="admin-muted" style={{ marginTop: 8, fontSize: 13 }}>
              Có thay đổi so với bản phát hành trước. Vui lòng kiểm tra trước khi phát hành.
            </p>
          )}

          {bomChecks.length > 0 && (
            <div className="tech-pack-release-checklist__bom" style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: 13, margin: "0 0 6px" }}>Kiểm tra BOM</h4>
              {bomErrors.length > 0 && (
                <ul className="admin-error-list">
                  {bomErrors.map((issue) => (
                    <li key={`${issue.code}-${issue.bomItemId}`}>{issue.message}</li>
                  ))}
                </ul>
              )}
              {otherWarnings.length > 0 && (
                <ul className="admin-warning-list" style={{ color: "#8a6d00", margin: "6px 0 0", paddingLeft: 18 }}>
                  {otherWarnings.map((issue) => (
                    <li key={`${issue.code}-${issue.bomItemId}`}>{issue.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {duplicateWarnings.length > 0 && (
            <div className="tech-pack-release-checklist__bom" style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: 13, margin: "0 0 6px" }}>Kiểm tra trùng BOM</h4>
              <ul className="admin-warning-list" style={{ color: "#8a6d00", margin: 0, paddingLeft: 18 }}>
                {duplicateWarnings.map((issue) => (
                  <li key={`${issue.code}-${issue.bomItemId}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          {bomInfo.length > 0 && (
            <div className="tech-pack-release-checklist__bom" style={{ marginTop: 12 }}>
              <ul className="admin-muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {bomInfo.map((issue) => (
                  <li key={`${issue.code}-${issue.bomItemId}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          {!hasPattern && !readOnly && (
            <label className="admin-field" style={{ marginTop: 12 }}>
              <span>Lý do không chọn rập</span>
              <textarea
                className="admin-textarea"
                rows={3}
                value={patternExceptionReason ?? ""}
                placeholder="Bắt buộc nếu chưa chọn rập"
                onChange={(e) => onPatternExceptionChange?.(e.target.value)}
              />
            </label>
          )}

          {readiness.errors.filter((err) => !bomChecks.some((c) => c.message === err)).length > 0 && (
            <ul className="admin-error-list">
              {readiness.errors
                .filter((err) => !bomChecks.some((c) => c.message === err))
                .map((err) => (
                  <li key={err}>{err}</li>
                ))}
            </ul>
          )}

          {onRelease && (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              style={{ width: "100%", marginTop: 12 }}
              disabled={!readiness.canRelease}
              onClick={onRelease}
            >
              Phát hành
            </button>
          )}
        </>
      )}
    </div>
  );
}
