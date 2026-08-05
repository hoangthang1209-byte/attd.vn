"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
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

type RolloutReadinessSummary = {
  stage: string;
  test: { eligible: boolean; reason: string };
  openaiInternal: { eligible: boolean; reason: string; requiresApproval: true };
  requiresHumanApprovalBeyondTest: true;
  autoAdvanceAllowed: false;
};

type SmokeStatus = {
  provider: ProviderHealthSnapshot;
  rolloutStage: string;
  rolloutReadiness: RolloutReadinessSummary;
  quota: { dailyLimit: number; dailyLimitPerUser: number; dailyLimitPerTopic: number; monthlyBudgetUsd: number | null };
  usage: { today: UsageSnapshot; month: UsageSnapshot };
  testTopic: { exists: boolean; id: string | null; title: string | null; status: string | null; hasContext: boolean };
};

type SmokeCheckStatus = "PASS" | "WARNING" | "FAIL";
type SmokeCheckResult = { key: string; label: string; status: SmokeCheckStatus; detail: string };
type FailureLabScenario = "timeout" | "malformed" | "provider_error" | "quota_exceeded" | "invalid_key";
type FailureLabResult = { scenario: FailureLabScenario; status: SmokeCheckStatus; detail: string };

type SmokeRunResult = { checks: SmokeCheckResult[]; simulations: FailureLabResult[] | null; generatedAt: string };

const SCENARIO_LABELS: Record<FailureLabScenario, string> = {
  timeout: "Timeout",
  malformed: "Malformed output",
  provider_error: "Provider error",
  quota_exceeded: "Quota exceeded (mô phỏng)",
  invalid_key: "Invalid key (readiness)",
};

function statusTone(status: SmokeCheckStatus): "success" | "warning" | "danger" {
  if (status === "PASS") return "success";
  if (status === "WARNING") return "warning";
  return "danger";
}

function fmtCost(v: number | null): string {
  if (v == null) return "—";
  return `$${v.toFixed(4)}`;
}

export default function ContentAiSmokeClient() {
  const toast = useAdminToast();
  const [status, setStatus] = useState<SmokeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [runResult, setRunResult] = useState<SmokeRunResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [ensuringTopic, setEnsuringTopic] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/content/generation/smoke");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Không tải được trạng thái smoke.");
      setStatus(json.status as SmokeStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Load failed";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runChecks = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/content/generation/smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "check" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Chạy smoke check thất bại.");
      setRunResult(json as SmokeRunResult);
      toast.success("Đã chạy smoke checks.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chạy smoke check thất bại.");
    } finally {
      setChecking(false);
    }
  }, [toast]);

  const runSimulation = useCallback(async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/content/generation/smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "simulate" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Chạy mô phỏng thất bại.");
      setRunResult(json as SmokeRunResult);
      toast.success("Đã chạy mô phỏng Failure Lab (TEST provider only).");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chạy mô phỏng thất bại.");
    } finally {
      setSimulating(false);
    }
  }, [toast]);

  const ensureTestTopic = useCallback(async () => {
    setEnsuringTopic(true);
    try {
      const res = await fetch("/api/content/generation/smoke/test-topic", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Tạo chủ đề kiểm thử thất bại.");
      toast.success(json.message ?? "OK");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tạo chủ đề kiểm thử thất bại.");
    } finally {
      setEnsuringTopic(false);
    }
  }, [toast, loadStatus]);

  if (loading) {
    return (
      <div className="admin-panel">
        <PanelSkeleton label="Đang tải AI Smoke Workspace…" lines={4} />
      </div>
    );
  }

  if (loadError || !status) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được AI Smoke Workspace"
        description={loadError ?? "Không có dữ liệu."}
        action={
          <button type="button" className="admin-btn" onClick={() => void loadStatus()}>
            Thử lại
          </button>
        }
      />
    );
  }

  return (
    <div className="admin-panel">
      <div style={{ display: "grid", gap: 16 }}>
        <p className="admin-field-hint" style={{ margin: 0 }}>
          <Link href="/admin/content/ai">← AI vận hành</Link>
        </p>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">Trạng thái hiện tại</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <StatusBadge tone={status.provider.available ? "success" : "danger"}>
              {status.provider.available ? "Provider sẵn sàng" : "Provider chưa sẵn sàng"}
            </StatusBadge>
            <StatusBadge tone="info">Rollout: {status.rolloutStage}</StatusBadge>
            <StatusBadge tone={status.testTopic.exists ? "success" : "neutral"}>
              {status.testTopic.exists ? "Đã có AI Test Topic" : "Chưa có AI Test Topic"}
            </StatusBadge>
          </div>
          <p className="admin-field-hint" style={{ margin: 0 }}>
            Hạn mức: {status.quota.dailyLimit}/ngày (toàn hệ thống) · {status.quota.dailyLimitPerUser}/ngày (mỗi
            người) · {status.quota.dailyLimitPerTopic}/ngày (mỗi chủ đề)
          </p>
          <p className="admin-field-hint" style={{ margin: "4px 0 0" }}>
            Usage hôm nay: {status.usage.today.totalRuns} lượt · {fmtCost(status.usage.today.totalCostUsd)} · Usage
            tháng này: {status.usage.month.totalRuns} lượt · {fmtCost(status.usage.month.totalCostUsd)}
          </p>
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">AI Test Topic</h3>
          {status.testTopic.exists ? (
            <p style={{ margin: 0, fontSize: 13 }}>
              <strong>{status.testTopic.title}</strong> — {status.testTopic.status} ·{" "}
              {status.testTopic.hasContext ? "có Context Build" : "chưa có Context Build"}
              {status.testTopic.id && (
                <>
                  {" "}
                  · <Link href={`/admin/content/seo-topics/${status.testTopic.id}`}>Mở workspace</Link>
                </>
              )}
            </p>
          ) : (
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Chưa có chủ đề kiểm thử AI — cần tạo trước khi mô phỏng Failure Lab.
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            <AdminLoadingButton pending={ensuringTopic} size="small" variant="secondary" onClick={() => void ensureTestTopic()}>
              {status.testTopic.exists ? "Kiểm tra lại chủ đề kiểm thử" : "Tạo chủ đề kiểm thử AI"}
            </AdminLoadingButton>
          </div>
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">OPENAI Internal Pilot Readiness</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13, display: "grid", gap: 4 }}>
            <li>TEST: {status.rolloutReadiness.test.eligible ? "✅" : "❌"} {status.rolloutReadiness.test.reason}</li>
            <li>
              OPENAI_INTERNAL: {status.rolloutReadiness.openaiInternal.eligible ? "✅" : "❌"}{" "}
              {status.rolloutReadiness.openaiInternal.reason}
            </li>
          </ul>
          <p className="admin-field-hint" style={{ margin: "8px 0 0", color: "#b45309" }}>
            ⚠️ Cần phê duyệt thủ công rõ ràng để vượt qua TEST — hệ thống không tự động nâng cấp lên
            OPENAI_EDITOR/OPENAI_ALL.
          </p>
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h3 className="admin-sidebar-title">Chạy kiểm tra</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <AdminLoadingButton pending={checking} size="small" onClick={() => void runChecks()}>
              Chạy Smoke Checks
            </AdminLoadingButton>
            <AdminLoadingButton pending={simulating} size="small" variant="secondary" onClick={() => void runSimulation()}>
              Chạy Failure Lab (TEST only)
            </AdminLoadingButton>
          </div>

          {runResult && (
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Kết quả kiểm tra</h4>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                  {runResult.checks.map((check) => (
                    <li key={check.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                      <StatusBadge tone={statusTone(check.status)}>{check.status}</StatusBadge>
                      <span>
                        <strong>{check.label}</strong>
                        <span className="admin-field-hint"> — {check.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {runResult.simulations && (
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Kết quả Failure Lab</h4>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                    {runResult.simulations.map((sim) => (
                      <li key={sim.scenario} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                        <StatusBadge tone={statusTone(sim.status)}>{sim.status}</StatusBadge>
                        <span>
                          <strong>{SCENARIO_LABELS[sim.scenario]}</strong>
                          <span className="admin-field-hint"> — {sim.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
