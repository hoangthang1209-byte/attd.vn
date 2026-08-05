"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import PanelSkeleton from "@/components/ui/loading/PanelSkeleton";

type UsageSnapshot = {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  appliedRuns: number;
  totalTokens: number | null;
  totalCostUsd: number | null;
  avgLatencyMs: number | null;
};

type ContentGenerationSafeStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  keyConfigured: boolean;
  maxTokens: number;
  maxSectionsPerRun: number;
  dailyLimit: number;
  monthlyBudgetUsd: number | null;
  rateTableAvailable: boolean;
  costEstimateSupported: boolean;
  configurationVersion: string;
  rolloutStage: string;
  dailyLimitPerUser: number;
  dailyLimitPerTopic: number;
  todayUsage: UsageSnapshot | null;
  monthUsage: UsageSnapshot | null;
};

type AggregatedStatus = {
  contentGeneration: ContentGenerationSafeStatus;
  writing: { enabled: boolean; configured: boolean };
  brief: { keyConfigured: boolean };
};

type ProviderHealthSnapshot = {
  provider: string;
  model: string;
  enabled: boolean;
  keyConfigured: boolean;
  rolloutStage: string;
  available: boolean;
  recentRunCount: number;
  recentCompletedCount: number;
  recentFailedCount: number;
  avgLatencyMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

type LedgerGroupRow = UsageSnapshot & { userId?: string; topicId?: string };

type UsageLedgerSummary = {
  today: UsageSnapshot;
  month: UsageSnapshot;
  byUserToday: LedgerGroupRow[];
  byTopicToday: LedgerGroupRow[];
  statusCountsToday: Record<string, number>;
  generatedAt: string;
};

type PromptSummary = {
  id: string;
  type: string;
  version: string;
  maxOutputLength: number;
  prohibitedClaimCount: number;
};

const ROLLOUT_STAGE_LABELS: Record<string, string> = {
  OFF: "Tắt (OFF)",
  TEST: "Chỉ TEST (an toàn)",
  OPENAI_INTERNAL: "OpenAI — nội bộ",
  OPENAI_EDITOR: "OpenAI — biên tập viên",
  OPENAI_ALL: "OpenAI — toàn bộ",
};

function rolloutTone(stage: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (stage === "OFF") return "neutral";
  if (stage === "TEST") return "info";
  return "warning";
}

function fmtCost(v: number | null): string {
  if (v == null) return "—";
  return `$${v.toFixed(4)}`;
}

function fmtMs(v: number | null): string {
  if (v == null) return "—";
  if (v < 1000) return `${v}ms`;
  return `${(v / 1000).toFixed(1)}s`;
}

function UsageSnapshotRow({ label, usage }: { label: string; usage: UsageSnapshot | null }) {
  if (!usage) {
    return (
      <tr>
        <td>{label}</td>
        <td colSpan={6} className="admin-field-hint">
          Chưa có dữ liệu.
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td>{label}</td>
      <td>{usage.totalRuns}</td>
      <td>{usage.completedRuns}</td>
      <td>{usage.failedRuns}</td>
      <td>{usage.appliedRuns}</td>
      <td>{usage.totalTokens ?? "—"}</td>
      <td>{fmtCost(usage.totalCostUsd)}</td>
      <td>{fmtMs(usage.avgLatencyMs)}</td>
    </tr>
  );
}

export default function ContentAiAdminClient({ prompts }: { prompts: PromptSummary[] }) {
  const toast = useAdminToast();
  const [status, setStatus] = useState<AggregatedStatus | null>(null);
  const [providerHealth, setProviderHealth] = useState<ProviderHealthSnapshot | null>(null);
  const [usage, setUsage] = useState<UsageLedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statusRes, providerRes, usageRes] = await Promise.all([
        fetch("/api/content/generation/status"),
        fetch("/api/content/generation/providers/status"),
        fetch("/api/content/generation/usage"),
      ]);
      const [statusJson, providerJson, usageJson] = await Promise.all([
        statusRes.json(),
        providerRes.json(),
        usageRes.json(),
      ]);
      if (!statusRes.ok) throw new Error(statusJson.message ?? "Không tải được trạng thái AI.");
      if (!providerRes.ok) throw new Error(providerJson.message ?? "Không tải được sức khỏe provider.");
      if (!usageRes.ok) throw new Error(usageJson.message ?? "Không tải được usage ledger.");
      setStatus(statusJson.status as AggregatedStatus);
      setProviderHealth(providerJson.status as ProviderHealthSnapshot);
      setUsage(usageJson.usage as UsageLedgerSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Load failed";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="admin-panel">
        <PanelSkeleton label="Đang tải trạng thái AI…" lines={3} />
      </div>
    );
  }

  if (loadError || !status) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được trạng thái AI"
        description={loadError ?? "Không có dữ liệu."}
        action={
          <button type="button" className="admin-btn" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }

  const cg = status.contentGeneration;

  return (
    <div className="admin-panel">
      <div style={{ display: "grid", gap: 16 }}>
        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">Cấu hình provider</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <StatusBadge tone={cg.enabled ? "success" : "neutral"}>
              {cg.enabled ? "Đã bật" : "Đang tắt"}
            </StatusBadge>
            <StatusBadge tone={rolloutTone(cg.rolloutStage)}>
              {ROLLOUT_STAGE_LABELS[cg.rolloutStage] ?? cg.rolloutStage}
            </StatusBadge>
            <StatusBadge tone={cg.provider === "openai" ? "warning" : "info"}>
              Provider: {cg.provider.toUpperCase()}
            </StatusBadge>
            <StatusBadge tone={cg.keyConfigured ? "success" : "neutral"}>
              {cg.keyConfigured ? "OpenAI key: đã cấu hình" : "OpenAI key: chưa cấu hình"}
            </StatusBadge>
          </div>
          <p className="admin-field-hint" style={{ margin: 0 }}>
            Model: {cg.model} · Config version: {cg.configurationVersion} · Rate table:{" "}
            {cg.rateTableAvailable ? "có" : "không"}
          </p>
          {cg.rolloutStage === "TEST" && (
            <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
              Giai đoạn TEST — chỉ dùng provider giả lập (không gọi OpenAI, không phát sinh chi phí thật).
            </p>
          )}
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">Hạn mức (Quota)</h3>
          <table className="admin-table">
            <tbody>
              <tr>
                <td>Giới hạn toàn hệ thống / ngày</td>
                <td>{cg.dailyLimit}</td>
              </tr>
              <tr>
                <td>Giới hạn mỗi người dùng / ngày</td>
                <td>{cg.dailyLimitPerUser}</td>
              </tr>
              <tr>
                <td>Giới hạn mỗi chủ đề / ngày</td>
                <td>{cg.dailyLimitPerTopic}</td>
              </tr>
              <tr>
                <td>Ngân sách hàng tháng (USD)</td>
                <td>{cg.monthlyBudgetUsd ?? "Không giới hạn"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">Sức khỏe provider</h3>
          {providerHealth ? (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <StatusBadge tone={providerHealth.available ? "success" : "danger"}>
                  {providerHealth.available ? "Sẵn sàng" : "Chưa sẵn sàng"}
                </StatusBadge>
                <span className="admin-field-hint">
                  {providerHealth.recentRunCount} lượt gần nhất · {providerHealth.recentCompletedCount} thành công ·{" "}
                  {providerHealth.recentFailedCount} thất bại · độ trễ TB {fmtMs(providerHealth.avgLatencyMs)}
                </span>
              </div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Thành công gần nhất:{" "}
                {providerHealth.lastSuccessAt
                  ? new Date(providerHealth.lastSuccessAt).toLocaleString("vi-VN")
                  : "—"}{" "}
                · Thất bại gần nhất:{" "}
                {providerHealth.lastFailureAt
                  ? new Date(providerHealth.lastFailureAt).toLocaleString("vi-VN")
                  : "—"}
              </p>
            </>
          ) : (
            <p className="admin-field-hint">Chưa có dữ liệu sức khỏe provider.</p>
          )}
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">Usage ledger</h3>
          {usage ? (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Khoảng thời gian</th>
                      <th>Tổng lượt</th>
                      <th>Hoàn tất</th>
                      <th>Thất bại</th>
                      <th>Đã áp dụng</th>
                      <th>Tokens</th>
                      <th>Chi phí</th>
                      <th>Độ trễ TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    <UsageSnapshotRow label="Hôm nay" usage={usage.today} />
                    <UsageSnapshotRow label="Tháng này" usage={usage.month} />
                  </tbody>
                </table>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Top người dùng hôm nay</h4>
                  {usage.byUserToday.length === 0 ? (
                    <p className="admin-field-hint">Chưa có dữ liệu.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                      {usage.byUserToday.map((row) => (
                        <li key={row.userId}>
                          {row.userId} — {row.totalRuns} lượt · {fmtCost(row.totalCostUsd)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Top chủ đề hôm nay</h4>
                  {usage.byTopicToday.length === 0 ? (
                    <p className="admin-field-hint">Chưa có dữ liệu.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                      {usage.byTopicToday.map((row) => (
                        <li key={row.topicId}>
                          <Link href={`/admin/content/seo-topics/${row.topicId}`}>{row.topicId}</Link> —{" "}
                          {row.totalRuns} lượt · {fmtCost(row.totalCostUsd)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Trạng thái hôm nay</h4>
                {Object.keys(usage.statusCountsToday).length === 0 ? (
                  <p className="admin-field-hint">Chưa có lượt tạo nào hôm nay.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(usage.statusCountsToday).map(([statusKey, count]) => (
                      <StatusBadge key={statusKey} tone={statusKey === "FAILED" ? "danger" : "neutral"}>
                        {statusKey}: {count}
                      </StatusBadge>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="admin-field-hint">Chưa có dữ liệu usage ledger.</p>
          )}
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">Prompt registry</h3>
          {prompts.length === 0 ? (
            <p className="admin-field-hint">Chưa có prompt template nào.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Version</th>
                  <th>Giới hạn độ dài</th>
                  <th>Claim bị cấm</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.type}</td>
                    <td>{p.version}</td>
                    <td>{p.maxOutputLength}</td>
                    <td>{p.prohibitedClaimCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
