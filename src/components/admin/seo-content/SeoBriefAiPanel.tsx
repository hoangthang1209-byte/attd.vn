"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  SEO_BRIEF_APPLY_FIELD_KEYS,
  type SeoBriefApplyFieldKey,
  type SeoBriefSuggestion,
} from "@/features/content/services/seo-brief-suggestion.types";

type AiSafeStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  configured: boolean;
};

type RunMeta = {
  id: string;
  status: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  createdAt: string | Date;
  completedAt: string | Date | null;
  errorMessage: string | null;
  hasOutput?: boolean;
};

type GenerateResponse = {
  reused?: boolean;
  run?: RunMeta & { output?: unknown };
  suggestion?: SeoBriefSuggestion;
  readinessScore?: number;
  warnings?: string[];
  conflicts?: Array<{ key: string; warning: string; resolution: string }>;
  missingFacts?: string[];
  message?: string;
  code?: string;
};

const FIELD_LABELS: Record<SeoBriefApplyFieldKey, string> = {
  workingTitle: "Tiêu đề làm việc",
  proposedSlug: "Slug đề xuất",
  metaTitle: "Meta title",
  metaDescription: "Meta description",
  searchIntentNotes: "Search intent",
  audienceNotes: "Đối tượng",
  valueProposition: "Value proposition",
  outline: "Outline",
  questions: "Câu hỏi / FAQ",
  entities: "Entities",
  requiredSections: "Required sections",
  ctaType: "CTA type",
  ctaText: "CTA text",
  wordCountMin: "Word count min",
  wordCountMax: "Word count max",
  schemaTypes: "Schema types",
  mediaRequirements: "Media requirements",
  editorNotes: "Editor notes",
};

const DEFAULT_FIELDS: SeoBriefApplyFieldKey[] = [
  "workingTitle",
  "proposedSlug",
  "metaTitle",
  "metaDescription",
  "searchIntentNotes",
  "audienceNotes",
  "valueProposition",
  "outline",
  "questions",
  "ctaText",
  "schemaTypes",
];

type Props = {
  topicId: string;
  briefApproved: boolean;
  onApplied?: () => void;
};

export default function SeoBriefAiPanel({ topicId, briefApproved, onApplied }: Props) {
  const toast = useAdminToast();
  const [status, setStatus] = useState<AiSafeStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [history, setHistory] = useState<RunMeta[]>([]);
  const [suggestion, setSuggestion] = useState<SeoBriefSuggestion | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<GenerateResponse["conflicts"]>([]);
  const [missingFacts, setMissingFacts] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<SeoBriefApplyFieldKey>>(
    () => new Set(DEFAULT_FIELDS),
  );
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [tokens, setTokens] = useState<{
    input: number | null;
    output: number | null;
    total: number | null;
    cost: number | null;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/content/seo/brief-ai-status");
    const data = await res.json();
    if (res.ok) setStatus(data.status as AiSafeStatus);
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/content/seo/topics/${topicId}/brief-generations`);
    const data = await res.json();
    if (res.ok) setHistory((data.runs as RunMeta[]) ?? []);
  }, [topicId]);

  useEffect(() => {
    void loadStatus();
    void loadHistory();
  }, [loadStatus, loadHistory]);

  const selectedCount = selectedFields.size;

  const canGenerate = useMemo(
    () => Boolean(status?.enabled && status?.configured),
    [status],
  );

  function toggleField(field: SeoBriefApplyFieldKey) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function generate(regenerate: boolean) {
    setGenerating(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/generate-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo suggestion");

      setSuggestion(data.suggestion ?? null);
      setRunId(data.run?.id ?? null);
      setReadinessScore(data.readinessScore ?? null);
      setWarnings(data.warnings ?? []);
      setConflicts(data.conflicts ?? []);
      setMissingFacts(data.missingFacts ?? []);
      setTokens({
        input: data.run?.inputTokens ?? null,
        output: data.run?.outputTokens ?? null,
        total: data.run?.totalTokens ?? null,
        cost: data.run?.estimatedCostUsd ?? null,
      });
      toast.success(
        data.reused
          ? "Đã tái sử dụng suggestion (cùng inputHash)"
          : "Đã tạo suggestion — chưa lưu vào brief",
      );
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo suggestion");
    } finally {
      setGenerating(false);
    }
  }

  async function applySuggestion() {
    if (!runId) {
      toast.error("Chưa có run suggestion để áp dụng");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Chọn ít nhất một field");
      return;
    }
    if (briefApproved && !confirmOverwrite) {
      toast.error("Brief đã duyệt — tick xác nhận ghi đè trước khi Apply");
      return;
    }

    setApplying(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/apply-brief-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          fields: [...selectedFields],
          confirmApprovedOverwrite: confirmOverwrite,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Không thể áp dụng");
      toast.success(
        data.approvalCleared
          ? "Đã áp dụng — brief bị hủy duyệt, cần duyệt lại"
          : "Đã áp dụng field đã chọn — brief vẫn chưa tự duyệt",
      );
      setConfirmOverwrite(false);
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể áp dụng");
    } finally {
      setApplying(false);
    }
  }

  async function openHistoryRun(id: string) {
    const res = await fetch(`/api/content/seo/brief-generations/${id}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.message ?? "Không tải được run");
      return;
    }
    const output = data.run?.output as
      | { suggestion?: SeoBriefSuggestion; readinessScore?: number; missingFacts?: string[] }
      | null;
    const s = output?.suggestion ?? null;
    setRunId(data.run.id);
    setSuggestion(s);
    setReadinessScore(output?.readinessScore ?? null);
    setMissingFacts(output?.missingFacts ?? s?.missingFacts ?? []);
    setWarnings(Array.isArray(data.run?.warnings) ? data.run.warnings.map(String) : []);
    setTokens({
      input: data.run.inputTokens,
      output: data.run.outputTokens,
      total: data.run.totalTokens,
      cost: data.run.estimatedCostUsd,
    });
  }

  return (
    <div
      className="admin-sidebar-card"
      style={{ marginBottom: 16, borderTop: "1px solid var(--admin-border, #ddd)", paddingTop: 12 }}
    >
      <h3 className="admin-sidebar-title">AI SEO Brief (gợi ý)</h3>
      <p className="admin-field-hint">
        Suggestion-only: kết quả AI <strong>không lưu vào brief</strong> cho đến khi bạn Apply
        các field đã chọn. Không tự duyệt / tạo Blog / publish.
      </p>

      {status && (
        <p className="admin-field-hint" style={{ marginBottom: 8 }}>
          Trạng thái: {status.enabled ? "bật" : "tắt"} · provider={status.provider} · model=
          {status.model} · configured={status.configured ? "yes" : "no"}
        </p>
      )}

      {!canGenerate && (
        <p className="admin-field-hint" style={{ color: "var(--admin-danger, #b42318)" }}>
          AI chưa sẵn sàng. Cần AI_SEO_BRIEF_ENABLED và cấu hình provider (OPENAI_API_KEY nếu
          dùng openai).
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <AdminLoadingButton
          type="button"
          pending={generating}
          variant="primary"
          disabled={!canGenerate}
          onClick={() => void generate(false)}
        >
          Tạo suggestion
        </AdminLoadingButton>
        <AdminLoadingButton
          type="button"
          pending={generating}
          variant="secondary"
          disabled={!canGenerate}
          onClick={() => void generate(true)}
        >
          Regenerate
        </AdminLoadingButton>
      </div>

      {generating && <p className="admin-field-hint">Đang gọi Retrieval + AI…</p>}

      {readinessScore != null && (
        <p className="admin-field-hint">Readiness score: {readinessScore}/100</p>
      )}

      {tokens && (
        <p className="admin-field-hint">
          Tokens: in={tokens.input ?? "—"} / out={tokens.output ?? "—"} / total=
          {tokens.total ?? "—"}
          {tokens.cost != null ? ` · ước tính $${tokens.cost}` : ""}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="admin-field" style={{ marginBottom: 8 }}>
          <label className="admin-label">Warnings</label>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {warnings.slice(0, 12).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {(conflicts?.length ?? 0) > 0 && (
        <div className="admin-field" style={{ marginBottom: 8 }}>
          <label className="admin-label">Conflicts</label>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {conflicts!.map((c) => (
              <li key={c.key}>
                [{c.resolution}] {c.warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingFacts.length > 0 && (
        <div className="admin-field" style={{ marginBottom: 8 }}>
          <label className="admin-label">Missing facts</label>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {missingFacts.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestion && (
        <>
          <div className="admin-field" style={{ marginBottom: 8 }}>
            <label className="admin-label">Xem nhanh suggestion</label>
            <pre
              style={{
                maxHeight: 180,
                overflow: "auto",
                fontSize: 12,
                background: "var(--admin-muted-bg, #f6f6f6)",
                padding: 8,
                borderRadius: 4,
              }}
            >
              {JSON.stringify(
                {
                  workingTitle: suggestion.workingTitle,
                  metaTitle: suggestion.metaTitle,
                  outline: suggestion.outline?.slice(0, 6),
                  requiredFactIds: suggestion.requiredFactIds,
                },
                null,
                2,
              )}
            </pre>
          </div>

          <div className="admin-field" style={{ marginBottom: 8 }}>
            <label className="admin-label">Chọn field để Apply</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                fontSize: 13,
              }}
            >
              {SEO_BRIEF_APPLY_FIELD_KEYS.map((field) => (
                <label key={field} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field)}
                    onChange={() => toggleField(field)}
                  />
                  {FIELD_LABELS[field]}
                </label>
              ))}
            </div>
          </div>

          {briefApproved && (
            <label
              className="admin-field-hint"
              style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}
            >
              <input
                type="checkbox"
                checked={confirmOverwrite}
                onChange={(e) => setConfirmOverwrite(e.target.checked)}
              />
              Brief đã duyệt — xác nhận ghi đè và hủy duyệt (cần duyệt lại)
            </label>
          )}

          <AdminLoadingButton
            type="button"
            pending={applying}
            variant="primary"
            onClick={() => void applySuggestion()}
          >
            Apply đã chọn ({selectedCount})
          </AdminLoadingButton>
          <p className="admin-field-hint" style={{ marginTop: 8 }}>
            Internal links trong suggestion không được apply tự động. Sau Apply, brief vẫn{" "}
            <strong>chưa được duyệt</strong>.
          </p>
        </>
      )}

      {history.length > 0 && (
        <div className="admin-field" style={{ marginTop: 12 }}>
          <label className="admin-label">Lịch sử generation</label>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {history.slice(0, 8).map((run) => (
              <li key={run.id} style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => void openHistoryRun(run.id)}
                  disabled={run.status !== "COMPLETED"}
                >
                  {run.status}
                </button>{" "}
                {new Date(run.createdAt).toLocaleString("vi-VN")} · {run.model}
                {run.totalTokens != null ? ` · ${run.totalTokens} tok` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
