"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import SeoBriefAiPanel from "@/components/admin/seo-content/SeoBriefAiPanel";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  SEO_CONTENT_TYPE_LABELS,
  SEO_FUNNEL_STAGE_LABELS,
  SEO_INTERNAL_LINK_STATUS_LABELS,
  SEO_KEYWORD_TYPE_LABELS,
  SEO_METRIC_DATA_LABEL,
  SEO_SEARCH_INTENT_LABELS,
  SEO_TARGET_ENTITY_LABELS,
  SEO_TOPIC_PRIORITY_LABELS,
  SEO_TOPIC_STATUS_LABELS,
} from "@/features/content/seo/seo-labels";
import {
  SEO_CONTENT_TYPES,
  SEO_FUNNEL_STAGES,
  SEO_SEARCH_INTENTS,
  SEO_TOPIC_PRIORITIES,
  SEO_TOPIC_STATUSES,
} from "@/features/content/seo/seo-api-utils";
import { intentGuidanceText } from "@/features/content/seo/seo-intent-guidance";
import type {
  SeoContentType,
  SeoFunnelStage,
  SeoInternalLinkStatus,
  SeoKeywordType,
  SeoSearchIntent,
  SeoTargetEntityType,
  SeoTopicPriority,
  SeoTopicStatus,
} from "@prisma/client";

type BriefOutlineItem = {
  level: "H2" | "H3";
  heading: string;
  purpose?: string;
  notes?: string;
  required?: boolean;
  sortOrder: number;
};

type TopicDetail = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  primaryKeyword: string;
  searchIntent: SeoSearchIntent;
  contentType: SeoContentType;
  funnelStage: SeoFunnelStage;
  priority: SeoTopicPriority;
  status: SeoTopicStatus;
  targetAudience: string[];
  businessValue: number;
  relevanceScore: number;
  opportunityScore: number;
  confidenceScore: number;
  targetEntityType: SeoTargetEntityType;
  targetEntityId: string | null;
  targetUrl: string | null;
  existingUrl: string | null;
  notes: string | null;
  dueDate: string | null;
  mediaBundleId: string | null;
  mediaBundleName: string | null;
  mediaPlanScore: number | null;
  mediaPlanStatus: string | null;
  strategyId: string;
  strategyName: string;
  clusterName: string;
  keywords: KeywordRow[];
  brief: BriefData | null;
};

type KeywordRow = {
  id: string;
  keyword: string;
  keywordType: SeoKeywordType;
  source: string | null;
  priority: number;
};

type BriefData = {
  workingTitle: string | null;
  proposedSlug: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  searchIntentNotes: string | null;
  audienceNotes: string | null;
  valueProposition: string | null;
  outline: BriefOutlineItem[];
  ctaType: string | null;
  ctaText: string | null;
  wordCountMin: number | null;
  wordCountMax: number | null;
  editorNotes: string | null;
  approvedAt: string | null;
};

type InternalLinkRow = {
  id: string;
  anchorText: string | null;
  context: string | null;
  relevanceScore: number;
  status: SeoInternalLinkStatus;
  targetTopic?: { id: string; title: string; targetUrl: string | null };
  sourceTopic?: { id: string; title: string; targetUrl: string | null };
};

type ExistingMatch = {
  entityType: SeoTargetEntityType;
  entityId: string;
  title: string;
  url: string;
  adminRoute?: string;
  matchScore: number;
  matchedOn: string[];
};

type OverviewForm = {
  title: string;
  slug: string;
  description: string;
  primaryKeyword: string;
  searchIntent: SeoSearchIntent;
  contentType: SeoContentType;
  funnelStage: SeoFunnelStage;
  priority: SeoTopicPriority;
  status: SeoTopicStatus;
  notes: string;
  dueDate: string;
};

type ScoresForm = {
  businessValue: number;
  relevanceScore: number;
  opportunityScore: number;
  confidenceScore: number;
};

type BriefForm = {
  workingTitle: string;
  proposedSlug: string;
  metaTitle: string;
  metaDescription: string;
  searchIntentNotes: string;
  audienceNotes: string;
  valueProposition: string;
  ctaType: string;
  ctaText: string;
  wordCountMin: string;
  wordCountMax: string;
  editorNotes: string;
  outline: BriefOutlineItem[];
};

const TARGET_ENTITY_TYPES: SeoTargetEntityType[] = [
  "BLOG_POST",
  "LANDING_PAGE",
  "PRODUCT",
  "CATEGORY",
  "MANUFACTURING_ASSET",
  "DEALER_PAGE",
  "EXTERNAL",
  "NONE",
];

function parseBriefOutline(raw: unknown): BriefOutlineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    return {
      level: row.level === "H3" ? "H3" : "H2",
      heading: typeof row.heading === "string" ? row.heading : "",
      purpose: typeof row.purpose === "string" ? row.purpose : undefined,
      notes: typeof row.notes === "string" ? row.notes : undefined,
      required: row.required === true,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
    };
  });
}

function briefToForm(brief: BriefData | null, topic: TopicDetail): BriefForm {
  return {
    workingTitle: brief?.workingTitle ?? topic.title,
    proposedSlug: brief?.proposedSlug ?? topic.slug ?? "",
    metaTitle: brief?.metaTitle ?? "",
    metaDescription: brief?.metaDescription ?? "",
    searchIntentNotes: brief?.searchIntentNotes ?? "",
    audienceNotes: brief?.audienceNotes ?? "",
    valueProposition: brief?.valueProposition ?? "",
    ctaType: brief?.ctaType ?? "",
    ctaText: brief?.ctaText ?? "",
    wordCountMin: brief?.wordCountMin != null ? String(brief.wordCountMin) : "",
    wordCountMax: brief?.wordCountMax != null ? String(brief.wordCountMax) : "",
    editorNotes: brief?.editorNotes ?? "",
    outline: parseBriefOutline(brief?.outline),
  };
}

export default function SeoTopicDetailClient({ topicId }: { topicId: string }) {
  const toast = useAdminToast();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [internalLinks, setInternalLinks] = useState<{ from: InternalLinkRow[]; to: InternalLinkRow[] }>({
    from: [],
    to: [],
  });
  const [loading, setLoading] = useState(true);
  const [overviewForm, setOverviewForm] = useState<OverviewForm | null>(null);
  const [scoresForm, setScoresForm] = useState<ScoresForm | null>(null);
  const [briefForm, setBriefForm] = useState<BriefForm | null>(null);
  const [keywordPaste, setKeywordPaste] = useState("");
  const [matches, setMatches] = useState<ExistingMatch[]>([]);
  const [manualTargetUrl, setManualTargetUrl] = useState("");
  const [manualEntityType, setManualEntityType] = useState<SeoTargetEntityType>("NONE");
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [scoresSaving, setScoresSaving] = useState(false);
  const [keywordSaving, setKeywordSaving] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [mediaChecking, setMediaChecking] = useState(false);
  const [bundleCreating, setBundleCreating] = useState(false);
  const [linkSuggesting, setLinkSuggesting] = useState(false);
  const [briefSaving, setBriefSaving] = useState(false);
  const [briefApproving, setBriefApproving] = useState(false);
  const [draftCreating, setDraftCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}`);
      const data = (await res.json()) as {
        topic?: TopicDetail;
        internalLinks?: { from: InternalLinkRow[]; to: InternalLinkRow[] };
        message?: string;
      };
      if (!res.ok || !data.topic) throw new Error(data.message ?? "Không tìm thấy chủ đề");

      const t = data.topic;
      const briefRaw = t.brief as BriefData | null;
      const brief: BriefData | null = briefRaw
        ? { ...briefRaw, outline: parseBriefOutline(briefRaw.outline) }
        : null;

      const detail: TopicDetail = { ...t, brief };
      setTopic(detail);
      setInternalLinks(data.internalLinks ?? { from: [], to: [] });
      setOverviewForm({
        title: detail.title,
        slug: detail.slug ?? "",
        description: detail.description ?? "",
        primaryKeyword: detail.primaryKeyword,
        searchIntent: detail.searchIntent,
        contentType: detail.contentType,
        funnelStage: detail.funnelStage,
        priority: detail.priority,
        status: detail.status,
        notes: detail.notes ?? "",
        dueDate: detail.dueDate ? detail.dueDate.slice(0, 10) : "",
      });
      setScoresForm({
        businessValue: detail.businessValue,
        relevanceScore: detail.relevanceScore,
        opportunityScore: detail.opportunityScore,
        confidenceScore: detail.confidenceScore,
      });
      setBriefForm(briefToForm(brief, detail));
      setManualTargetUrl(detail.targetUrl ?? "");
      setManualEntityType(detail.targetEntityType);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tìm thấy chủ đề");
      setTopic(null);
    } finally {
      setLoading(false);
    }
  }, [topicId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!overviewForm) return;
    setOverviewSaving(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...overviewForm,
          slug: overviewForm.slug.trim() || null,
          description: overviewForm.description.trim() || null,
          notes: overviewForm.notes.trim() || null,
          dueDate: overviewForm.dueDate || null,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu");
      toast.success("Đã lưu thông tin chủ đề");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu");
    } finally {
      setOverviewSaving(false);
    }
  }

  async function saveScores(e: React.FormEvent) {
    e.preventDefault();
    if (!scoresForm) return;
    setScoresSaving(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoresForm),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu điểm");
      toast.success("Đã lưu điểm kinh doanh");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu điểm");
    } finally {
      setScoresSaving(false);
    }
  }

  async function bulkPasteKeywords() {
    if (!keywordPaste.trim()) return;
    setKeywordSaving(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-paste", text: keywordPaste }),
      });
      const data = (await res.json()) as { added?: number; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể thêm từ khóa");
      toast.success(`Đã thêm ${data.added ?? 0} từ khóa`);
      setKeywordPaste("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể thêm từ khóa");
    } finally {
      setKeywordSaving(false);
    }
  }

  async function matchExisting() {
    setMatchLoading(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/match-existing`, { method: "POST" });
      const data = (await res.json()) as { matches?: ExistingMatch[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tìm nội dung");
      setMatches(data.matches ?? []);
      toast.success(`Tìm thấy ${data.matches?.length ?? 0} kết quả`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tìm nội dung");
    } finally {
      setMatchLoading(false);
    }
  }

  async function linkTarget(match?: ExistingMatch) {
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          match
            ? {
                targetEntityType: match.entityType,
                targetEntityId: match.entityId,
                targetUrl: match.url,
                existingUrl: match.url,
              }
            : {
                targetEntityType: manualEntityType,
                targetUrl: manualTargetUrl.trim() || null,
                existingUrl: manualTargetUrl.trim() || null,
              },
        ),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể liên kết");
      toast.success("Đã liên kết URL đích");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể liên kết");
    }
  }

  async function checkMedia() {
    setMediaChecking(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/check-media`, { method: "POST" });
      const data = (await res.json()) as {
        plan?: { overallScore: number; overallStatus: string };
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể kiểm tra media");
      toast.success(`Điểm media: ${data.plan?.overallScore ?? 0} (${data.plan?.overallStatus ?? ""})`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể kiểm tra media");
    } finally {
      setMediaChecking(false);
    }
  }

  async function createBundle() {
    setBundleCreating(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/create-bundle`, { method: "POST" });
      const data = (await res.json()) as { bundle?: { id: string }; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể tạo bundle");
      toast.success("Đã tạo bộ media");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo bundle");
    } finally {
      setBundleCreating(false);
    }
  }

  async function suggestLinks() {
    setLinkSuggesting(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/suggest-internal-links`, {
        method: "POST",
      });
      const data = (await res.json()) as { suggestions?: unknown[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể gợi ý link");
      toast.success(`Đã gợi ý ${data.suggestions?.length ?? 0} internal link`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể gợi ý link");
    } finally {
      setLinkSuggesting(false);
    }
  }

  async function updateLinkStatus(linkId: string, status: SeoInternalLinkStatus) {
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/internal-links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật link");
      toast.success("Đã cập nhật internal link");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật link");
    }
  }

  async function saveBrief(e: React.FormEvent) {
    e.preventDefault();
    if (!briefForm) return;
    setBriefSaving(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/brief`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingTitle: briefForm.workingTitle.trim() || null,
          proposedSlug: briefForm.proposedSlug.trim() || null,
          metaTitle: briefForm.metaTitle.trim() || null,
          metaDescription: briefForm.metaDescription.trim() || null,
          searchIntentNotes: briefForm.searchIntentNotes.trim() || null,
          audienceNotes: briefForm.audienceNotes.trim() || null,
          valueProposition: briefForm.valueProposition.trim() || null,
          ctaType: briefForm.ctaType.trim() || null,
          ctaText: briefForm.ctaText.trim() || null,
          wordCountMin: briefForm.wordCountMin ? Number(briefForm.wordCountMin) : null,
          wordCountMax: briefForm.wordCountMax ? Number(briefForm.wordCountMax) : null,
          editorNotes: briefForm.editorNotes.trim() || null,
          outline: briefForm.outline.map((row, index) => ({ ...row, sortOrder: index })),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu brief");
      toast.success("Đã lưu brief");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu brief");
    } finally {
      setBriefSaving(false);
    }
  }

  async function approveBrief() {
    setBriefApproving(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/brief/approve`, { method: "POST" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể duyệt brief");
      toast.success("Đã duyệt brief — trạng thái: Sẵn sàng brief");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể duyệt brief");
    } finally {
      setBriefApproving(false);
    }
  }

  async function createBlogDraft() {
    setDraftCreating(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/create-blog-draft`, { method: "POST" });
      const data = (await res.json()) as {
        result?: { supported: boolean; adminRoute?: string; message?: string };
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo bản nháp Blog");
      const route = data.result?.adminRoute;
      if (route) {
        toast.success(data.result?.message ?? "Đã tạo bản nháp Blog");
        window.location.href = route;
      } else {
        toast.error(data.result?.message ?? "Loại nội dung chưa hỗ trợ");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo bản nháp Blog");
    } finally {
      setDraftCreating(false);
    }
  }

  function addOutlineRow(level: "H2" | "H3") {
    if (!briefForm) return;
    setBriefForm({
      ...briefForm,
      outline: [
        ...briefForm.outline,
        { level, heading: "", purpose: "", notes: "", sortOrder: briefForm.outline.length },
      ],
    });
  }

  function updateOutlineRow(index: number, patch: Partial<BriefOutlineItem>) {
    if (!briefForm) return;
    const outline = [...briefForm.outline];
    outline[index] = { ...outline[index], ...patch };
    setBriefForm({ ...briefForm, outline });
  }

  function removeOutlineRow(index: number) {
    if (!briefForm) return;
    setBriefForm({
      ...briefForm,
      outline: briefForm.outline.filter((_, i) => i !== index),
    });
  }

  if (loading) {
    return (
      <>
        <AdminPageTitle title="Chi tiết chủ đề SEO" />
        <TableLoading
          title="Đang tải chủ đề…"
          description="Hệ thống đang tải thông tin chủ đề SEO."
          tone="admin"
        />
      </>
    );
  }

  if (!topic || !overviewForm || !scoresForm || !briefForm) {
    return (
      <>
        <AdminPageTitle title="Chi tiết chủ đề SEO" />
        <div className="admin-empty-state">
          <p>Không tìm thấy chủ đề.</p>
          <Link href="/admin/content/seo-topics" className="admin-btn admin-btn--secondary">
            Quay lại danh sách
          </Link>
        </div>
      </>
    );
  }

  const allLinks = [
    ...internalLinks.from.map((l) => ({ ...l, direction: "outgoing" as const })),
    ...internalLinks.to.map((l) => ({ ...l, direction: "incoming" as const })),
  ];

  return (
    <>
      <AdminPageTitle title={topic.title} />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>
            {topic.strategyName} · {topic.clusterName} · {SEO_TOPIC_STATUS_LABELS[topic.status]}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/admin/content/ai-retrieval?consumer=SEO_BRIEF&purpose=CONTENT_PLANNING&query=${encodeURIComponent(`${topic.title} ${topic.primaryKeyword}`)}&seoTopicId=${encodeURIComponent(topic.id)}`}
              className="admin-btn admin-btn--secondary"
            >
              Xem ngữ cảnh AI
            </Link>
            <Link href="/admin/content/seo-topics" className="admin-btn admin-btn--secondary">
              Danh sách chủ đề
            </Link>
            <Link
              href={`/admin/content/seo-strategies/${topic.strategyId}`}
              className="admin-btn admin-btn--secondary"
            >
              Chiến lược
            </Link>
          </div>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Tổng quan</h3>
          <p className="admin-field-hint">{intentGuidanceText(overviewForm.searchIntent)}</p>
          <form onSubmit={(e) => void saveOverview(e)} className="admin-form">
            <div className="admin-field">
              <label className="admin-label">Tiêu đề</label>
              <input
                className="admin-input"
                value={overviewForm.title}
                onChange={(e) => setOverviewForm({ ...overviewForm, title: e.target.value })}
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Slug</label>
              <input
                className="admin-input"
                value={overviewForm.slug}
                onChange={(e) => setOverviewForm({ ...overviewForm, slug: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Từ khóa chính</label>
              <input
                className="admin-input"
                value={overviewForm.primaryKeyword}
                onChange={(e) => setOverviewForm({ ...overviewForm, primaryKeyword: e.target.value })}
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Search intent</label>
              <select
                className="admin-input"
                value={overviewForm.searchIntent}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    searchIntent: e.target.value as SeoSearchIntent,
                  })
                }
              >
                {SEO_SEARCH_INTENTS.map((intent) => (
                  <option key={intent} value={intent}>
                    {SEO_SEARCH_INTENT_LABELS[intent]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Loại nội dung</label>
              <select
                className="admin-input"
                value={overviewForm.contentType}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    contentType: e.target.value as SeoContentType,
                  })
                }
              >
                {SEO_CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SEO_CONTENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Funnel</label>
              <select
                className="admin-input"
                value={overviewForm.funnelStage}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    funnelStage: e.target.value as SeoFunnelStage,
                  })
                }
              >
                {SEO_FUNNEL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {SEO_FUNNEL_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Ưu tiên</label>
              <select
                className="admin-input"
                value={overviewForm.priority}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    priority: e.target.value as SeoTopicPriority,
                  })
                }
              >
                {SEO_TOPIC_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {SEO_TOPIC_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Trạng thái</label>
              <select
                className="admin-input"
                value={overviewForm.status}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    status: e.target.value as SeoTopicStatus,
                  })
                }
              >
                {SEO_TOPIC_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SEO_TOPIC_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Hạn hoàn thành</label>
              <input
                type="date"
                className="admin-input"
                value={overviewForm.dueDate}
                onChange={(e) => setOverviewForm({ ...overviewForm, dueDate: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mô tả</label>
              <textarea
                className="admin-input"
                rows={2}
                value={overviewForm.description}
                onChange={(e) => setOverviewForm({ ...overviewForm, description: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <textarea
                className="admin-input"
                rows={2}
                value={overviewForm.notes}
                onChange={(e) => setOverviewForm({ ...overviewForm, notes: e.target.value })}
              />
            </div>
            <AdminLoadingButton type="submit" pending={overviewSaving} variant="primary">
              Lưu tổng quan
            </AdminLoadingButton>
          </form>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Điểm kinh doanh</h3>
          <p className="admin-field-hint">{SEO_METRIC_DATA_LABEL.manual}</p>
          <form onSubmit={(e) => void saveScores(e)} className="admin-form">
            {(
              [
                ["businessValue", "Giá trị kinh doanh"],
                ["relevanceScore", "Độ liên quan"],
                ["opportunityScore", "Cơ hội"],
                ["confidenceScore", "Độ tin cậy"],
              ] as const
            ).map(([key, label]) => (
              <div className="admin-field" key={key}>
                <label className="admin-label">
                  {label} ({scoresForm[key]})
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={scoresForm[key]}
                  onChange={(e) =>
                    setScoresForm({ ...scoresForm, [key]: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  className="admin-input"
                  min={0}
                  max={100}
                  value={scoresForm[key]}
                  onChange={(e) =>
                    setScoresForm({ ...scoresForm, [key]: Number(e.target.value) })
                  }
                />
              </div>
            ))}
            <AdminLoadingButton type="submit" pending={scoresSaving} variant="primary">
              Lưu điểm
            </AdminLoadingButton>
          </form>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Từ khóa ({topic.keywords.length})</h3>
          {topic.keywords.length > 0 && (
            <div className="admin-table-wrap" style={{ marginBottom: 12 }}>
              <table className="admin-table admin-table--crm">
                <thead>
                  <tr>
                    <th>Từ khóa</th>
                    <th>Loại</th>
                    <th>Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {topic.keywords.map((kw) => (
                    <tr key={kw.id}>
                      <td>{kw.keyword}</td>
                      <td>{SEO_KEYWORD_TYPE_LABELS[kw.keywordType]}</td>
                      <td>{kw.source ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-field">
            <label className="admin-label">Dán hàng loạt (mỗi dòng một từ khóa)</label>
            <textarea
              className="admin-input"
              rows={4}
              value={keywordPaste}
              onChange={(e) => setKeywordPaste(e.target.value)}
              placeholder="từ khóa 1&#10;từ khóa 2"
            />
          </div>
          <AdminLoadingButton
            type="button"
            pending={keywordSaving}
            variant="primary"
            onClick={() => void bulkPasteKeywords()}
          >
            Thêm từ khóa
          </AdminLoadingButton>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Nội dung hiện có</h3>
          <p className="admin-field-hint">
            URL đích: {topic.targetUrl ?? "Chưa có"} ·{" "}
            {SEO_TARGET_ENTITY_LABELS[topic.targetEntityType]}
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <AdminLoadingButton
              type="button"
              pending={matchLoading}
              variant="secondary"
              onClick={() => void matchExisting()}
            >
              Tìm nội dung khớp
            </AdminLoadingButton>
          </div>
          {matches.length > 0 && (
            <div className="admin-table-wrap" style={{ marginBottom: 12 }}>
              <table className="admin-table admin-table--crm">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Loại</th>
                    <th>Điểm</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={`${m.entityType}-${m.entityId}`}>
                      <td>
                        {m.title}
                        <p className="admin-field-hint" style={{ margin: 0 }}>
                          {m.url}
                        </p>
                      </td>
                      <td>{SEO_TARGET_ENTITY_LABELS[m.entityType]}</td>
                      <td>{m.matchScore}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => void linkTarget(m)}
                        >
                          Liên kết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-field">
            <label className="admin-label">Liên kết URL thủ công</label>
            <select
              className="admin-input"
              value={manualEntityType}
              onChange={(e) => setManualEntityType(e.target.value as SeoTargetEntityType)}
            >
              {TARGET_ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SEO_TARGET_ENTITY_LABELS[type]}
                </option>
              ))}
            </select>
            <input
              className="admin-input"
              value={manualTargetUrl}
              onChange={(e) => setManualTargetUrl(e.target.value)}
              placeholder="/blog/slug-hoac-url"
            />
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => void linkTarget()}
            >
              Lưu liên kết
            </button>
          </div>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Media</h3>
          <p className="admin-field-hint">
            Bundle: {topic.mediaBundleName ?? "Chưa có"} · Điểm kế hoạch:{" "}
            {topic.mediaPlanScore ?? "—"} · Trạng thái: {topic.mediaPlanStatus ?? "—"}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AdminLoadingButton
              type="button"
              pending={mediaChecking}
              variant="secondary"
              onClick={() => void checkMedia()}
            >
              Kiểm tra media
            </AdminLoadingButton>
            <AdminLoadingButton
              type="button"
              pending={bundleCreating}
              variant="secondary"
              onClick={() => void createBundle()}
            >
              Tạo bundle
            </AdminLoadingButton>
            {topic.mediaBundleId && (
              <Link
                href={`/admin/content/media-bundles/${topic.mediaBundleId}`}
                className="admin-btn admin-btn--secondary"
              >
                Mở bundle
              </Link>
            )}
          </div>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Internal links ({allLinks.length})</h3>
          <AdminLoadingButton
            type="button"
            pending={linkSuggesting}
            variant="secondary"
            onClick={() => void suggestLinks()}
          >
            Gợi ý internal link
          </AdminLoadingButton>
          {allLinks.length > 0 && (
            <div className="admin-table-wrap" style={{ marginTop: 12 }}>
              <table className="admin-table admin-table--crm">
                <thead>
                  <tr>
                    <th>Hướng</th>
                    <th>Chủ đề</th>
                    <th>Anchor</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allLinks.map((link) => {
                    const related =
                      link.direction === "outgoing" ? link.targetTopic : link.sourceTopic;
                    return (
                      <tr key={link.id}>
                        <td>{link.direction === "outgoing" ? "Đi ra" : "Đi vào"}</td>
                        <td>
                          {related ? (
                            <Link href={`/admin/content/seo-topics/${related.id}`} className="admin-link">
                              {related.title}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{link.anchorText ?? "—"}</td>
                        <td>{SEO_INTERNAL_LINK_STATUS_LABELS[link.status]}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {link.status === "SUGGESTED" && (
                              <>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--xs admin-btn--secondary"
                                  onClick={() => void updateLinkStatus(link.id, "ACCEPTED")}
                                >
                                  Chấp nhận
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--xs admin-btn--secondary"
                                  onClick={() => void updateLinkStatus(link.id, "REJECTED")}
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                            {link.status === "ACCEPTED" && (
                              <button
                                type="button"
                                className="admin-btn admin-btn--xs admin-btn--secondary"
                                onClick={() => void updateLinkStatus(link.id, "IMPLEMENTED")}
                              >
                                Đã triển khai
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Brief nội dung</h3>
          {topic.brief?.approvedAt && (
            <p className="admin-field-hint">
              Đã duyệt lúc {new Date(topic.brief.approvedAt).toLocaleString("vi-VN")}
            </p>
          )}
          <SeoBriefAiPanel
            topicId={topicId}
            briefApproved={Boolean(topic.brief?.approvedAt)}
            onApplied={() => void load()}
          />
          <form onSubmit={(e) => void saveBrief(e)} className="admin-form">
            <div className="admin-field">
              <label className="admin-label">Tiêu đề làm việc</label>
              <input
                className="admin-input"
                value={briefForm.workingTitle}
                onChange={(e) => setBriefForm({ ...briefForm, workingTitle: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Slug đề xuất</label>
              <input
                className="admin-input"
                value={briefForm.proposedSlug}
                onChange={(e) => setBriefForm({ ...briefForm, proposedSlug: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Meta title</label>
              <input
                className="admin-input"
                value={briefForm.metaTitle}
                onChange={(e) => setBriefForm({ ...briefForm, metaTitle: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Meta description</label>
              <textarea
                className="admin-input"
                rows={2}
                value={briefForm.metaDescription}
                onChange={(e) => setBriefForm({ ...briefForm, metaDescription: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú search intent</label>
              <textarea
                className="admin-input"
                rows={2}
                value={briefForm.searchIntentNotes}
                onChange={(e) => setBriefForm({ ...briefForm, searchIntentNotes: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú đối tượng</label>
              <textarea
                className="admin-input"
                rows={2}
                value={briefForm.audienceNotes}
                onChange={(e) => setBriefForm({ ...briefForm, audienceNotes: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Đề xuất giá trị</label>
              <textarea
                className="admin-input"
                rows={2}
                value={briefForm.valueProposition}
                onChange={(e) => setBriefForm({ ...briefForm, valueProposition: e.target.value })}
              />
            </div>

            <div className="admin-field">
              <label className="admin-label">Outline</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => addOutlineRow("H2")}
                >
                  + H2
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => addOutlineRow("H3")}
                >
                  + H3
                </button>
              </div>
              {briefForm.outline.map((row, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 1fr auto",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span className="admin-badge">{row.level}</span>
                  <input
                    className="admin-input"
                    placeholder="Heading"
                    value={row.heading}
                    onChange={(e) => updateOutlineRow(index, { heading: e.target.value })}
                  />
                  <input
                    className="admin-input"
                    placeholder="Mục đích"
                    value={row.purpose ?? ""}
                    onChange={(e) => updateOutlineRow(index, { purpose: e.target.value })}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => removeOutlineRow(index)}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <AdminLoadingButton type="submit" pending={briefSaving} variant="primary">
                Lưu brief
              </AdminLoadingButton>
              <AdminLoadingButton
                type="button"
                pending={briefApproving}
                variant="secondary"
                onClick={() => void approveBrief()}
              >
                Duyệt brief
              </AdminLoadingButton>
            </div>
          </form>
        </div>

        <div className="admin-sidebar-card">
          <h3 className="admin-sidebar-title">Hành động</h3>
          <AdminLoadingButton
            type="button"
            pending={draftCreating}
            variant="primary"
            onClick={() => void createBlogDraft()}
          >
            Tạo bản nháp Blog
          </AdminLoadingButton>
        </div>
      </div>
    </>
  );
}
