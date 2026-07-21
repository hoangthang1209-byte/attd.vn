"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type BadgeTone = "ready" | "config" | "data" | "blocked" | "progress" | "done" | "neutral";

function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const colors: Record<BadgeTone, string> = {
    ready: "#166534",
    config: "#92400e",
    data: "#1e40af",
    blocked: "#991b1b",
    progress: "#6b21a8",
    done: "#065f46",
    neutral: "#374151",
  };
  return (
    <span
      className="admin-badge"
      style={{
        background: `${colors[tone]}14`,
        color: colors[tone],
        border: `1px solid ${colors[tone]}33`,
      }}
    >
      {children}
    </span>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
    case "done":
      return <Badge tone="done">Đã hoàn thành</Badge>;
    case "ready":
      return <Badge tone="ready">Sẵn sàng</Badge>;
    case "in_progress":
      return <Badge tone="progress">Đang xử lý</Badge>;
    case "blocked":
      return <Badge tone="blocked">Bị chặn</Badge>;
    case "skipped_optional":
      return <Badge tone="config">Cần cấu hình</Badge>;
    case "not_started":
      return <Badge tone="data">Cần dữ liệu</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

type LaunchPayload = {
  status: {
    aiGeneration: {
      enabled: boolean;
      providerConfigured: boolean;
      provider: string | null;
      model: string | null;
      apiKeyConfigured: boolean;
      sectionGenerationReady: boolean;
      maxOutputTokensPerSection: number | null;
      dailyRunLimit: number | null;
      monthlyBudgetUsd: number | null;
      maxSectionsPerRun: number | null;
      errors: string[];
      warnings: string[];
    };
    publishing: {
      immediatePublishReady: boolean;
      schedulingConfigured: boolean;
      cronSecretConfigured: boolean;
      cronRouteRegistered: boolean;
      cronScheduleConfigured: boolean;
      cronSchedule: string | null;
      lastSuccessfulDueRunAt: string | null;
      errors: string[];
      warnings: string[];
    };
    knowledge: {
      publicApprovedFacts: number;
      retrievalReadyFacts: number;
      blockingConflicts: number;
      warnings: string[];
    };
    media: {
      poloBundleId: string | null;
      poloBundleStatus: string | null;
      publicAssetCount: number;
      requiredSlotsFilled: number;
      requiredSlotsTotal: number;
      warnings: string[];
    };
    graph: {
      globalExpansionEnabled: boolean;
      consumerFlagsEnabled: string[];
      rolloutMode: string;
    };
    readyForManualContentLaunch: boolean;
    readyForAiAssistedLaunch: boolean;
    readyForScheduledPublishing: boolean;
  };
  workflow: {
    steps: Array<{
      id: string;
      label: string;
      status: string;
      entityId: string | null;
      openHref: string | null;
      actionLabel: string;
      blocker: string | null;
      nextAction: string | null;
    }>;
    currentStepId: string;
    topicHref: string | null;
  };
  knowledge: {
    publicApprovedFacts: number;
    readyForInformationalArticle: boolean;
    hardBlockers: string[];
    warnings: string[];
    missingDomains: Array<{ key: string; label: string; required: boolean }>;
    coveredDomains: Array<{ key: string; label: string; publicApprovedCount: number }>;
  };
  media: {
    bundleId: string | null;
    bundleCode: string;
    bundleName: string | null;
    bundleStatus: string | null;
    editorHref: string | null;
    publicAssetCount: number;
    requiredSlotsFilled: number;
    requiredSlotsTotal: number;
    slots: Array<{
      label: string;
      slotType: string;
      required: boolean;
      publicAssetCount: number;
      missingAlt: number;
      filled: boolean;
    }>;
    warnings: string[];
  };
  qaPreset: { id: string; label: string; checks: string[]; notes: string[] };
  recentLaunchReviews: Array<{
    id: string;
    status: string;
    topicTitle: string | null;
    qaScore: number | null;
    blockingIssues: number;
    sectionProgress: { total: number; approved: number };
    readyForHandoff: boolean;
  }>;
  manualFallbackMessage: string;
};

type ChecklistPayload = {
  items: Array<{
    id: string;
    group: string;
    label: string;
    done: boolean;
    required: boolean;
    detail: string | null;
    href: string | null;
  }>;
  requiredRemaining: number;
  percentComplete: number;
};

type ArticlePayload = {
  article: {
    topicId: string | null;
    topicTitle: string | null;
    topicStatus: string | null;
    topicHref: string | null;
    briefTemplate: { workingTitle: string; outline: Array<{ level: string; title: string }>; notes: string[] };
    keywordSuggestions: { primary: string; secondary: string[]; questions: string[] };
    factPolicy: { allowed: string[]; notAllowedWithoutEvidence: string[] };
    matchingExistingBlogs: Array<{ id: string; title: string; status: string; slug: string | null }>;
  };
};

export default function ContentLaunchClient() {
  const toast = useAdminToast();
  const [data, setData] = useState<LaunchPayload | null>(null);
  const [checklist, setChecklist] = useState<ChecklistPayload | null>(null);
  const [article, setArticle] = useState<ArticlePayload["article"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupPending, setSetupPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, checklistRes, articleRes] = await Promise.all([
        fetch("/api/content/launch/status"),
        fetch("/api/content/launch/checklist"),
        fetch("/api/content/launch/first-article"),
      ]);
      const statusJson = await statusRes.json();
      const checklistJson = await checklistRes.json();
      const articleJson = await articleRes.json();
      if (!statusRes.ok) throw new Error(statusJson.message ?? "Không tải status");
      if (!checklistRes.ok) throw new Error(checklistJson.message ?? "Không tải checklist");
      if (!articleRes.ok) throw new Error(articleJson.message ?? "Không tải article");
      setData(statusJson as LaunchPayload);
      setChecklist(checklistJson as ChecklistPayload);
      setArticle((articleJson as ArticlePayload).article);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSetup() {
    setSetupPending(true);
    try {
      const res = await fetch("/api/content/launch/setup-first-article", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Setup failed");
      toast.success(json.message ?? "Setup OK");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSetupPending(false);
    }
  }

  if (loading && !data) {
    return (
      <>
        <AdminPageTitle title="Khởi động Content SEO" />
        <div className="admin-panel">Đang tải trạng thái launch…</div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AdminPageTitle title="Khởi động Content SEO" />
        <div className="admin-panel">
          <p className="admin-message admin-message--error">Không tải được dữ liệu launch.</p>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      </>
    );
  }

  const { status, workflow, knowledge, media, qaPreset, recentLaunchReviews, manualFallbackMessage } =
    data;
  const blockers = [
    ...status.aiGeneration.errors.map((e) => `AI: ${e}`),
    ...status.publishing.errors.map((e) => `Publish: ${e}`),
    ...knowledge.hardBlockers.map((e) => `Knowledge: ${e}`),
    ...workflow.steps.filter((s) => s.status === "blocked" && s.blocker).map((s) => `${s.label}: ${s.blocker}`),
  ];

  return (
    <>
      <AdminPageTitle title="Khởi động Content SEO" />
      <div className="admin-page">
        <p className="admin-field-hint">
          Kích hoạt quy trình Content đã hoàn thiện (Topic → Brief → Context → Writing → QA → Review →
          Blog DRAFT → Publish). Không auto-approve. Không auto-publish. Knowledge Graph expansion OFF.
        </p>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">1. Trạng thái hệ thống</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {status.readyForManualContentLaunch ? (
              <Badge tone="ready">Manual launch sẵn sàng</Badge>
            ) : (
              <Badge tone="blocked">Manual bị chặn</Badge>
            )}
            {status.readyForAiAssistedLaunch ? (
              <Badge tone="ready">AI-assisted sẵn sàng</Badge>
            ) : (
              <Badge tone="config">AI cần cấu hình</Badge>
            )}
            {status.readyForScheduledPublishing ? (
              <Badge tone="ready">Scheduling sẵn sàng</Badge>
            ) : (
              <Badge tone="config">Scheduling chưa cấu hình</Badge>
            )}
            {!status.graph.globalExpansionEnabled && status.graph.consumerFlagsEnabled.length === 0 ? (
              <Badge tone="done">KG expansion OFF</Badge>
            ) : (
              <Badge tone="blocked">KG flags ON — không kỳ vọng cho launch này</Badge>
            )}
          </div>
          <p className="admin-field-hint">
            Graph rollout: <code>{status.graph.rolloutMode}</code> · Consumer flags:{" "}
            {status.graph.consumerFlagsEnabled.length
              ? status.graph.consumerFlagsEnabled.join(", ")
              : "SEO_TOPIC_PLANNER/SEO_BRIEF/SEO_CONTENT = false"}
          </p>
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">2. Knowledge readiness</h2>
          <p>
            Public approved: <strong>{knowledge.publicApprovedFacts}</strong> · Retrieval-ready:{" "}
            <strong>{status.knowledge.retrievalReadyFacts}</strong> ·{" "}
            {knowledge.readyForInformationalArticle ? (
              <Badge tone="ready">Informational OK</Badge>
            ) : (
              <Badge tone="blocked">Chưa sẵn sàng</Badge>
            )}
          </p>
          {knowledge.missingDomains.filter((d) => d.required).length > 0 && (
            <p className="admin-field-hint">
              Domain required còn thiếu:{" "}
              {knowledge.missingDomains
                .filter((d) => d.required)
                .map((d) => d.label)
                .join(", ")}
            </p>
          )}
          {knowledge.warnings.slice(0, 5).map((w) => (
            <p key={w} className="admin-message admin-message--warning">
              {w}
            </p>
          ))}
          <Link className="admin-btn admin-btn--secondary admin-btn--xs" href="/admin/knowledge-base">
            Mở Knowledge Base
          </Link>
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">3. Media readiness — {media.bundleCode}</h2>
          <p>
            {media.bundleName ?? "Bundle chưa tạo"} · Status:{" "}
            <code>{media.bundleStatus ?? "—"}</code> · Public assets: {media.publicAssetCount} ·
            Required slots: {media.requiredSlotsFilled}/{media.requiredSlotsTotal}
          </p>
          <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
            {media.slots.map((slot) => (
              <li key={slot.label}>
                {slot.label} ({slot.slotType}) — {slot.publicAssetCount} PUBLIC
                {slot.required ? " · required" : ""}
                {slot.missingAlt ? ` · thiếu alt: ${slot.missingAlt}` : ""}
              </li>
            ))}
          </ul>
          {media.warnings.slice(0, 4).map((w) => (
            <p key={w} className="admin-message admin-message--warning">
              {w}
            </p>
          ))}
          {media.editorHref && (
            <Link className="admin-btn admin-btn--secondary admin-btn--xs" href={media.editorHref}>
              Mở Bundle editor
            </Link>
          )}
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">4. AI generation configuration</h2>
          {!status.aiGeneration.enabled || !status.aiGeneration.providerConfigured ? (
            <p className="admin-message admin-message--warning">{manualFallbackMessage}</p>
          ) : (
            <Badge tone="ready">Section generation sẵn sàng</Badge>
          )}
          <p className="admin-field-hint">
            enabled={String(status.aiGeneration.enabled)} · provider=
            {status.aiGeneration.provider ?? "—"} · model={status.aiGeneration.model ?? "—"} ·
            apiKeyConfigured={String(status.aiGeneration.apiKeyConfigured)} (không hiển thị secret)
          </p>
          <p className="admin-field-hint">
            Cap: {status.aiGeneration.maxOutputTokensPerSection ?? "—"} output tokens/section · max
            sections/run: {status.aiGeneration.maxSectionsPerRun ?? "—"} · daily limit:{" "}
            {status.aiGeneration.dailyRunLimit ?? "—"} · monthly budget:{" "}
            {status.aiGeneration.monthlyBudgetUsd ?? "Chưa xác định"}
          </p>
          <p className="admin-field-hint">
            Khi generate: chỉ chọn 1 section low-risk (Intro / chất liệu). Không pricing/MOQ/lead
            time/cert/customer claims. Xem docs/operations/content-ai-generation.md
          </p>
          {status.aiGeneration.warnings.map((w) => (
            <p key={w} className="admin-message admin-message--warning">
              {w}
            </p>
          ))}
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">5. Publishing and cron</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge tone={status.publishing.immediatePublishReady ? "ready" : "blocked"}>
              Immediate publish
            </Badge>
            <Badge tone={status.publishing.cronRouteRegistered ? "ready" : "blocked"}>
              Route registered
            </Badge>
            <Badge tone={status.publishing.cronScheduleConfigured ? "ready" : "config"}>
              Schedule {status.publishing.cronSchedule}
            </Badge>
            <Badge tone={status.publishing.cronSecretConfigured ? "ready" : "config"}>
              Secret {status.publishing.cronSecretConfigured ? "configured" : "missing"}
            </Badge>
          </div>
          <p className="admin-field-hint">
            Last due-processor success: {status.publishing.lastSuccessfulDueRunAt ?? "Chưa xác minh"}
          </p>
          {status.publishing.warnings.map((w) => (
            <p key={w} className="admin-message admin-message--warning">
              {w}
            </p>
          ))}
          <Link className="admin-btn admin-btn--secondary admin-btn--xs" href="/admin/content/publishing">
            Mở Publishing dashboard
          </Link>
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">6. First-article workflow</h2>
          <p>
            Bài mục tiêu: <strong>Hướng dẫn chọn áo polo đồng phục công ty</strong>
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <AdminLoadingButton
              type="button"
              pending={setupPending}
              variant="primary"
              onClick={() => void runSetup()}
            >
              Setup / tái sử dụng Topic
            </AdminLoadingButton>
            {article?.topicHref && (
              <Link className="admin-btn admin-btn--secondary" href={article.topicHref}>
                Mở Topic
              </Link>
            )}
            <Link className="admin-btn admin-btn--secondary" href="/admin/content/reviews">
              Review queue
            </Link>
          </div>
          {article?.topicId && (
            <p className="admin-field-hint">
              Topic: {article.topicTitle} · status={article.topicStatus}
            </p>
          )}
          {article?.matchingExistingBlogs?.length ? (
            <p className="admin-message admin-message--warning">
              Có Blog liên quan — không tạo duplicate khi handoff:{" "}
              {article.matchingExistingBlogs.map((b) => b.title).join("; ")}
            </p>
          ) : null}

          <div className="admin-table-wrap admin-table-wrap--crm">
            <table className="admin-table admin-table--crm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bước</th>
                  <th>Trạng thái</th>
                  <th>Entity</th>
                  <th>Blocker / next</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {workflow.steps.map((s, idx) => (
                  <tr
                    key={s.id}
                    style={
                      s.id === workflow.currentStepId
                        ? { background: "rgba(37, 99, 235, 0.06)" }
                        : undefined
                    }
                  >
                    <td>{idx + 1}</td>
                    <td>{s.label}</td>
                    <td>{statusBadge(s.status)}</td>
                    <td>
                      <code>{s.entityId ?? "—"}</code>
                    </td>
                    <td>
                      {s.blocker ?? s.nextAction ?? "—"}
                    </td>
                    <td>
                      {s.openHref ? (
                        <Link
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          href={s.openHref}
                        >
                          {s.actionLabel}
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">7. Current blockers</h2>
          {blockers.length === 0 ? (
            <Badge tone="ready">Không có blocker cứng trên dashboard</Badge>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">8. Recent launch activity / reviews</h2>
          {recentLaunchReviews.length === 0 ? (
            <p className="admin-field-hint">Chưa có review session liên quan polo launch.</p>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {recentLaunchReviews.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/content/reviews/${r.id}`}>
                    {r.topicTitle ?? r.id}
                  </Link>{" "}
                  · {r.status} · QA {r.qaScore ?? "—"} · blocking {r.blockingIssues} · sections{" "}
                  {r.sectionProgress.approved}/{r.sectionProgress.total}
                  {r.readyForHandoff ? " · sẵn sàng handoff" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle">Checklist · Keywords · Brief template · QA · Fact policy</h2>
          {checklist && (
            <p className="admin-field-hint">
              Tiến độ checklist: {checklist.percentComplete}% · required còn lại:{" "}
              {checklist.requiredRemaining}
            </p>
          )}
          {checklist && (
            <ul style={{ paddingLeft: 18, marginBottom: 16 }}>
              {checklist.items.map((item) => (
                <li key={item.id}>
                  {item.done ? "✓" : "○"} [{item.group}] {item.label}
                  {item.required ? " *" : ""}
                  {item.detail ? ` — ${item.detail}` : ""}
                  {item.href ? (
                    <>
                      {" "}
                      <Link href={item.href}>mở</Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {article && (
            <>
              <h3 className="admin-subtitle">Keyword suggestions (editorial only)</h3>
              <p>
                Primary: <code>{article.keywordSuggestions.primary}</code>
              </p>
              <p className="admin-field-hint">
                Secondary: {article.keywordSuggestions.secondary.join(" · ")}
              </p>
              <p className="admin-field-hint">
                Questions: {article.keywordSuggestions.questions.join(" · ")}
              </p>

              <h3 className="admin-subtitle">Brief template (gợi ý — phải human approve)</h3>
              <ul style={{ paddingLeft: 18 }}>
                {article.briefTemplate.outline.map((row) => (
                  <li key={row.title}>
                    {row.level}: {row.title}
                  </li>
                ))}
              </ul>
              {article.briefTemplate.notes.map((n) => (
                <p key={n} className="admin-field-hint">
                  {n}
                </p>
              ))}

              <h3 className="admin-subtitle">Fact / claim policy</h3>
              <p className="admin-field-hint">
                Allowed: {article.factPolicy.allowed.join("; ")}
              </p>
              <p className="admin-field-hint">
                Not without evidence: {article.factPolicy.notAllowedWithoutEvidence.join("; ")}
              </p>
            </>
          )}

          <h3 className="admin-subtitle">{qaPreset.label}</h3>
          <p className="admin-field-hint">{qaPreset.notes.join(" ")}</p>
          <p className="admin-field-hint">Checks: {qaPreset.checks.join(" · ")}</p>
        </section>
      </div>
    </>
  );
}
