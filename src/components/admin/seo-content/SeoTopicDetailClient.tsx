"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import SeoBriefAiPanel from "@/components/admin/seo-content/SeoBriefAiPanel";
import WritingEnginePanel from "@/components/admin/content/WritingEnginePanel";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { useEditorFocusMode } from "@/components/admin/blog-editor/useEditorFocusMode";
import TopicDocumentHeader, {
  type DocumentHeaderOverflowItem,
} from "@/components/admin/seo-content/topic-workspace/TopicDocumentHeader";
import TopicEditorToolbar from "@/components/admin/seo-content/topic-workspace/TopicEditorToolbar";
import TopicWritingCanvas from "@/components/admin/seo-content/topic-workspace/TopicWritingCanvas";
import TopicOutlineNav from "@/components/admin/seo-content/topic-workspace/TopicOutlineNav";
import TopicContextRail from "@/components/admin/seo-content/topic-workspace/TopicContextRail";
import TopicProjectDetails from "@/components/admin/seo-content/topic-workspace/TopicProjectDetails";
import TopicAdvancedDrawer from "@/components/admin/seo-content/topic-workspace/TopicAdvancedDrawer";
import TopicPublishAssistant from "@/components/admin/seo-content/topic-workspace/TopicPublishAssistant";
import TopicPublishedSummary from "@/components/admin/seo-content/topic-workspace/TopicPublishedSummary";
import TopicMobileSheets from "@/components/admin/seo-content/topic-workspace/TopicMobileSheets";
import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";
import { SEO_TOPIC_PRIORITY_LABELS, SEO_TOPIC_STATUS_LABELS } from "@/features/content/seo/seo-labels";
import {
  CONTENT_STATUS_COLORS,
  buildEditorialChecklist,
  buildEditorialProgressSnapshot,
  flattenOutlineForNav,
  getTopicProgressPercent,
  groupEditorialActivity,
  readTopicFocusPreference,
  resolveTopicPrimaryCta,
  summarizeChecklistGroups,
  topicStatusTone,
  writeTopicFocusPreference,
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

export type BriefOutlineItem = {
  level: "H2" | "H3";
  heading: string;
  purpose?: string;
  notes?: string;
  required?: boolean;
  sortOrder: number;
};

export type TopicDetail = {
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
  updatedAt?: string;
  keywords: KeywordRow[];
  brief: BriefData | null;
};

export type KeywordRow = {
  id: string;
  keyword: string;
  keywordType: SeoKeywordType;
  source: string | null;
  priority: number;
};

export type BriefData = {
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

export type InternalLinkRow = {
  id: string;
  anchorText: string | null;
  context: string | null;
  relevanceScore: number;
  status: SeoInternalLinkStatus;
  targetTopic?: { id: string; title: string; targetUrl: string | null };
  sourceTopic?: { id: string; title: string; targetUrl: string | null };
};

export type ExistingMatch = {
  entityType: SeoTargetEntityType;
  entityId: string;
  title: string;
  url: string;
  adminRoute?: string;
  matchScore: number;
  matchedOn: string[];
};

export type OverviewForm = {
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

export type ScoresForm = {
  businessValue: number;
  relevanceScore: number;
  opportunityScore: number;
  confidenceScore: number;
};

export type BriefForm = {
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

  // Sprint 16.2 — document-first workspace chrome (outline / focus / mobile sheets).
  const [outlineOpen, setOutlineOpen] = useState(true);
  const { focus, setFocus, toggle: toggleFocus } = useEditorFocusMode();

  useEffect(() => {
    if (readTopicFocusPreference()) setFocus(true);
    // Restore the writer's last Focus preference once, on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeTopicFocusPreference(focus);
  }, [focus]);

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
  // Sprint 16.2 — known gap: WritingEnginePanel owns the active review id and
  // live draft word/section counts locally and does not lift them up yet, so
  // the header/rail CTA and progress snapshot fall back to status-only data.
  const primaryCta = resolveTopicPrimaryCta({
    status: topic.status,
    hasActiveReviewId: null,
    hasBlogDraft: Boolean(topic.targetUrl),
    publishedUrl: topic.existingUrl ?? topic.targetUrl,
  });
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
  const checklistGroups = summarizeChecklistGroups(checklist);
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
  const groupedActivity = groupEditorialActivity(activityItems);

  const outline = topic.brief?.outline ?? briefForm.outline;
  const outlineNavItems = flattenOutlineForNav(outline);

  const progressSnapshot = buildEditorialProgressSnapshot({
    status: topic.status,
    wordTargetMin: wordMin,
    wordTargetMax: wordMax,
    internalLinkCount: allLinks.length,
    ctaReady: Boolean(topic.brief?.ctaText),
    mediaReady: Boolean(topic.mediaBundleId) && Boolean(topic.mediaPlanStatus && topic.mediaPlanStatus !== "MISSING"),
    mediaGaps: topic.mediaBundleId && topic.mediaPlanStatus === "MISSING" ? 1 : null,
  });

  const wordTargetLabel =
    wordMin != null || wordMax != null ? `Mục tiêu ${wordMin ?? "—"}–${wordMax ?? "—"} từ` : "Chưa đặt mục tiêu từ";
  const readingTimeLabel = readingMinutes != null ? `~${readingMinutes} phút đọc` : "";
  const publishTargetLabel = topic.dueDate ? new Date(topic.dueDate).toLocaleDateString("vi-VN") : "Chưa đặt";

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePrimaryCtaClick(cta: { staysOnPage: boolean }) {
    if (cta.staysOnPage) scrollToSection("writing");
  }

  const overflowItems: DocumentHeaderOverflowItem[] = [
    { key: "calendar", label: "Lịch biên tập", href: "/admin/content/calendar" },
    { key: "strategy", label: "Chiến dịch", href: `/admin/content/seo-strategies/${topic.strategyId}` },
    { key: "advanced", label: "Cài đặt nâng cao", onClick: () => scrollToSection("advanced-settings") },
    ...(topic.status === "PUBLISHED"
      ? [{ key: "performance", label: "Hiệu quả", href: "/admin/content/performance" }]
      : []),
  ];

  const savingAny = overviewSaving || briefSaving || scoresSaving || keywordSaving;

  const outlineNavNode = <TopicOutlineNav items={outlineNavItems} />;
  const contextRailNode = (
    <TopicContextRail
      topicId={topicId}
      primaryCta={primaryCta}
      onPrimaryCtaClick={handlePrimaryCtaClick}
      progress={progressSnapshot}
      aiConfigured={false}
      media={{
        bundleName: topic.mediaBundleName,
        planScore: topic.mediaPlanScore,
        planStatus: topic.mediaPlanStatus,
        bundleId: topic.mediaBundleId,
        checking: mediaChecking,
        creating: bundleCreating,
        onCheck: () => void checkMedia(),
        onCreate: () => void createBundle(),
      }}
      checklistGroups={checklistGroups}
      activity={groupedActivity}
    />
  );

  return (
    <>
      <AdminPageTitle title={topic.title} />
      <div className={styles.workspace} data-focus={focus ? "on" : undefined}>
        <TopicDocumentHeader
          title={topic.title}
          primaryKeyword={topic.primaryKeyword}
          statusLabel={SEO_TOPIC_STATUS_LABELS[topic.status]}
          statusTone={statusTone}
          progressPercent={progressPercent}
          campaignName={topic.strategyName}
          campaignHref={`/admin/content/seo-strategies/${topic.strategyId}`}
          clusterName={topic.clusterName || null}
          wordTargetLabel={wordTargetLabel}
          readingTimeLabel={readingTimeLabel}
          publishTargetLabel={publishTargetLabel}
          aiStatusLabel="AI đang tắt"
          primaryCta={primaryCta}
          onPrimaryCtaClick={handlePrimaryCtaClick}
          overflowItems={overflowItems}
        />

        <TopicEditorToolbar
          saveStateLabel={savingAny ? "Đang lưu…" : "Đã lưu"}
          draftVersion={null}
          wordCount={null}
          outlineOpen={outlineOpen}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          focus={focus}
          onToggleFocus={toggleFocus}
          onPreviewScroll={() => scrollToSection("writing")}
          aiStatusLabel="AI đang tắt"
        />

        <TopicMobileSheets outline={outlineNavNode} context={contextRailNode} />

        <div className={styles.body}>
          {outlineOpen && !focus && <div className={styles.outlineCol}>{outlineNavNode}</div>}

          <TopicWritingCanvas>
            {topic.status === "PUBLISHED" ? (
              <TopicPublishedSummary
                publicUrl={topic.existingUrl ?? topic.targetUrl}
                updatedAtLabel={new Date(topic.updatedAt ?? Date.now()).toLocaleDateString("vi-VN")}
                performanceHref="/admin/content/performance"
              />
            ) : null}

            <details className={styles.canvasBlockSoft} id="brief">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Brief &amp; dàn ý</summary>
              <div style={{ marginTop: 12 }}>
                <p className="admin-field-hint" style={{ margin: "0 0 6px" }}>
                  Outline
                </p>
                {outline.length > 0 ? (
                  <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
                    {outline.map((row, index) => (
                      <li key={index} data-outline-id={`outline-${index}`}>
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
                <p style={{ margin: "0 0 12px" }}>{topic.brief?.editorNotes || briefForm.editorNotes || "—"}</p>
                <p className="admin-field-hint" style={{ margin: "0 0 12px" }}>
                  {wordTargetLabel}
                  {readingTimeLabel ? ` · ${readingTimeLabel}` : ""}
                </p>

                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Gợi ý brief (AI)</summary>
                  <div style={{ marginTop: 8 }}>
                    <SeoBriefAiPanel
                      topicId={topicId}
                      briefApproved={Boolean(topic.brief?.approvedAt)}
                      onApplied={() => void load()}
                    />
                  </div>
                </details>

                <details style={{ marginTop: 8 }}>
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
              </div>
            </details>

            <WritingEnginePanel topicId={topicId} canvasMode />

            <TopicPublishAssistant
              checklistGroups={checklistGroups}
              primaryCta={primaryCta}
              onPrimaryCtaClick={handlePrimaryCtaClick}
              onPreviewClick={() => scrollToSection("writing")}
            />

            <TopicProjectDetails
              defaultOpen={false}
              overviewForm={overviewForm}
              onOverviewFormChange={setOverviewForm}
              onSubmit={(e) => void saveOverview(e)}
              saving={overviewSaving}
              stats={{
                owner: topic.assignedTo ?? "—",
                priority: SEO_TOPIC_PRIORITY_LABELS[topic.priority],
                deadline: topic.dueDate ? new Date(topic.dueDate).toLocaleDateString("vi-VN") : "—",
                cluster: topic.clusterName || "—",
                campaign: topic.strategyName || "—",
                estimatedPublish: topic.dueDate ? new Date(topic.dueDate).toLocaleDateString("vi-VN") : "—",
                wordTarget: wordMin != null || wordMax != null ? `${wordMin ?? "—"}–${wordMax ?? "—"}` : "—",
                readingTime: readingMinutes != null ? `~${readingMinutes} phút` : "—",
                heroStatus,
              }}
            />
          </TopicWritingCanvas>

          {!focus && contextRailNode}
        </div>

        <div id="advanced-settings">
          <TopicAdvancedDrawer
            topic={topic}
            scoresForm={scoresForm}
            onScoresFormChange={setScoresForm}
            onSubmitScores={(e) => void saveScores(e)}
            scoresSaving={scoresSaving}
            keywords={topic.keywords}
            keywordPaste={keywordPaste}
            onKeywordPasteChange={setKeywordPaste}
            onBulkPasteKeywords={() => void bulkPasteKeywords()}
            keywordSaving={keywordSaving}
            matches={matches}
            matchLoading={matchLoading}
            onMatchExisting={() => void matchExisting()}
            onLinkTarget={(match) => void linkTarget(match)}
            manualTargetUrl={manualTargetUrl}
            onManualTargetUrlChange={setManualTargetUrl}
            manualEntityType={manualEntityType}
            onManualEntityTypeChange={setManualEntityType}
            allLinks={allLinks}
            linkSuggesting={linkSuggesting}
            onSuggestLinks={() => void suggestLinks()}
            onUpdateLinkStatus={(linkId, status) => void updateLinkStatus(linkId, status)}
          />
        </div>
      </div>
    </>
  );
}
