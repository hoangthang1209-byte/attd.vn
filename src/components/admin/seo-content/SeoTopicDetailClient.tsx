"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import SeoBriefAiPanel from "@/components/admin/seo-content/SeoBriefAiPanel";
import ContentContextPanel from "@/components/admin/content/ContentContextPanel";
import WritingEnginePanel from "@/components/admin/content/WritingEnginePanel";
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
import {
  CONTENT_STATUS_COLORS,
  DOCUMENT_WORKFLOW_STEPS,
  buildEditorialChecklist,
  deriveTopicDocumentNodes,
  getTopicNextAction,
  getTopicProgressPercent,
  topicStatusTone,
  topicWorkspaceHref,
} from "@/features/content/editorial/editorial-ux";
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
  assignedTo: string | null;
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
        <AdminPageTitle title="Editorial Workspace" />
        <TableLoading
          title="Đang tải workspace…"
          description="Hệ thống đang tải tài liệu biên tập."
          tone="admin"
        />
      </>
    );
  }

  if (!topic || !overviewForm || !scoresForm || !briefForm) {
    return (
      <>
        <AdminPageTitle title="Editorial Workspace" />
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

  const statusTone = CONTENT_STATUS_COLORS[topicStatusTone(topic.status)];
  const progressPercent = getTopicProgressPercent(topic.status);
  const nextAction = getTopicNextAction(topic.status);
  const nextHref = nextAction.href(topic.id);
  const ctaLabel =
    topic.status === "DRAFTING" ? "Continue Writing" : nextAction.label;
  const ctaStaysOnPage =
    nextHref === topicWorkspaceHref(topic.id) ||
    nextHref.includes(`/seo-topics/${topic.id}`);
  const documentNodes = deriveTopicDocumentNodes(topic.status);
  const checklist = buildEditorialChecklist({
    status: topic.status,
    briefApproved: Boolean(topic.brief?.approvedAt),
    outlineCount: topic.brief?.outline?.length ?? briefForm.outline.length,
    hasMetaTitle: Boolean(topic.brief?.metaTitle ?? briefForm.metaTitle),
    hasMetaDescription: Boolean(topic.brief?.metaDescription ?? briefForm.metaDescription),
    internalLinkCount: allLinks.length,
    hasMediaBundle: Boolean(topic.mediaBundleId),
    mediaPlanOk: Boolean(topic.mediaPlanStatus && topic.mediaPlanStatus !== "MISSING"),
    hasTargetUrl: Boolean(topic.targetUrl),
  });
  const checklistGroups = [
    { key: "content" as const, label: "Content" },
    { key: "seo" as const, label: "SEO" },
    { key: "media" as const, label: "Media" },
    { key: "publish" as const, label: "Publish" },
  ];
  const wordMin = topic.brief?.wordCountMin ?? (briefForm.wordCountMin ? Number(briefForm.wordCountMin) : null);
  const wordMax = topic.brief?.wordCountMax ?? (briefForm.wordCountMax ? Number(briefForm.wordCountMax) : null);
  const readingMinutes = wordMax != null && wordMax > 0 ? Math.max(1, Math.round(wordMax / 200)) : null;
  const heroStatus = topic.mediaBundleId
    ? topic.mediaPlanStatus
      ? `Cover sẵn sàng · ${topic.mediaPlanStatus}`
      : "Cover đã gắn bundle"
    : "Chưa có Cover";
  const activityItems = [
    topic.brief?.approvedAt
      ? {
          at: topic.brief.approvedAt,
          text: `Brief đã duyệt · ${new Date(topic.brief.approvedAt).toLocaleString("vi-VN")}`,
        }
      : null,
    topic.dueDate
      ? {
          at: topic.dueDate,
          text: `Hạn xuất bản · ${new Date(topic.dueDate).toLocaleDateString("vi-VN")}`,
        }
      : null,
    topic.notes
      ? {
          at: topic.dueDate ?? "1970-01-01",
          text: `Ghi chú biên tập · ${topic.notes}`,
        }
      : null,
    {
      at: "1970-01-01",
      text: `Trạng thái · ${SEO_TOPIC_STATUS_LABELS[topic.status]}`,
    },
  ]
    .filter((item): item is { at: string; text: string } => item != null)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <AdminPageTitle title={topic.title} />
      <div className="admin-panel">
        {/* Header */}
        <div className="admin-section-header" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="admin-field-hint" style={{ margin: "0 0 6px" }}>
              Từ khóa: <strong>{topic.primaryKeyword}</strong>
            </p>
            <p className="admin-field-hint" style={{ margin: "0 0 8px" }}>
              Publish target:{" "}
              <strong>
                {topic.dueDate ? new Date(topic.dueDate).toLocaleDateString("vi-VN") : "Chưa đặt"}
              </strong>
              {" · "}
              Campaign:{" "}
              <Link href={`/admin/content/seo-strategies/${topic.strategyId}`} className="admin-link">
                {topic.strategyName}
              </Link>
              {" · "}
              <Link href="/admin/content/calendar" className="admin-link">
                Calendar
              </Link>
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: statusTone.bg,
                  color: statusTone.fg,
                  border: `1px solid ${statusTone.border}`,
                }}
              >
                {SEO_TOPIC_STATUS_LABELS[topic.status]}
              </span>
              <div style={{ flex: 1, minWidth: 120, maxWidth: 220 }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "#e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      background: statusTone.fg,
                      borderRadius: 999,
                    }}
                  />
                </div>
                <p className="admin-field-hint" style={{ margin: "4px 0 0", fontSize: 11 }}>
                  Tiến độ {progressPercent}%
                </p>
              </div>
            </div>
          </div>
          {ctaStaysOnPage ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => scrollToSection("writing")}
            >
              {ctaLabel}
            </button>
          ) : (
            <Link href={nextHref} className="admin-btn admin-btn--primary">
              {ctaLabel}
            </Link>
          )}
        </div>

        {/* Overview */}
        <section id="overview" className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Overview</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Owner
              </p>
              <p style={{ margin: 0 }}>{topic.assignedTo ?? "—"}</p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Priority
              </p>
              <p style={{ margin: 0 }}>{SEO_TOPIC_PRIORITY_LABELS[topic.priority]}</p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Deadline
              </p>
              <p style={{ margin: 0 }}>
                {topic.dueDate ? new Date(topic.dueDate).toLocaleDateString("vi-VN") : "—"}
              </p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Cluster
              </p>
              <p style={{ margin: 0 }}>{topic.clusterName || "—"}</p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Campaign
              </p>
              <p style={{ margin: 0 }}>{topic.strategyName || "—"}</p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Estimated publish
              </p>
              <p style={{ margin: 0 }}>
                {topic.dueDate ? new Date(topic.dueDate).toLocaleDateString("vi-VN") : "—"}
              </p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Word target
              </p>
              <p style={{ margin: 0 }}>
                {wordMin != null || wordMax != null
                  ? `${wordMin ?? "—"}–${wordMax ?? "—"}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Reading time
              </p>
              <p style={{ margin: 0 }}>{readingMinutes != null ? `~${readingMinutes} phút` : "—"}</p>
            </div>
            <div>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                Hero image
              </p>
              <p style={{ margin: 0 }}>{heroStatus}</p>
            </div>
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Chỉnh sửa tổng quan</summary>
            <p className="admin-field-hint">{intentGuidanceText(overviewForm.searchIntent)}</p>
            <form onSubmit={(e) => void saveOverview(e)} className="admin-form" style={{ marginTop: 12 }}>
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
          </details>
        </section>

        {/* Editorial Progress */}
        <section className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Editorial Progress</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DOCUMENT_WORKFLOW_STEPS.map((step) => {
              const state = documentNodes[step.key];
              const tone =
                state === "completed"
                  ? CONTENT_STATUS_COLORS.published
                  : state === "active"
                    ? CONTENT_STATUS_COLORS.draft
                    : CONTENT_STATUS_COLORS.waiting;
              return (
                <button
                  key={step.key}
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  style={{
                    background: tone.bg,
                    color: tone.fg,
                    borderColor: tone.border,
                  }}
                  onClick={() => scrollToSection(step.sectionId)}
                >
                  {step.label}
                  {state === "completed" ? " ✓" : state === "active" ? " ●" : ""}
                </button>
              );
            })}
          </div>
        </section>

        {/* Writing Workspace */}
        <section id="writing" className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Writing Workspace</h3>
          <div id="brief" style={{ marginBottom: 12 }}>
            <p className="admin-field-hint" style={{ margin: "0 0 6px" }}>
              Outline
            </p>
            {(topic.brief?.outline?.length ?? briefForm.outline.length) > 0 ? (
              <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
                {(topic.brief?.outline ?? briefForm.outline).map((row, index) => (
                  <li key={index}>
                    <strong>{row.level}</strong> {row.heading || "(chưa đặt tiêu đề)"}
                    {row.purpose ? ` — ${row.purpose}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-field-hint">Chưa có outline. Chỉnh brief để thêm khung bài.</p>
            )}
            <p className="admin-field-hint" style={{ margin: "0 0 4px" }}>
              Ghi chú biên tập
            </p>
            <p style={{ margin: "0 0 12px" }}>
              {topic.brief?.editorNotes || briefForm.editorNotes || "—"}
            </p>
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Mục tiêu từ:{" "}
              {wordMin != null || wordMax != null
                ? `${wordMin ?? "—"}–${wordMax ?? "—"} từ`
                : "Chưa đặt"}
              {readingMinutes != null ? ` · ~${readingMinutes} phút đọc` : ""}
            </p>
          </div>

          <WritingEnginePanel topicId={topicId} />

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Gợi ý brief</summary>
            <div style={{ marginTop: 8 }}>
              <SeoBriefAiPanel
                topicId={topicId}
                briefApproved={Boolean(topic.brief?.approvedAt)}
                onApplied={() => void load()}
              />
            </div>
          </details>

          <details id="brief-edit" style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Chỉnh Brief</summary>
            {topic.brief?.approvedAt && (
              <p className="admin-field-hint">
                Đã duyệt lúc {new Date(topic.brief.approvedAt).toLocaleString("vi-VN")}
              </p>
            )}
            <form onSubmit={(e) => void saveBrief(e)} className="admin-form" style={{ marginTop: 12 }}>
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
                <label className="admin-label">CTA</label>
                <input
                  className="admin-input"
                  placeholder="Loại CTA"
                  value={briefForm.ctaType}
                  onChange={(e) => setBriefForm({ ...briefForm, ctaType: e.target.value })}
                  style={{ marginBottom: 8 }}
                />
                <input
                  className="admin-input"
                  placeholder="Nội dung CTA"
                  value={briefForm.ctaText}
                  onChange={(e) => setBriefForm({ ...briefForm, ctaText: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Mục tiêu từ</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="admin-input"
                    type="number"
                    placeholder="Min"
                    value={briefForm.wordCountMin}
                    onChange={(e) => setBriefForm({ ...briefForm, wordCountMin: e.target.value })}
                  />
                  <input
                    className="admin-input"
                    type="number"
                    placeholder="Max"
                    value={briefForm.wordCountMax}
                    onChange={(e) => setBriefForm({ ...briefForm, wordCountMax: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-field">
                <label className="admin-label">Ghi chú biên tập</label>
                <textarea
                  className="admin-input"
                  rows={2}
                  value={briefForm.editorNotes}
                  onChange={(e) => setBriefForm({ ...briefForm, editorNotes: e.target.value })}
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
          </details>

          <div style={{ marginTop: 12 }}>
            <AdminLoadingButton
              type="button"
              pending={draftCreating}
              variant="secondary"
              onClick={() => void createBlogDraft()}
            >
              Tạo bản nháp Blog
            </AdminLoadingButton>
          </div>
        </section>

        {/* Checklist */}
        <section id="checklist" className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Checklist</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {checklistGroups.map((group) => (
              <div key={group.key}>
                <p className="admin-field-hint" style={{ margin: "0 0 6px", fontWeight: 600 }}>
                  {group.label}
                </p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {checklist
                    .filter((item) => item.group === group.key)
                    .map((item) => (
                      <li key={item.id} style={{ marginBottom: 4 }}>
                        {item.done ? "☑" : "☐"} {item.label}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Knowledge Sidebar */}
        <details className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Knowledge (tham khảo)</summary>
          <div style={{ marginTop: 12 }}>
            <ContentContextPanel topicId={topicId} />
          </div>
        </details>

        {/* Media Sidebar */}
        <details className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Media</summary>
          <div style={{ marginTop: 12 }}>
            <p className="admin-field-hint">
              Cover: {topic.mediaBundleName ?? "Chưa có"} · Gallery:{" "}
              {topic.mediaPlanScore != null ? `điểm ${topic.mediaPlanScore}` : "—"} ·{" "}
              {topic.mediaPlanStatus ?? "Chưa kiểm tra"}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <AdminLoadingButton
                type="button"
                pending={mediaChecking}
                variant="secondary"
                onClick={() => void checkMedia()}
              >
                Kiểm tra Cover / Gallery
              </AdminLoadingButton>
              <AdminLoadingButton
                type="button"
                pending={bundleCreating}
                variant="secondary"
                onClick={() => void createBundle()}
              >
                Tạo bộ hình
              </AdminLoadingButton>
              {topic.mediaBundleId && (
                <Link
                  href={`/admin/content/media-bundles/${topic.mediaBundleId}`}
                  className="admin-btn admin-btn--secondary"
                >
                  Mở bộ hình
                </Link>
              )}
            </div>
          </div>
        </details>

        {/* Activity */}
        <section className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Activity</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {activityItems.map((item, index) => (
              <li key={index} style={{ marginBottom: 6 }}>
                {item.text}
              </li>
            ))}
          </ul>
        </section>

        {/* Advanced */}
        <details className="admin-sidebar-card">
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Advanced</summary>
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h4 className="admin-sidebar-title">Điểm kinh doanh</h4>
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

            <div style={{ marginBottom: 16 }}>
              <h4 className="admin-sidebar-title">Từ khóa ({topic.keywords.length})</h4>
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

            <div style={{ marginBottom: 16 }}>
              <h4 className="admin-sidebar-title">Nội dung hiện có</h4>
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

            <div>
              <h4 className="admin-sidebar-title">Internal links ({allLinks.length})</h4>
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
                                <Link
                                  href={`/admin/content/topics/${related.id}`}
                                  className="admin-link"
                                >
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
          </div>
        </details>
      </div>
    </>
  );
}
