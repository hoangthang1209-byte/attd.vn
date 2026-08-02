"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  MediaAiProcessingStatus,
  MediaAssetType,
  MediaContentSuitability,
  MediaOrientation,
  MediaSeoReadinessStatus,
  MediaVisibility,
  MediaVocabularyType,
} from "@prisma/client";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  MEDIA_CONTENT_SUITABILITIES,
  MEDIA_CONTENT_SUITABILITY_LABELS,
} from "@/features/media/media-bundle-presets";
import { inferSuggestedSuitabilities } from "@/features/media/media-suitability-client";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  inferImageMimeType,
} from "@/lib/imageValidation";
import { MEDIA_TO_STORAGE_FOLDER } from "@/lib/storage/types";
import { resolveLegacyFolderFromLibraryCode } from "@/features/media/media-classification";
import { CardGridLoading, InlineLoading } from "@/components/ui/loading/ContextLoading";
import type { MediaMasterDataRecord } from "@/features/media/media-master-data.types";
import type { DuplicateAssetSummary } from "@/features/media/services/media-duplicate.service";
import type { MediaReference } from "@/features/media/services/media-reference.service";
import type { MediaAssetWithClassification } from "@/features/media/services/media.service";
import type { MediaVocabularyTermRecord } from "@/features/media/services/media-vocabulary.service";
import type { SemanticTermField } from "@/features/media/services/media-intelligence.service";
import {
  MEDIA_INTELLIGENCE_QUICK_PRESETS,
  MEDIA_INTELLIGENCE_QUICK_PRESET_LABELS,
  MEDIA_SEO_READINESS_LABELS,
  mediaAssetMatchesIntelligencePreset,
  type MediaIntelligenceQuickPreset,
} from "@/features/media/media-intelligence-filters";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const WARN_FILE_SIZE = 500 * 1024;
const MAX_BATCH = 50;
const BULK_MAX = 100;

const SEMANTIC_FIELDS: SemanticTermField[] = [
  "subjectTerms",
  "materialTerms",
  "colorTerms",
  "techniqueTerms",
  "industryTerms",
  "audienceTerms",
  "useCaseTerms",
];

/** Local mirror of media-intelligence.service's SEMANTIC_FIELD_TO_VOCAB_TYPE (kept out of the
 * client bundle since that service module also imports the Prisma client). */
const SEMANTIC_FIELD_TO_VOCAB_TYPE: Record<SemanticTermField, MediaVocabularyType> = {
  subjectTerms: "SUBJECT",
  materialTerms: "MATERIAL",
  colorTerms: "COLOR",
  techniqueTerms: "TECHNIQUE",
  industryTerms: "INDUSTRY",
  audienceTerms: "AUDIENCE",
  useCaseTerms: "USE_CASE",
};

const SEMANTIC_FIELD_LABELS: Record<SemanticTermField, string> = {
  subjectTerms: "Chủ thể",
  materialTerms: "Chất liệu",
  colorTerms: "Màu sắc",
  techniqueTerms: "Kỹ thuật",
  industryTerms: "Ngành nghề",
  audienceTerms: "Đối tượng",
  useCaseTerms: "Mục đích sử dụng",
};

const ASSET_TYPE_OPTIONS: { value: MediaAssetType; label: string }[] = [
  { value: "PHOTO", label: "Ảnh chụp" },
  { value: "ILLUSTRATION", label: "Minh họa" },
  { value: "LOGO", label: "Logo" },
  { value: "ICON", label: "Icon" },
  { value: "MOCKUP", label: "Mockup" },
  { value: "SCREENSHOT", label: "Ảnh chụp màn hình" },
  { value: "DIAGRAM", label: "Sơ đồ" },
  { value: "DOCUMENT_PREVIEW", label: "Xem trước tài liệu" },
  { value: "VIDEO_THUMBNAIL", label: "Ảnh đại diện video" },
  { value: "OTHER", label: "Khác" },
];

const ASSET_TYPE_LABELS: Record<MediaAssetType, string> = ASSET_TYPE_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<MediaAssetType, string>,
);

const MISSING_FIELD_LABELS: Record<string, string> = {
  library: "Thư viện",
  role: "Vai trò hiển thị",
  altText: "Alt text",
  title: "Tiêu đề",
  caption: "Chú thích",
  description: "Mô tả",
  keywords: "Từ khóa SEO",
  subject: "Chủ thể",
  industryOrUseCase: "Ngành nghề / Mục đích sử dụng",
  collection: "Bộ sưu tập",
  orientation: "Hướng ảnh",
  dimensions: "Kích thước ảnh",
};

const AI_STATUS_OPTIONS: { value: MediaAiProcessingStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái AI" },
  { value: "NOT_PROCESSED", label: "Chưa xử lý" },
  { value: "QUEUED", label: "Đã đưa vào hàng đợi" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "FAILED", label: "Thất bại" },
  { value: "SKIPPED", label: "Đã bỏ qua" },
];

const SEO_READINESS_OPTIONS: { value: MediaSeoReadinessStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái SEO" },
  { value: "INCOMPLETE", label: MEDIA_SEO_READINESS_LABELS.INCOMPLETE },
  { value: "BASIC", label: MEDIA_SEO_READINESS_LABELS.BASIC },
  { value: "READY", label: MEDIA_SEO_READINESS_LABELS.READY },
  { value: "EXCELLENT", label: MEDIA_SEO_READINESS_LABELS.EXCELLENT },
];

type SemanticTermState = Record<SemanticTermField, string[]>;

function emptySemanticState(): SemanticTermState {
  return {
    subjectTerms: [],
    materialTerms: [],
    colorTerms: [],
    techniqueTerms: [],
    industryTerms: [],
    audienceTerms: [],
    useCaseTerms: [],
  };
}

/** Search strings for vocabulary pickers — must be strings, never arrays. */
function emptySemanticSearchState(): Record<SemanticTermField, string> {
  return {
    subjectTerms: "",
    materialTerms: "",
    colorTerms: "",
    techniqueTerms: "",
    industryTerms: "",
    audienceTerms: "",
    useCaseTerms: "",
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asSuitabilityArray(value: unknown): MediaContentSuitability[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MediaContentSuitability =>
      typeof item === "string" && item in MEDIA_CONTENT_SUITABILITY_LABELS,
  );
}

type BulkSemanticEntry = { addEnabled: boolean; removeEnabled: boolean; add: string[]; remove: string[] };

function emptyBulkSemanticState(): Record<SemanticTermField, BulkSemanticEntry> {
  const entry = (): BulkSemanticEntry => ({ addEnabled: false, removeEnabled: false, add: [], remove: [] });
  return {
    subjectTerms: entry(),
    materialTerms: entry(),
    colorTerms: entry(),
    techniqueTerms: entry(),
    industryTerms: entry(),
    audienceTerms: entry(),
    useCaseTerms: entry(),
  };
}

const VISIBILITY_OPTIONS: { value: MediaVisibility | ""; label: string }[] = [
  { value: "", label: "Tất cả mức hiển thị" },
  { value: "PUBLIC", label: "Công khai" },
  { value: "INTERNAL", label: "Nội bộ" },
  { value: "PRIVATE", label: "Riêng tư" },
];

const ORIENTATION_OPTIONS: { value: MediaOrientation | ""; label: string }[] = [
  { value: "", label: "Tất cả hướng" },
  { value: "LANDSCAPE", label: "Ngang" },
  { value: "PORTRAIT", label: "Dọc" },
  { value: "SQUARE", label: "Vuông" },
  { value: "UNKNOWN", label: "Chưa xác định" },
];

const REF_TYPE_LABELS: Record<MediaReference["type"], string> = {
  PRODUCT: "Sản phẩm",
  BLOG: "Bài viết",
  QUOTE: "Báo giá",
  ORDER: "Đơn hàng",
  MANUFACTURING: "Sản xuất",
  HOMEPAGE: "Trang chủ",
  TECH_PACK: "Tech pack",
  SALES: "Bán hàng",
  CONTENT_BUNDLE: "Bộ media nội dung",
  OTHER: "Khác",
};

type UploadOverrides = {
  assetType?: MediaAssetType;
  contentSuitabilities?: MediaContentSuitability[];
} & Partial<SemanticTermState>;

type UploadFile = {
  file: File;
  id: string;
  status: "pending" | "checking" | "uploading" | "done" | "error" | "warn" | "duplicate";
  warning?: string;
  error?: string;
  result?: MediaAssetWithClassification;
  duplicateAsset?: DuplicateAssetSummary;
  reused?: boolean;
  overridesOpen?: boolean;
  overrides?: UploadOverrides;
  mergeIntoExisting?: boolean;
};

type EditingAsset = {
  id: string;
  libraryId: string;
  roleId: string;
  visibility: MediaVisibility;
  altText: string;
  title: string;
  caption: string;
  description: string;
  tags: string;
  keywords: string;
  contentLanguage: string;
  collectionIds: string[];
  assetType: MediaAssetType;
  semantic: SemanticTermState;
  contentSuitabilities: MediaContentSuitability[];
  seoScore: number;
  seoReadinessStatus: MediaSeoReadinessStatus;
  metadataCompleteness: number;
  missingFields: string[];
};

type DeleteBlockedState = {
  id: string;
  filename: string;
  message: string;
  references: MediaReference[];
  loadingRefs: boolean;
};

type ClassificationOption = MediaMasterDataRecord;

function mergeOptions(
  active: ClassificationOption[],
  current?: { id: string; code: string; name: string; isActive: boolean } | null,
): ClassificationOption[] {
  if (!current) return active;
  if (active.some((item) => item.id === current.id)) return active;
  return [
    {
      id: current.id,
      code: current.code,
      name: `${current.name}${current.isActive ? "" : " (đã vô hiệu)"}`,
      description: null,
      sortOrder: 0,
      isActive: current.isActive,
      isSystem: false,
      createdAt: "",
      updatedAt: "",
    },
    ...active,
  ];
}

function mergeCollectionOptions(
  active: ClassificationOption[],
  assigned: Array<{ id: string; code: string; name: string; isActive: boolean }>,
): ClassificationOption[] {
  const out = [...active];
  for (const col of assigned) {
    if (out.some((item) => item.id === col.id)) continue;
    out.push({
      id: col.id,
      code: col.code,
      name: `${col.name}${col.isActive ? "" : " (đã vô hiệu)"}`,
      description: null,
      sortOrder: 0,
      isActive: col.isActive,
      isSystem: false,
      createdAt: "",
      updatedAt: "",
    });
  }
  return out;
}

type MediaCollectionRef = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

function assetCollections(asset: MediaAssetWithClassification): MediaCollectionRef[] {
  const rows = (asset as unknown as { collections?: Array<{ mediaCollection: MediaCollectionRef }> })
    .collections;
  return rows?.map((row) => row.mediaCollection) ?? [];
}

function usageBadgeLabel(count: number | undefined): string {
  if (count === undefined) return "…";
  if (count === 0) return "Chưa sử dụng";
  return `Đang dùng ${count} nơi`;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasList(value: string[] | null | undefined): boolean {
  return Boolean(value?.some((item) => item.trim()));
}

/**
 * Client-side mirror of media-intelligence.service's completeness checks, used only for
 * display in the edit modal (server-computed seoScore/status remain the source of truth).
 */
function computeMissingIntelligenceFields(asset: MediaAssetWithClassification): string[] {
  const checks: Array<[string, boolean]> = [
    ["library", Boolean(asset.libraryId)],
    ["role", Boolean(asset.roleId)],
    ["altText", hasText(asset.altText)],
    ["title", hasText(asset.title)],
    ["caption", hasText(asset.caption)],
    ["description", hasText(asset.description)],
    ["keywords", hasList(asset.keywords)],
    ["subject", hasList(asset.subjectTerms)],
    ["industryOrUseCase", hasList(asset.industryTerms) || hasList(asset.useCaseTerms)],
    ["collection", assetCollections(asset).length > 0],
    ["orientation", Boolean(asset.orientation && asset.orientation !== "UNKNOWN")],
    ["dimensions", Boolean(asset.width && asset.height)],
  ];
  return checks.filter(([, ok]) => !ok).map(([key]) => key);
}

export default function MediaLibraryClient({ cmsReady = true }: { cmsReady?: boolean }) {
  const toast = useAdminToast();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<MediaAssetWithClassification[]>([]);
  const [libraries, setLibraries] = useState<ClassificationOption[]>([]);
  const [roles, setRoles] = useState<ClassificationOption[]>([]);
  const [collections, setCollections] = useState<ClassificationOption[]>([]);
  const [libraryId, setLibraryId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [visibility, setVisibility] = useState<MediaVisibility | "">("");
  const [orientation, setOrientation] = useState<MediaOrientation | "">("");
  const [hasAltText, setHasAltText] = useState<"" | "true" | "false">("");
  const [search, setSearch] = useState("");
  const [filterContentSuitability, setFilterContentSuitability] = useState<
    MediaContentSuitability | ""
  >("");
  const [workflowLane, setWorkflowLane] = useState("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [recentlyUploadedDays, setRecentlyUploadedDays] = useState<number | "">("");
  const [maximumSeoScore, setMaximumSeoScore] = useState<number | "">("");
  const [duplicateStatusFilter, setDuplicateStatusFilter] = useState("");
  const urlHydrated = useRef(false);
  const [uploadLibraryId, setUploadLibraryId] = useState("");
  const [uploadRoleId, setUploadRoleId] = useState("");
  const [uploadVisibility, setUploadVisibility] = useState<MediaVisibility>("PUBLIC");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadKeywords, setUploadKeywords] = useState("");
  const [uploadCollectionIds, setUploadCollectionIds] = useState<string[]>([]);
  const [uploadContentSuitabilities, setUploadContentSuitabilities] = useState<
    MediaContentSuitability[]
  >([]);
  const [uploadSuitabilitySearch, setUploadSuitabilitySearch] = useState("");
  const [referenceCounts, setReferenceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingAsset | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLibraryOptions, setEditLibraryOptions] = useState<ClassificationOption[]>([]);
  const [editRoleOptions, setEditRoleOptions] = useState<ClassificationOption[]>([]);
  const [editCollectionOptions, setEditCollectionOptions] = useState<ClassificationOption[]>([]);
  const [editReferences, setEditReferences] = useState<MediaReference[] | null>(null);
  const [editReferencesLoading, setEditReferencesLoading] = useState(false);
  const [refsModalAsset, setRefsModalAsset] = useState<MediaAssetWithClassification | null>(null);
  const [refsModalItems, setRefsModalItems] = useState<MediaReference[]>([]);
  const [refsModalLoading, setRefsModalLoading] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState<DeleteBlockedState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLibraryId, setBulkLibraryId] = useState("");
  const [bulkRoleId, setBulkRoleId] = useState("");
  const [bulkVisibility, setBulkVisibility] = useState<MediaVisibility>("PUBLIC");
  const [bulkTags, setBulkTags] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [bulkUpdateLibrary, setBulkUpdateLibrary] = useState(false);
  const [bulkUpdateRole, setBulkUpdateRole] = useState(false);
  const [bulkUpdateVisibility, setBulkUpdateVisibility] = useState(false);
  const [bulkUpdateTags, setBulkUpdateTags] = useState(false);
  const [bulkUpdateKeywords, setBulkUpdateKeywords] = useState(false);
  const [bulkAddCollections, setBulkAddCollections] = useState(false);
  const [bulkRemoveCollections, setBulkRemoveCollections] = useState(false);
  const [bulkAddCollectionIds, setBulkAddCollectionIds] = useState<string[]>([]);
  const [bulkRemoveCollectionIds, setBulkRemoveCollectionIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkUpdateAssetType, setBulkUpdateAssetType] = useState(false);
  const [bulkAssetType, setBulkAssetType] = useState<MediaAssetType>("PHOTO");
  const [bulkSemantic, setBulkSemantic] = useState(emptyBulkSemanticState());
  const [bulkAddSuitabilities, setBulkAddSuitabilities] = useState(false);
  const [bulkAddSuitabilityValues, setBulkAddSuitabilityValues] = useState<
    MediaContentSuitability[]
  >([]);
  const [bulkAddSuitabilitySearch, setBulkAddSuitabilitySearch] = useState("");
  const [bulkRemoveSuitabilities, setBulkRemoveSuitabilities] = useState(false);
  const [bulkRemoveSuitabilityValues, setBulkRemoveSuitabilityValues] = useState<
    MediaContentSuitability[]
  >([]);
  const [bulkRemoveSuitabilitySearch, setBulkRemoveSuitabilitySearch] = useState("");

  const [vocabTerms, setVocabTerms] = useState<MediaVocabularyTermRecord[]>([]);
  const [editVocabSearch, setEditVocabSearch] =
    useState<Record<SemanticTermField, string>>(emptySemanticSearchState);
  const [editSuitabilitySearch, setEditSuitabilitySearch] = useState("");
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  const [filterAssetType, setFilterAssetType] = useState<MediaAssetType | "">("");
  const [filterSeoReadiness, setFilterSeoReadiness] = useState<MediaSeoReadinessStatus | "">("");
  const [filterMinimumSeoScore, setFilterMinimumSeoScore] = useState("");
  const [filterHasTitle, setFilterHasTitle] = useState<"" | "true" | "false">("");
  const [filterHasKeywords, setFilterHasKeywords] = useState<"" | "true" | "false">("");
  const [filterHasSubject, setFilterHasSubject] = useState<"" | "true" | "false">("");
  const [filterAiStatus, setFilterAiStatus] = useState<MediaAiProcessingStatus | "">("");
  const [activePreset, setActivePreset] = useState<MediaIntelligenceQuickPreset | "">("");
  const [showIntelligenceFilters, setShowIntelligenceFilters] = useState(false);

  const [uploadAssetType, setUploadAssetType] = useState<MediaAssetType>("PHOTO");
  const [uploadSemantic, setUploadSemantic] = useState<SemanticTermState>(emptySemanticState());
  const [uploadVocabSearch, setUploadVocabSearch] =
    useState<Record<SemanticTermField, string>>(emptySemanticSearchState);

  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadTaxonomy = useCallback(async () => {
    try {
      const [libRes, roleRes, colRes] = await Promise.all([
        fetch("/api/content/media-libraries?activeOnly=1"),
        fetch("/api/content/media-roles?activeOnly=1"),
        fetch("/api/content/media-collections?activeOnly=1"),
      ]);
      const libData = (await libRes.json()) as { libraries?: ClassificationOption[] };
      const roleData = (await roleRes.json()) as { roles?: ClassificationOption[] };
      const colData = (await colRes.json()) as { collections?: ClassificationOption[] };
      const nextLibraries = libData.libraries ?? [];
      const nextRoles = roleData.roles ?? [];
      const nextCollections = colData.collections ?? [];
      setLibraries(nextLibraries);
      setRoles(nextRoles);
      setCollections(nextCollections);
      setUploadLibraryId((prev) => prev || nextLibraries.find((l) => l.code === "PRODUCT")?.id || nextLibraries[0]?.id || "");
      setUploadRoleId((prev) => prev || nextRoles.find((r) => r.code === "GENERAL")?.id || nextRoles[0]?.id || "");
    } catch {
      /* ignore taxonomy load errors — modal still opens with empty selectors */
    }

    try {
      const vocabRes = await fetch("/api/content/media-vocabulary?activeOnly=1");
      if (!vocabRes.ok) {
        setVocabTerms([]);
        return;
      }
      const vocabData = (await vocabRes.json()) as { terms?: MediaVocabularyTermRecord[] };
      setVocabTerms(Array.isArray(vocabData.terms) ? vocabData.terms : []);
    } catch {
      setVocabTerms([]);
    }
  }, []);

  function vocabTermsForType(type: MediaVocabularyType): MediaVocabularyTermRecord[] {
    return (vocabTerms ?? []).filter((term) => term.type === type);
  }

  function vocabOptionsForField(field: SemanticTermField, search: string): MediaVocabularyTermRecord[] {
    const type = SEMANTIC_FIELD_TO_VOCAB_TYPE[field];
    const needle = (typeof search === "string" ? search : "").trim().toLowerCase();
    const options = vocabTermsForType(type);
    if (!needle) return options;
    return options.filter((term) => {
      const aliases = Array.isArray(term.aliases) ? term.aliases : [];
      return (
        term.name.toLowerCase().includes(needle) ||
        aliases.some((alias) => String(alias).toLowerCase().includes(needle))
      );
    });
  }

  const loadReferenceCounts = useCallback(async (ids: string[]) => {
    if (!ids.length) {
      setReferenceCounts({});
      return;
    }
    try {
      const res = await fetch("/api/media/reference-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { counts?: Record<string, number> };
      setReferenceCounts(data.counts ?? {});
    } catch {
      /* ignore reference count errors */
    }
  }, []);

  const loadReferences = useCallback(async (assetId: string): Promise<MediaReference[]> => {
    const res = await fetch(`/api/media/${assetId}/references`);
    const data = (await res.json()) as { items?: MediaReference[]; message?: string };
    if (!res.ok) throw new Error(data.message ?? "Không thể tải nơi sử dụng");
    return data.items ?? [];
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (libraryId) params.set("libraryId", libraryId);
      if (roleId) params.set("roleId", roleId);
      if (collectionId) params.set("collectionId", collectionId);
      if (visibility) params.set("visibility", visibility);
      if (orientation) params.set("orientation", orientation);
      if (hasAltText) params.set("hasAltText", hasAltText);
      if (search.trim()) params.set("search", search.trim());
      if (filterContentSuitability) params.set("contentSuitability", filterContentSuitability);
      if (workflowLane) params.set("workflowLane", workflowLane);
      if (unusedOnly) params.set("unusedOnly", "1");
      if (recentlyUploadedDays !== "") params.set("recentlyUploadedDays", String(recentlyUploadedDays));
      if (maximumSeoScore !== "") params.set("maximumSeoScore", String(maximumSeoScore));
      if (duplicateStatusFilter) params.set("duplicateStatus", duplicateStatusFilter);
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = (await res.json()) as MediaAssetWithClassification[] | { message?: string };
      const nextAssets = Array.isArray(data) ? data : [];
      setAssets(nextAssets);
      void loadReferenceCounts(nextAssets.map((asset) => asset.id));
    } catch {
      setAssets([]);
      setReferenceCounts({});
    }
    setLoading(false);
  }, [
    libraryId,
    roleId,
    collectionId,
    visibility,
    orientation,
    hasAltText,
    search,
    filterContentSuitability,
    workflowLane,
    unusedOnly,
    recentlyUploadedDays,
    maximumSeoScore,
    duplicateStatusFilter,
    loadReferenceCounts,
  ]);

  useEffect(() => {
    if (urlHydrated.current) return;
    urlHydrated.current = true;
    const lane = searchParams.get("workflowLane");
    if (lane) setWorkflowLane(lane);
    if (searchParams.get("unusedOnly") === "1") setUnusedOnly(true);
    const days = searchParams.get("recentlyUploadedDays");
    if (days && Number.isFinite(Number(days))) setRecentlyUploadedDays(Number(days));
    const maxSeo = searchParams.get("maximumSeoScore");
    if (maxSeo && Number.isFinite(Number(maxSeo))) setMaximumSeoScore(Number(maxSeo));
    const dup = searchParams.get("duplicateStatus");
    if (dup) setDuplicateStatusFilter(dup);
    const alt = searchParams.get("hasAltText");
    if (alt === "0" || alt === "false") setHasAltText("false");
    if (alt === "1" || alt === "true") setHasAltText("true");
  }, [searchParams]);

  useEffect(() => {
    void loadTaxonomy();
  }, [loadTaxonomy]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!editing) {
      setEditReferences(null);
      setEditReferencesLoading(false);
      return;
    }
    let cancelled = false;
    setEditReferencesLoading(true);
    void loadReferences(editing.id)
      .then((items) => {
        if (!cancelled) setEditReferences(items);
      })
      .catch(() => {
        if (!cancelled) setEditReferences([]);
      })
      .finally(() => {
        if (!cancelled) setEditReferencesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing?.id, loadReferences]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(assets.map((asset) => asset.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [assets]);

  function validateFile(file: File): { ok: boolean; error?: string; warning?: string } {
    const mimeType = inferImageMimeType(file.name, file.type);
    if (!mimeType) return { ok: false, error: "Định dạng không hỗ trợ. Chỉ hỗ trợ JPG, PNG, WebP." };
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, error: `Dung lượng tối đa 2MB/ảnh (${(file.size / 1024 / 1024).toFixed(1)}MB).` };
    }
    if (file.size > WARN_FILE_SIZE) {
      return {
        ok: true,
        warning: `Ảnh này lớn hơn 500KB (${(file.size / 1024).toFixed(0)}KB). Khuyến nghị 200–300KB để website tải nhanh.`,
      };
    }
    return { ok: true };
  }

  function addFilesToQueue(files: File[]) {
    const limited = files.slice(0, MAX_BATCH);
    const entries: UploadFile[] = limited.map((file) => {
      const check = validateFile(file);
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: check.ok ? (check.warning ? "warn" : "pending") : "error",
        warning: check.warning,
        error: check.error,
      };
    });
    setUploadQueue((q) => [...q, ...entries]);
  }

  function buildUploadFormData(
    item: UploadFile,
    forceDuplicateUpload = false,
    mergeSemanticIntoExisting = false,
  ): FormData {
    const fd = new FormData();
    fd.append("file", item.file);
    const uploadLibrary = libraries.find((l) => l.id === uploadLibraryId);
    const storageFolder = uploadLibrary
      ? MEDIA_TO_STORAGE_FOLDER[resolveLegacyFolderFromLibraryCode(uploadLibrary.code)]
      : "products";
    fd.append("folder", storageFolder);
    if (uploadLibraryId) fd.append("libraryId", uploadLibraryId);
    if (uploadRoleId) fd.append("roleId", uploadRoleId);
    fd.append("visibility", uploadVisibility);
    if (uploadTags.trim()) fd.append("tags", uploadTags);
    if (uploadKeywords.trim()) fd.append("keywords", uploadKeywords);
    if (uploadCollectionIds.length) {
      fd.append("collectionIds", JSON.stringify(uploadCollectionIds));
    }
    if (forceDuplicateUpload) fd.append("forceDuplicateUpload", "true");
    if (mergeSemanticIntoExisting) fd.append("mergeSemanticIntoExisting", "true");

    const assetType = item.overrides?.assetType ?? uploadAssetType;
    fd.append("assetType", assetType);
    for (const field of SEMANTIC_FIELDS) {
      const terms = item.overrides?.[field] ?? uploadSemantic[field];
      if (terms.length) fd.append(field, JSON.stringify(terms));
    }
    const contentSuitabilities = item.overrides?.contentSuitabilities ?? uploadContentSuitabilities;
    if (contentSuitabilities.length) {
      fd.append("contentSuitabilities", JSON.stringify(contentSuitabilities));
    }
    return fd;
  }

  async function checkDuplicate(item: UploadFile): Promise<DuplicateAssetSummary | null> {
    const fd = new FormData();
    fd.append("file", item.file);
    const res = await fetch("/api/media/check-duplicate", { method: "POST", body: fd });
    const data = (await res.json()) as {
      exactDuplicate?: DuplicateAssetSummary | null;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(data.message ?? "Không thể kiểm tra trùng ảnh");
    }
    return data.exactDuplicate ?? null;
  }

  async function uploadSingleItem(
    item: UploadFile,
    forceDuplicateUpload = false,
    mergeSemanticIntoExisting = false,
  ) {
    setUploadQueue((q) => q.map((u) => (u.id === item.id ? { ...u, status: "uploading" } : u)));
    const fd = buildUploadFormData(item, forceDuplicateUpload, mergeSemanticIntoExisting);
    try {
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = (await res.json()) as {
        message?: string;
        warning?: string;
        code?: string;
        exactDuplicate?: DuplicateAssetSummary;
      } & MediaAssetWithClassification;
      if (res.status === 409 && data.code === "EXACT_DUPLICATE" && data.exactDuplicate) {
        setUploadQueue((q) =>
          q.map((u) =>
            u.id === item.id
              ? { ...u, status: "duplicate", duplicateAsset: data.exactDuplicate, error: undefined }
              : u,
          ),
        );
        return;
      }
      if (!res.ok) {
        setUploadQueue((q) =>
          q.map((u) =>
            u.id === item.id ? { ...u, status: "error", error: data.message ?? "Upload thất bại" } : u,
          ),
        );
        return;
      }
      setUploadQueue((q) =>
        q.map((u) =>
          u.id === item.id
            ? { ...u, status: "done", result: data, warning: data.warning ?? u.warning, reused: false }
            : u,
        ),
      );
    } catch {
      setUploadQueue((q) =>
        q.map((u) => (u.id === item.id ? { ...u, status: "error", error: "Lỗi kết nối" } : u)),
      );
    }
  }

  function toggleMergeIntoExisting(itemId: string) {
    setUploadQueue((q) =>
      q.map((u) => (u.id === itemId ? { ...u, mergeIntoExisting: !u.mergeIntoExisting } : u)),
    );
  }

  /**
   * "Dùng ảnh đã có": when the "Thêm metadata đã chọn vào ảnh có sẵn" checkbox is on,
   * re-upload with forceDuplicateUpload + mergeSemanticIntoExisting so the server merges
   * this file's tags/keywords/semantic terms into the existing asset. Otherwise this stays a
   * purely local no-op (skip upload, keep the existing asset untouched).
   */
  async function reuseDuplicateItem(itemId: string) {
    const item = uploadQueue.find((u) => u.id === itemId);
    if (!item) return;
    if (item.mergeIntoExisting) {
      await uploadSingleItem(item, true, true);
      await load();
      return;
    }
    setUploadQueue((q) =>
      q.map((u) => {
        if (u.id !== itemId || !u.duplicateAsset) return u;
        return { ...u, status: "done", reused: true, error: undefined };
      }),
    );
  }

  function skipDuplicateItem(itemId: string) {
    setUploadQueue((q) => q.filter((u) => u.id !== itemId));
  }

  async function uploadAll() {
    const toProcess = uploadQueue.filter((u) => u.status === "pending" || u.status === "warn");
    if (!toProcess.length) return;

    for (const item of toProcess) {
      setUploadQueue((q) => q.map((u) => (u.id === item.id ? { ...u, status: "checking" } : u)));
      try {
        const exactDuplicate = await checkDuplicate(item);
        if (exactDuplicate) {
          setUploadQueue((q) =>
            q.map((u) =>
              u.id === item.id ? { ...u, status: "duplicate", duplicateAsset: exactDuplicate } : u,
            ),
          );
          continue;
        }
      } catch (err) {
        setUploadQueue((q) =>
          q.map((u) =>
            u.id === item.id
              ? { ...u, status: "error", error: err instanceof Error ? err.message : "Không thể kiểm tra trùng ảnh" }
              : u,
          ),
        );
        continue;
      }
      await uploadSingleItem(item, false);
    }
    await load();
  }

  async function reuseAllDuplicates() {
    const duplicateIds = uploadQueue.filter((u) => u.status === "duplicate").map((u) => u.id);
    for (const id of duplicateIds) await reuseDuplicateItem(id);
  }

  function skipAllDuplicates() {
    setUploadQueue((q) => q.filter((u) => u.status !== "duplicate"));
  }

  async function uploadAllDuplicatesAnyway() {
    const duplicates = uploadQueue.filter((u) => u.status === "duplicate");
    for (const item of duplicates) {
      await uploadSingleItem(item, true, item.mergeIntoExisting);
    }
    await load();
  }

  function toggleUploadCollection(id: string) {
    setUploadCollectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleUploadSemanticTerm(field: SemanticTermField, name: string) {
    setUploadSemantic((prev) => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(name) ? list.filter((n) => n !== name) : [...list, name],
      };
    });
  }

  function toggleUploadContentSuitability(value: MediaContentSuitability) {
    setUploadContentSuitabilities((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function toggleItemOverrideSuitability(itemId: string, value: MediaContentSuitability) {
    setUploadQueue((q) =>
      q.map((u) => {
        if (u.id !== itemId) return u;
        const current = u.overrides?.contentSuitabilities ?? uploadContentSuitabilities;
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...u, overrides: { ...u.overrides, contentSuitabilities: next } };
      }),
    );
  }

  function toggleItemOverridesOpen(itemId: string) {
    setUploadQueue((q) =>
      q.map((u) =>
        u.id === itemId ? { ...u, overridesOpen: !u.overridesOpen, overrides: u.overrides ?? {} } : u,
      ),
    );
  }

  function setItemOverrideAssetType(itemId: string, assetType: MediaAssetType) {
    setUploadQueue((q) =>
      q.map((u) => (u.id === itemId ? { ...u, overrides: { ...u.overrides, assetType } } : u)),
    );
  }

  function toggleItemOverrideTerm(itemId: string, field: SemanticTermField, name: string) {
    setUploadQueue((q) =>
      q.map((u) => {
        if (u.id !== itemId) return u;
        const current = u.overrides?.[field] ?? uploadSemantic[field];
        const next = current.includes(name)
          ? current.filter((n) => n !== name)
          : [...current, name];
        return { ...u, overrides: { ...u.overrides, [field]: next } };
      }),
    );
  }

  function toggleEditCollection(id: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      collectionIds: editing.collectionIds.includes(id)
        ? editing.collectionIds.filter((item) => item !== id)
        : [...editing.collectionIds, id],
    });
  }

  function toggleBulkCollection(
    ids: string[],
    setIds: Dispatch<SetStateAction<string[]>>,
    id: string,
  ) {
    setIds(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  async function openUsageReferences(asset: MediaAssetWithClassification) {
    setRefsModalAsset(asset);
    setRefsModalItems([]);
    setRefsModalLoading(true);
    try {
      const items = await loadReferences(asset.id);
      setRefsModalItems(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải nơi sử dụng");
      setRefsModalAsset(null);
    } finally {
      setRefsModalLoading(false);
    }
  }

  async function loadDeleteBlockedReferences() {
    if (!deleteBlocked) return;
    setDeleteBlocked({ ...deleteBlocked, loadingRefs: true });
    try {
      const items = await loadReferences(deleteBlocked.id);
      setDeleteBlocked({ ...deleteBlocked, references: items, loadingRefs: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải nơi sử dụng");
      setDeleteBlocked({ ...deleteBlocked, loadingRefs: false });
    }
  }

  function clearQueue() {
    setUploadQueue([]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeFromQueue(id: string) {
    setUploadQueue((q) => q.filter((u) => u.id !== id));
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) addFilesToQueue(files);
  }

  async function copyUrl(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Xóa ảnh "${filename}"?`)) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Đã xóa ảnh");
      await load();
      return;
    }
    const data = (await res.json()) as {
      message?: string;
      references?: MediaReference[];
    };
    if (res.status === 409) {
      setDeleteBlocked({
        id,
        filename,
        message: data.message ?? "Ảnh đang được sử dụng và không thể xóa",
        references: data.references ?? [],
        loadingRefs: false,
      });
      return;
    }
    toast.error(data.message ?? "Không thể xóa ảnh");
  }

  function openEdit(asset: MediaAssetWithClassification) {
    setEditError(null);
    setEditLibraryOptions(mergeOptions(libraries, asset.library));
    setEditRoleOptions(mergeOptions(roles, asset.role));
    setEditCollectionOptions(mergeCollectionOptions(collections, assetCollections(asset)));
    setEditVocabSearch(emptySemanticSearchState());
    setEditSuitabilitySearch("");
    setIntelligenceOpen(false);
    setEditReferences(null);
    setEditing({
      id: asset.id,
      libraryId: asset.libraryId ?? "",
      roleId: asset.roleId ?? "",
      visibility: asset.visibility ?? "PUBLIC",
      altText: asset.altText ?? "",
      title: asset.title ?? "",
      caption: asset.caption ?? "",
      description: asset.description ?? "",
      tags: asStringArray(asset.tags).join(", "),
      keywords: asStringArray(asset.keywords).join(", "),
      contentLanguage: asset.contentLanguage ?? "",
      collectionIds: assetCollections(asset)
        .filter((col): col is MediaCollectionRef => Boolean(col?.id))
        .map((col) => col.id),
      assetType: asset.assetType ?? "PHOTO",
      semantic: {
        subjectTerms: asStringArray(asset.subjectTerms),
        materialTerms: asStringArray(asset.materialTerms),
        colorTerms: asStringArray(asset.colorTerms),
        techniqueTerms: asStringArray(asset.techniqueTerms),
        industryTerms: asStringArray(asset.industryTerms),
        audienceTerms: asStringArray(asset.audienceTerms),
        useCaseTerms: asStringArray(asset.useCaseTerms),
      },
      contentSuitabilities: asSuitabilityArray(asset.contentSuitabilities),
      seoScore: typeof asset.seoScore === "number" ? asset.seoScore : 0,
      seoReadinessStatus: asset.seoReadinessStatus ?? "INCOMPLETE",
      metadataCompleteness:
        typeof asset.metadataCompleteness === "number" ? asset.metadataCompleteness : 0,
      missingFields: computeMissingIntelligenceFields(asset),
    });
  }

  function toggleEditSemanticTerm(field: SemanticTermField, name: string) {
    setEditing((prev) => {
      if (!prev) return prev;
      const current = asStringArray(prev.semantic?.[field]);
      const next = current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name];
      return {
        ...prev,
        semantic: { ...emptySemanticState(), ...prev.semantic, [field]: next },
      };
    });
  }

  function toggleEditContentSuitability(value: MediaContentSuitability) {
    setEditing((prev) => {
      if (!prev) return prev;
      const current = asSuitabilityArray(prev.contentSuitabilities);
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, contentSuitabilities: next };
    });
  }

  /** Merges deterministic role-based suggestions into the current selection (does not remove any). */
  function applySuggestedSuitabilities() {
    if (!editing) return;
    const role = editRoleOptions.find((r) => r.id === editing.roleId);
    const suggested = inferSuggestedSuitabilities({ roleCode: role?.code });
    if (!suggested.length) {
      toast.info("Không có gợi ý phù hợp cho vai trò hiện tại");
      return;
    }
    setEditing((prev) => {
      if (!prev) return prev;
      const merged = [
        ...new Set([...asSuitabilityArray(prev.contentSuitabilities), ...suggested]),
      ];
      return { ...prev, contentSuitabilities: merged };
    });
  }

  async function saveEdit() {
    if (!editing || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/media/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryId: editing.libraryId || undefined,
          roleId: editing.roleId || undefined,
          visibility: editing.visibility,
          altText: editing.altText,
          title: editing.title,
          caption: editing.caption,
          description: editing.description,
          tags: editing.tags.split(",").map((t) => t.trim()).filter(Boolean),
          keywords: editing.keywords.split(",").map((t) => t.trim()).filter(Boolean),
          contentLanguage: editing.contentLanguage || null,
          collectionIds: editing.collectionIds ?? [],
          assetType: editing.assetType ?? "PHOTO",
          subjectTerms: asStringArray(editing.semantic?.subjectTerms),
          materialTerms: asStringArray(editing.semantic?.materialTerms),
          colorTerms: asStringArray(editing.semantic?.colorTerms),
          techniqueTerms: asStringArray(editing.semantic?.techniqueTerms),
          industryTerms: asStringArray(editing.semantic?.industryTerms),
          audienceTerms: asStringArray(editing.semantic?.audienceTerms),
          useCaseTerms: asStringArray(editing.semantic?.useCaseTerms),
          contentSuitabilities: asSuitabilityArray(editing.contentSuitabilities),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setEditError(data.message ?? "Không thể cập nhật metadata ảnh");
        return;
      }
      setEditing(null);
      toast.success("Đã cập nhật metadata ảnh");
      await load();
    } catch {
      setEditError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setEditSaving(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllLoaded() {
    setSelectedIds(new Set(displayedAssets.map((asset) => asset.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openBulkEdit() {
    setBulkError(null);
    setBulkUpdateLibrary(false);
    setBulkUpdateRole(false);
    setBulkUpdateVisibility(false);
    setBulkUpdateTags(false);
    setBulkUpdateKeywords(false);
    setBulkAddCollections(false);
    setBulkRemoveCollections(false);
    setBulkAddCollectionIds([]);
    setBulkRemoveCollectionIds([]);
    setBulkLibraryId(libraries[0]?.id ?? "");
    setBulkRoleId(roles[0]?.id ?? "");
    setBulkVisibility("PUBLIC");
    setBulkTags("");
    setBulkKeywords("");
    setBulkUpdateAssetType(false);
    setBulkAssetType("PHOTO");
    setBulkSemantic(emptyBulkSemanticState());
    setBulkAddSuitabilities(false);
    setBulkAddSuitabilityValues([]);
    setBulkAddSuitabilitySearch("");
    setBulkRemoveSuitabilities(false);
    setBulkRemoveSuitabilityValues([]);
    setBulkRemoveSuitabilitySearch("");
    setBulkOpen(true);
  }

  function capitalizeFirst(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function toggleBulkSemanticTerm(field: SemanticTermField, mode: "add" | "remove", name: string) {
    setBulkSemantic((prev) => {
      const entry = prev[field];
      const list = mode === "add" ? entry.add : entry.remove;
      const nextList = list.includes(name) ? list.filter((item) => item !== name) : [...list, name];
      return {
        ...prev,
        [field]: mode === "add" ? { ...entry, add: nextList } : { ...entry, remove: nextList },
      };
    });
  }

  async function saveBulkEdit() {
    if (bulkSaving || selectedIds.size === 0) return;
    const anySemanticEnabled = SEMANTIC_FIELDS.some(
      (field) => bulkSemantic[field].addEnabled || bulkSemantic[field].removeEnabled,
    );
    if (
      !bulkUpdateLibrary &&
      !bulkUpdateRole &&
      !bulkUpdateVisibility &&
      !bulkUpdateTags &&
      !bulkUpdateKeywords &&
      !bulkAddCollections &&
      !bulkRemoveCollections &&
      !bulkUpdateAssetType &&
      !(bulkAddSuitabilities && bulkAddSuitabilityValues.length) &&
      !(bulkRemoveSuitabilities && bulkRemoveSuitabilityValues.length) &&
      !anySemanticEnabled
    ) {
      setBulkError("Chọn ít nhất một trường để cập nhật");
      return;
    }

    const payload: Record<string, unknown> = { ids: [...selectedIds] };
    if (bulkUpdateLibrary) payload.libraryId = bulkLibraryId;
    if (bulkUpdateRole) payload.roleId = bulkRoleId;
    if (bulkUpdateVisibility) payload.visibility = bulkVisibility;
    if (bulkUpdateTags) {
      payload.tags = bulkTags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (bulkUpdateKeywords) {
      payload.keywords = bulkKeywords.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (bulkAddCollections) payload.addCollectionIds = bulkAddCollectionIds;
    if (bulkRemoveCollections) payload.removeCollectionIds = bulkRemoveCollectionIds;
    if (bulkUpdateAssetType) payload.assetType = bulkAssetType;
    if (bulkAddSuitabilities && bulkAddSuitabilityValues.length) {
      payload.addContentSuitabilities = bulkAddSuitabilityValues;
    }
    if (bulkRemoveSuitabilities && bulkRemoveSuitabilityValues.length) {
      payload.removeContentSuitabilities = bulkRemoveSuitabilityValues;
    }
    for (const field of SEMANTIC_FIELDS) {
      const entry = bulkSemantic[field];
      if (entry.addEnabled && entry.add.length) {
        payload[`add${capitalizeFirst(field)}`] = entry.add;
      }
      if (entry.removeEnabled && entry.remove.length) {
        payload[`remove${capitalizeFirst(field)}`] = entry.remove;
      }
    }

    setBulkSaving(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/media/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        message?: string;
        updatedCount?: number;
        addedCount?: number;
        removedCount?: number;
      };
      if (!res.ok) {
        setBulkError(data.message ?? "Không thể cập nhật hàng loạt");
        return;
      }
      const count = data.updatedCount ?? selectedIds.size;
      const parts = [`Đã cập nhật ${count} ảnh`];
      if (typeof data.addedCount === "number" && data.addedCount > 0) {
        parts.push(`thêm ${data.addedCount} liên kết bộ sưu tập`);
      }
      if (typeof data.removedCount === "number" && data.removedCount > 0) {
        parts.push(`gỡ ${data.removedCount} liên kết bộ sưu tập`);
      }
      setBulkOpen(false);
      clearSelection();
      toast.success(parts.join(", "));
      await load();
    } catch {
      setBulkError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setBulkSaving(false);
    }
  }

  const hasQueue = uploadQueue.length > 0;
  const pendingCount = uploadQueue.filter((u) => u.status === "pending" || u.status === "warn").length;
  const duplicateCount = uploadQueue.filter((u) => u.status === "duplicate").length;
  const selectedCount = selectedIds.size;

  /**
   * Additional Asset Intelligence filters applied client-side (assetType, SEO readiness,
   * minimum SEO score, missing title/keywords/subject, AI status, quick presets). The
   * underlying `MediaAssetListFilters` type already supports most of these server-side, but
   * GET /api/media isn't in this sprint's file scope to parse the extra query params, so
   * filtering runs here against the already-fetched page.
   */
  const displayedAssets = useMemo(() => {
    const minScore = filterMinimumSeoScore.trim() ? Number(filterMinimumSeoScore) : undefined;
    return assets.filter((asset) => {
      if (filterAssetType && asset.assetType !== filterAssetType) return false;
      if (filterSeoReadiness && asset.seoReadinessStatus !== filterSeoReadiness) return false;
      if (typeof minScore === "number" && Number.isFinite(minScore) && asset.seoScore < minScore) {
        return false;
      }
      if (filterHasTitle === "true" && !asset.title?.trim()) return false;
      if (filterHasTitle === "false" && asset.title?.trim()) return false;
      if (filterHasKeywords === "true" && !(asset.keywords?.length ?? 0)) return false;
      if (filterHasKeywords === "false" && (asset.keywords?.length ?? 0)) return false;
      if (filterHasSubject === "true" && !(asset.subjectTerms?.length ?? 0)) return false;
      if (filterHasSubject === "false" && (asset.subjectTerms?.length ?? 0)) return false;
      if (filterAiStatus && asset.aiProcessingStatus !== filterAiStatus) return false;
      if (activePreset && !mediaAssetMatchesIntelligencePreset(asset, activePreset)) return false;
      return true;
    });
  }, [
    assets,
    filterAssetType,
    filterSeoReadiness,
    filterMinimumSeoScore,
    filterHasTitle,
    filterHasKeywords,
    filterHasSubject,
    filterAiStatus,
    activePreset,
  ]);

  const allLoadedSelected =
    displayedAssets.length > 0 && displayedAssets.every((asset) => selectedIds.has(asset.id));

  function renderReferencesList(items: MediaReference[]) {
    if (!items.length) {
      return <p className="admin-field-hint">Ảnh chưa được sử dụng ở đâu.</p>;
    }
    return (
      <ul className="admin-field-hint" style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((ref) => (
          <li key={`${ref.type}-${ref.entityId}-${ref.field ?? ""}`} style={{ marginBottom: 6 }}>
            <strong>{REF_TYPE_LABELS[ref.type]}</strong>: {ref.entityTitle}
            {ref.field ? ` · ${ref.field}` : ""}
            {ref.route ? (
              <>
                {" · "}
                <a href={ref.route} className="admin-link">
                  Mở trong admin
                </a>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  function renderCollectionCheckboxes(
    options: ClassificationOption[],
    selected: string[],
    onToggle: (id: string) => void,
    disabled = false,
  ) {
    if (!options.length) {
      return <p className="admin-field-hint">Chưa có bộ sưu tập nào.</p>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
        {options.map((item) => (
          <label
            key={item.id}
            className="admin-field-hint"
            style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
              disabled={disabled}
            />
            {item.name}
          </label>
        ))}
      </div>
    );
  }

  /** Compact searchable multi-select for one semantic vocabulary type (edit modal). */
  function renderSemanticTermPicker(
    field: SemanticTermField,
    selected: string[] | null | undefined,
    onToggle: (name: string) => void,
    searchValue: string | null | undefined,
    onSearchChange: (value: string) => void,
    disabled = false,
  ) {
    const safeSelected = asStringArray(selected);
    const safeSearch = typeof searchValue === "string" ? searchValue : "";
    const options = vocabOptionsForField(field, safeSearch);
    return (
      <div className="admin-field" style={{ marginBottom: 10 }}>
        <label className="admin-label">{SEMANTIC_FIELD_LABELS[field]}</label>
        {safeSelected.length > 0 && (
          <p className="admin-field-hint" style={{ margin: "0 0 4px" }}>
            Đã chọn: {safeSelected.join(", ")}
          </p>
        )}
        <input
          className="admin-input admin-input--sm"
          placeholder={`Tìm ${SEMANTIC_FIELD_LABELS[field].toLowerCase()}…`}
          value={safeSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
        />
        {options.length === 0 ? (
          <p className="admin-field-hint">Không có thuật ngữ phù hợp.</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 120,
              overflowY: "auto",
              marginTop: 4,
            }}
          >
            {options.map((term) => (
              <label
                key={term.id}
                className="admin-field-hint"
                style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}
              >
                <input
                  type="checkbox"
                  checked={safeSelected.includes(term.name)}
                  onChange={() => onToggle(term.name)}
                  disabled={disabled}
                />
                {term.name}
                {!term.isActive && " (đã vô hiệu)"}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  /** Compact checkbox list of vocabulary term names (bulk edit add/remove pickers). */
  function renderVocabNameCheckboxes(
    field: SemanticTermField,
    selected: string[] | null | undefined,
    onToggle: (name: string) => void,
    disabled = false,
  ) {
    const safeSelected = asStringArray(selected);
    const options = vocabTermsForType(SEMANTIC_FIELD_TO_VOCAB_TYPE[field]);
    if (!options.length) {
      return <p className="admin-field-hint">Chưa có thuật ngữ nào.</p>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
        {options.map((term) => (
          <label
            key={term.id}
            className="admin-field-hint"
            style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}
          >
            <input
              type="checkbox"
              checked={safeSelected.includes(term.name)}
              onChange={() => onToggle(term.name)}
              disabled={disabled}
            />
            {term.name}
          </label>
        ))}
      </div>
    );
  }

  /** Compact searchable multi-select checkbox list for MediaContentSuitability values. */
  function renderContentSuitabilityPicker(
    selected: MediaContentSuitability[] | null | undefined,
    onToggle: (value: MediaContentSuitability) => void,
    searchValue: string | null | undefined,
    onSearchChange: (value: string) => void,
    disabled = false,
  ) {
    const safeSelected = asSuitabilityArray(selected);
    const safeSearch = typeof searchValue === "string" ? searchValue : "";
    const needle = safeSearch.trim().toLowerCase();
    const options = needle
      ? MEDIA_CONTENT_SUITABILITIES.filter((value) =>
          MEDIA_CONTENT_SUITABILITY_LABELS[value].toLowerCase().includes(needle),
        )
      : MEDIA_CONTENT_SUITABILITIES;
    return (
      <div className="admin-field" style={{ marginBottom: 10 }}>
        {safeSelected.length > 0 && (
          <p className="admin-field-hint" style={{ margin: "0 0 4px" }}>
            Đã chọn: {safeSelected.map((v) => MEDIA_CONTENT_SUITABILITY_LABELS[v]).join(", ")}
          </p>
        )}
        <input
          className="admin-input admin-input--sm"
          placeholder="Tìm vai trò nội dung…"
          value={safeSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            maxHeight: 140,
            overflowY: "auto",
            marginTop: 4,
          }}
        >
          {options.map((value) => (
            <label
              key={value}
              className="admin-field-hint"
              style={{ display: "flex", alignItems: "center", gap: 4, margin: 0 }}
            >
              <input
                type="checkbox"
                checked={safeSelected.includes(value)}
                onChange={() => onToggle(value)}
                disabled={disabled}
              />
              {MEDIA_CONTENT_SUITABILITY_LABELS[value]}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-media-page">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Link href="/admin/media/dashboard" className="admin-btn admin-btn--secondary admin-btn--xs">
          Media Dashboard
        </Link>
        <Link href="/admin/media/inbox" className="admin-btn admin-btn--secondary admin-btn--xs">
          Incoming / Review
        </Link>
        {(workflowLane || unusedOnly || recentlyUploadedDays !== "" || maximumSeoScore !== "" || duplicateStatusFilter) && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            onClick={() => {
              setWorkflowLane("");
              setUnusedOnly(false);
              setRecentlyUploadedDays("");
              setMaximumSeoScore("");
              setDuplicateStatusFilter("");
            }}
          >
            Xóa filter thông minh
          </button>
        )}
      </div>
      <div className="admin-catalog-fieldset">
        <h3 className="admin-subtitle">Tải ảnh lên</h3>
        <div
          ref={dropRef}
          className={`admin-media-dropzone ${dragging ? "is-dragging" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="admin-media-dropzone-inner">
            <span className="admin-media-dropzone-icon">🖼</span>
            <strong>Kéo thả ảnh vào đây</strong>
            <span className="admin-field-hint">
              hoặc click để chọn ảnh (JPG, PNG, WebP · max 2MB · tối đa 50 ảnh)
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFilesToQueue(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </div>

        {hasQueue && (
          <div className="admin-media-queue">
            <div className="admin-media-queue-header" style={{ flexWrap: "wrap" }}>
              <span className="admin-field-hint">
                {uploadQueue.length} ảnh đã chọn · {pendingCount} sẵn sàng upload
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  className="admin-input admin-input--sm"
                  value={uploadLibraryId}
                  onChange={(e) => setUploadLibraryId(e.target.value)}
                >
                  {libraries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-input admin-input--sm"
                  value={uploadRoleId}
                  onChange={(e) => setUploadRoleId(e.target.value)}
                >
                  {roles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-input admin-input--sm"
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value as MediaVisibility)}
                >
                  {VISIBILITY_OPTIONS.filter((v) => v.value).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input
                  className="admin-input admin-input--sm"
                  placeholder="Tags"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                />
                <input
                  className="admin-input admin-input--sm"
                  placeholder="Từ khóa SEO"
                  value={uploadKeywords}
                  onChange={(e) => setUploadKeywords(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => void uploadAll()}
                  disabled={!pendingCount || !cmsReady}
                >
                  Tải lên {pendingCount > 0 ? `(${pendingCount})` : ""}
                </button>
                {duplicateCount > 0 && (
                  <>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => void reuseAllDuplicates()}
                    >
                      Dùng tất cả ảnh có sẵn
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={skipAllDuplicates}
                    >
                      Bỏ qua tất cả trùng
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => void uploadAllDuplicatesAnyway()}
                      disabled={!cmsReady}
                    >
                      Vẫn tải tất cả
                    </button>
                  </>
                )}
                <button type="button" className="admin-btn admin-btn--secondary" onClick={clearQueue}>
                  Xóa danh sách
                </button>
              </div>
            </div>
            <details className="admin-field" style={{ marginTop: 8 }}>
              <summary className="admin-label" style={{ cursor: "pointer" }}>
                Metadata nâng cao
              </summary>
              <div style={{ marginTop: 8 }}>
                <label className="admin-label">Bộ sưu tập</label>
                {renderCollectionCheckboxes(collections, uploadCollectionIds, toggleUploadCollection)}
              </div>
              <div className="admin-field" style={{ marginTop: 8 }}>
                <label className="admin-label">Loại tài sản (mặc định cho cả lô)</label>
                <select
                  className="admin-input admin-input--sm"
                  value={uploadAssetType}
                  onChange={(e) => setUploadAssetType(e.target.value as MediaAssetType)}
                >
                  {ASSET_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {SEMANTIC_FIELDS.map((field) =>
                renderSemanticTermPicker(
                  field,
                  uploadSemantic[field],
                  (name) => toggleUploadSemanticTerm(field, name),
                  uploadVocabSearch[field] ?? "",
                  (value) => setUploadVocabSearch((prev) => ({ ...prev, [field]: value })),
                ),
              )}
              <div className="admin-field" style={{ marginTop: 8 }}>
                <label className="admin-label">Phù hợp nội dung (mặc định cho cả lô)</label>
                {renderContentSuitabilityPicker(
                  uploadContentSuitabilities,
                  toggleUploadContentSuitability,
                  uploadSuitabilitySearch,
                  setUploadSuitabilitySearch,
                )}
              </div>
            </details>
            <div className="admin-media-queue-list">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className={`admin-media-queue-item status-${item.status}`}
                  style={{ flexDirection: "column", alignItems: "stretch" }}
                >
                <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                  {item.status === "duplicate" && item.duplicateAsset && (
                    <div className="admin-media-preview" style={{ width: 48, height: 48, flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.duplicateAsset.thumbnailUrl ?? item.duplicateAsset.url}
                        alt={item.duplicateAsset.filename}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  )}
                  <span className="admin-media-queue-name">{item.file.name}</span>
                  <span className="admin-media-queue-size">({(item.file.size / 1024).toFixed(0)}KB)</span>
                  <span className="admin-media-queue-status">
                    {item.status === "checking" && <InlineLoading title="Đang kiểm tra trùng…" tone="admin" />}
                    {item.status === "uploading" && <InlineLoading title="Đang tải…" tone="admin" />}
                    {item.status === "done" && (item.reused ? "✅ Đã dùng ảnh có sẵn" : "✅ Xong")}
                    {item.status === "pending" && "⏸ Chờ"}
                    {item.status === "warn" && `⚠ ${item.warning}`}
                    {item.status === "error" && `❌ ${item.error}`}
                    {item.status === "duplicate" && item.duplicateAsset && (
                      <>⚠ Trùng: {item.duplicateAsset.filename}</>
                    )}
                  </span>
                  {item.status === "duplicate" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexWrap: "wrap" }}>
                      <label className="admin-field-hint" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={item.mergeIntoExisting ?? false}
                          onChange={() => toggleMergeIntoExisting(item.id)}
                        />
                        Thêm metadata đã chọn vào ảnh có sẵn
                      </label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary admin-btn--xs"
                          onClick={() => void reuseDuplicateItem(item.id)}
                        >
                          Dùng ảnh đã có
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() =>
                            void uploadSingleItem(item, true, item.mergeIntoExisting).then(() => load())
                          }
                          disabled={!cmsReady}
                        >
                          Vẫn tải ảnh mới
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => skipDuplicateItem(item.id)}
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </div>
                  )}
                  {(item.status === "pending" || item.status === "warn") && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => toggleItemOverridesOpen(item.id)}
                    >
                      {item.overridesOpen ? "Ẩn tùy chỉnh" : "Tùy chỉnh"}
                    </button>
                  )}
                  {(item.status === "pending" || item.status === "warn" || item.status === "error") && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => removeFromQueue(item.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {item.overridesOpen && (item.status === "pending" || item.status === "warn") && (
                  <div
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: "1px solid #e5e7eb",
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <p className="admin-field-hint" style={{ margin: 0 }}>
                      Ghi đè metadata cho riêng ảnh này (bỏ trống để dùng mặc định của cả lô).
                    </p>
                    <select
                      className="admin-input admin-input--sm"
                      value={item.overrides?.assetType ?? ""}
                      onChange={(e) =>
                        setItemOverrideAssetType(item.id, e.target.value as MediaAssetType)
                      }
                    >
                      <option value="">Loại tài sản: dùng mặc định ({ASSET_TYPE_LABELS[uploadAssetType]})</option>
                      {ASSET_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {SEMANTIC_FIELDS.map((field) => {
                      const selected = item.overrides?.[field] ?? uploadSemantic[field];
                      const options = vocabTermsForType(SEMANTIC_FIELD_TO_VOCAB_TYPE[field]);
                      if (!options.length) return null;
                      return (
                        <div key={field}>
                          <p className="admin-field-hint" style={{ margin: "0 0 2px", fontWeight: 500 }}>
                            {SEMANTIC_FIELD_LABELS[field]}
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {options.map((term) => (
                              <label
                                key={term.id}
                                className="admin-field-hint"
                                style={{ display: "flex", alignItems: "center", gap: 4, margin: 0 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.includes(term.name)}
                                  onChange={() => toggleItemOverrideTerm(item.id, field, term.name)}
                                />
                                {term.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div>
                      <p className="admin-field-hint" style={{ margin: "0 0 2px", fontWeight: 500 }}>
                        Phù hợp nội dung
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {MEDIA_CONTENT_SUITABILITIES.map((value) => {
                          const selected =
                            item.overrides?.contentSuitabilities ?? uploadContentSuitabilities;
                          return (
                            <label
                              key={value}
                              className="admin-field-hint"
                              style={{ display: "flex", alignItems: "center", gap: 4, margin: 0 }}
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(value)}
                                onChange={() => toggleItemOverrideSuitability(item.id, value)}
                              />
                              {MEDIA_CONTENT_SUITABILITY_LABELS[value]}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="admin-catalog-filters" style={{ flexWrap: "wrap" }}>
        <input
          className="admin-input"
          placeholder="Tìm tên ảnh, tiêu đề, alt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <select className="admin-input" value={libraryId} onChange={(e) => setLibraryId(e.target.value)}>
          <option value="">Tất cả thư viện</option>
          {libraries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="admin-input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {roles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
        >
          <option value="">Tất cả bộ sưu tập</option>
          {collections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as MediaVisibility | "")}
        >
          {VISIBILITY_OPTIONS.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as MediaOrientation | "")}
        >
          {ORIENTATION_OPTIONS.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={hasAltText}
          onChange={(e) => setHasAltText(e.target.value as "" | "true" | "false")}
        >
          <option value="">Alt text: tất cả</option>
          <option value="true">Có alt text</option>
          <option value="false">Thiếu alt text</option>
        </select>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
          Lọc
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          onClick={() => setShowIntelligenceFilters((v) => !v)}
        >
          {showIntelligenceFilters ? "Ẩn bộ lọc Asset Intelligence" : "Bộ lọc Asset Intelligence"}
        </button>
        <span className="admin-field-hint">{displayedAssets.length} ảnh</span>
        {displayedAssets.length > 0 && (
          <>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => (allLoadedSelected ? clearSelection() : selectAllLoaded())}
            >
              {allLoadedSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            {selectedCount > 0 && (
              <>
                <span className="admin-field-hint">{selectedCount} đã chọn</span>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={clearSelection}
                >
                  Xóa chọn
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--xs"
                  onClick={openBulkEdit}
                  disabled={selectedCount > BULK_MAX}
                >
                  Sửa hàng loạt
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  disabled={selectedCount > BULK_MAX || bulkSaving}
                  onClick={() => {
                    void (async () => {
                      setBulkSaving(true);
                      try {
                        const res = await fetch("/api/media/intelligence/bulk-review", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            mediaAssetIds: [...selectedIds],
                            applySuggestions: true,
                          }),
                        });
                        const data = (await res.json()) as { message?: string; reviewed?: number };
                        if (!res.ok) {
                          toast.error(data.message ?? "Bulk review thất bại");
                          return;
                        }
                        toast.success(`Đã xác nhận metadata ${data.reviewed ?? selectedIds.size} ảnh`);
                        clearSelection();
                        await load();
                      } catch {
                        toast.error("Lỗi kết nối bulk review");
                      } finally {
                        setBulkSaving(false);
                      }
                    })();
                  }}
                >
                  Duyệt metadata gợi ý
                </button>
              </>
            )}
          </>
        )}
      </div>

      {showIntelligenceFilters && (
        <div className="admin-catalog-filters" style={{ flexWrap: "wrap" }}>
          <select
            className="admin-input"
            value={filterAssetType}
            onChange={(e) => setFilterAssetType(e.target.value as MediaAssetType | "")}
          >
            <option value="">Tất cả loại tài sản</option>
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filterSeoReadiness}
            onChange={(e) => setFilterSeoReadiness(e.target.value as MediaSeoReadinessStatus | "")}
          >
            {SEO_READINESS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            className="admin-input"
            type="number"
            min={0}
            max={100}
            placeholder="Điểm SEO tối thiểu"
            value={filterMinimumSeoScore}
            onChange={(e) => setFilterMinimumSeoScore(e.target.value)}
            style={{ width: 140 }}
          />
          <select
            className="admin-input"
            value={filterHasTitle}
            onChange={(e) => setFilterHasTitle(e.target.value as "" | "true" | "false")}
          >
            <option value="">Tiêu đề: tất cả</option>
            <option value="true">Có tiêu đề</option>
            <option value="false">Thiếu tiêu đề</option>
          </select>
          <select
            className="admin-input"
            value={filterHasKeywords}
            onChange={(e) => setFilterHasKeywords(e.target.value as "" | "true" | "false")}
          >
            <option value="">Từ khóa SEO: tất cả</option>
            <option value="true">Có từ khóa</option>
            <option value="false">Thiếu từ khóa</option>
          </select>
          <select
            className="admin-input"
            value={filterHasSubject}
            onChange={(e) => setFilterHasSubject(e.target.value as "" | "true" | "false")}
          >
            <option value="">Chủ thể: tất cả</option>
            <option value="true">Có chủ thể</option>
            <option value="false">Thiếu chủ thể</option>
          </select>
          <select
            className="admin-input"
            value={filterAiStatus}
            onChange={(e) => setFilterAiStatus(e.target.value as MediaAiProcessingStatus | "")}
          >
            {AI_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filterContentSuitability}
            onChange={(e) =>
              setFilterContentSuitability(e.target.value as MediaContentSuitability | "")
            }
          >
            <option value="">Phù hợp nội dung: tất cả</option>
            {MEDIA_CONTENT_SUITABILITIES.map((value) => (
              <option key={value} value={value}>
                {MEDIA_CONTENT_SUITABILITY_LABELS[value]}
              </option>
            ))}
          </select>
          {(filterAssetType ||
            filterSeoReadiness ||
            filterMinimumSeoScore ||
            filterHasTitle ||
            filterHasKeywords ||
            filterHasSubject ||
            filterAiStatus ||
            filterContentSuitability ||
            activePreset) && (
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => {
                setFilterAssetType("");
                setFilterSeoReadiness("");
                setFilterMinimumSeoScore("");
                setFilterHasTitle("");
                setFilterHasKeywords("");
                setFilterHasSubject("");
                setFilterAiStatus("");
                setFilterContentSuitability("");
                setActivePreset("");
              }}
            >
              Xóa bộ lọc
            </button>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%" }}>
            {MEDIA_INTELLIGENCE_QUICK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`admin-btn admin-btn--xs ${activePreset === preset ? "admin-btn--primary" : "admin-btn--secondary"}`}
                onClick={() => setActivePreset((prev) => (prev === preset ? "" : preset))}
              >
                {MEDIA_INTELLIGENCE_QUICK_PRESET_LABELS[preset]}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <CardGridLoading title="Đang tải thư viện ảnh…" tone="admin" cards={8} />
      ) : displayedAssets.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có ảnh trong bộ lọc này.</p>
        </div>
      ) : (
        <div className="admin-media-grid">
          {displayedAssets.map((asset) => {
            const isSelected = selectedIds.has(asset.id);
            return (
              <div
                key={asset.id}
                className={`admin-media-card ${isSelected ? "is-selected" : ""}`}
                style={isSelected ? { outline: "2px solid #4f46e5", borderColor: "#4f46e5" } : undefined}
              >
                <label
                  className="admin-field-hint"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px 0",
                    margin: 0,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(asset.id)}
                  />
                  Chọn
                </label>
                <div className="admin-media-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.thumbnailUrl ?? asset.url}
                    alt={asset.altText ?? asset.filename}
                    loading="lazy"
                  />
                </div>
                <div className="admin-media-meta">
                  <p className="admin-media-filename" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="admin-field-hint" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="admin-badge"
                      style={{
                        cursor: "pointer",
                        border: "none",
                        background: referenceCounts[asset.id] ? "#fef3c7" : "#f3f4f6",
                      }}
                      onClick={() => void openUsageReferences(asset)}
                      title="Xem nơi đang sử dụng"
                    >
                      {usageBadgeLabel(referenceCounts[asset.id])}
                    </button>
                    {asset.library && (
                      <span className="admin-badge">{asset.library.name}</span>
                    )}
                    {asset.role && <span className="admin-badge">{asset.role.name}</span>}
                    {assetCollections(asset).map((col) => (
                      <span key={col.id} className="admin-badge">
                        {col.name}
                      </span>
                    ))}
                    <span className="admin-badge">{asset.orientation}</span>
                    {asset.visibility !== "PUBLIC" && (
                      <span className="admin-badge">{asset.visibility}</span>
                    )}
                    <span className="admin-badge">SEO {asset.seoScore ?? 0}</span>
                  </p>
                  <div className="admin-media-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => void copyUrl(asset.url, asset.id)}
                    >
                      {copied === asset.id ? "✓ Đã copy" : "Sao chép URL"}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => openEdit(asset)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      style={{ color: "#dc2626" }}
                      onClick={() => void handleDelete(asset.id, asset.filename)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="admin-modal-overlay" onClick={() => !editSaving && setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">Chỉnh sửa ảnh</h3>
            <p className="admin-field-hint">
              Thay đổi metadata không làm thay đổi URL hoặc file đã tải lên.
            </p>
            <div className="admin-field">
              <label className="admin-label">Thư viện</label>
              <select
                className="admin-input"
                value={editing.libraryId}
                onChange={(e) => setEditing({ ...editing, libraryId: e.target.value })}
                disabled={editSaving}
              >
                {editLibraryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Vai trò hiển thị</label>
              <select
                className="admin-input"
                value={editing.roleId}
                onChange={(e) => setEditing({ ...editing, roleId: e.target.value })}
                disabled={editSaving}
              >
                {editRoleOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Mức độ hiển thị</label>
              <select
                className="admin-input"
                value={editing.visibility}
                onChange={(e) =>
                  setEditing({ ...editing, visibility: e.target.value as MediaVisibility })
                }
                disabled={editSaving}
              >
                {VISIBILITY_OPTIONS.filter((v) => v.value).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Alt text</label>
              <input
                className="admin-input"
                value={editing.altText}
                onChange={(e) => setEditing({ ...editing, altText: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tiêu đề ảnh</label>
              <input
                className="admin-input"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Chú thích</label>
              <input
                className="admin-input"
                value={editing.caption}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mô tả</label>
              <textarea
                className="admin-input"
                rows={3}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tags</label>
              <input
                className="admin-input"
                value={editing.tags}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Từ khóa SEO</label>
              <input
                className="admin-input"
                value={editing.keywords}
                onChange={(e) => setEditing({ ...editing, keywords: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ngôn ngữ nội dung</label>
              <input
                className="admin-input"
                value={editing.contentLanguage}
                onChange={(e) => setEditing({ ...editing, contentLanguage: e.target.value })}
                placeholder="vi"
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Bộ sưu tập</label>
              {renderCollectionCheckboxes(
                editCollectionOptions,
                editing.collectionIds,
                toggleEditCollection,
                editSaving,
              )}
            </div>

            <div className="admin-field">
              <p className="admin-label" style={{ marginBottom: 6 }}>
                Sức khỏe metadata (Asset health)
              </p>
              <p className="admin-field-hint" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: 0 }}>
                <span className="admin-badge">SEO {editing.seoScore ?? 0}</span>
                <span className="admin-badge">
                  {MEDIA_SEO_READINESS_LABELS[editing.seoReadinessStatus] ??
                    editing.seoReadinessStatus ??
                    "Chưa hoàn thiện"}
                </span>
                <span className="admin-badge">Đầy đủ {editing.metadataCompleteness ?? 0}%</span>
              </p>
              {(editing.missingFields ?? []).length > 0 && (
                <p className="admin-field-hint" style={{ marginTop: 4 }}>
                  Còn thiếu:{" "}
                  {(editing.missingFields ?? [])
                    .map((key) => MISSING_FIELD_LABELS[key] ?? key)
                    .join(", ")}
                </p>
              )}
            </div>

            <details
              className="admin-field"
              open={intelligenceOpen}
              onToggle={(e) => setIntelligenceOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="admin-label" style={{ cursor: "pointer" }}>
                Asset Intelligence (loại ảnh &amp; thuật ngữ mô tả)
              </summary>
              <div style={{ marginTop: 8 }}>
                <div className="admin-field">
                  <label className="admin-label">Loại tài sản</label>
                  <select
                    className="admin-input"
                    value={editing.assetType}
                    onChange={(e) =>
                      setEditing({ ...editing, assetType: e.target.value as MediaAssetType })
                    }
                    disabled={editSaving}
                  >
                    {ASSET_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {SEMANTIC_FIELDS.map((field) =>
                  renderSemanticTermPicker(
                    field,
                    editing.semantic?.[field] ?? [],
                    (name) => toggleEditSemanticTerm(field, name),
                    editVocabSearch[field] ?? "",
                    (value) =>
                      setEditVocabSearch((prev) => ({
                        ...emptySemanticSearchState(),
                        ...prev,
                        [field]: value,
                      })),
                    editSaving,
                  ),
                )}
                <div className="admin-field" style={{ marginBottom: 10 }}>
                  <label className="admin-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Phù hợp nội dung (content suitability)
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={applySuggestedSuitabilities}
                      disabled={editSaving}
                    >
                      Gợi ý theo vai trò hiện tại
                    </button>
                  </label>
                  {renderContentSuitabilityPicker(
                    editing.contentSuitabilities,
                    toggleEditContentSuitability,
                    editSuitabilitySearch,
                    setEditSuitabilitySearch,
                    editSaving,
                  )}
                </div>
              </div>
            </details>

            <div className="admin-field">
              <label className="admin-label">Nơi đang sử dụng</label>
              {editReferencesLoading ? (
                <InlineLoading title="Đang tải…" tone="admin" />
              ) : (
                renderReferencesList(editReferences ?? [])
              )}
            </div>
            {editError && (
              <p className="admin-field-hint" style={{ color: "#dc2626" }} role="alert">
                {editError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => void saveEdit()}
                disabled={editSaving}
              >
                {editSaving ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setEditing(null)}
                disabled={editSaving}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="admin-modal-overlay" onClick={() => !bulkSaving && setBulkOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">Sửa metadata hàng loạt ({selectedCount} ảnh)</h3>
            <p className="admin-field-hint">
              Chỉ các trường được bật bên dưới mới được cập nhật. URL và file vật lý không thay đổi.
            </p>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateLibrary}
                  onChange={(e) => setBulkUpdateLibrary(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật thư viện
              </label>
              {bulkUpdateLibrary && (
                <select
                  className="admin-input"
                  value={bulkLibraryId}
                  onChange={(e) => setBulkLibraryId(e.target.value)}
                  disabled={bulkSaving}
                >
                  {libraries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateRole}
                  onChange={(e) => setBulkUpdateRole(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật vai trò hiển thị
              </label>
              {bulkUpdateRole && (
                <select
                  className="admin-input"
                  value={bulkRoleId}
                  onChange={(e) => setBulkRoleId(e.target.value)}
                  disabled={bulkSaving}
                >
                  {roles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateVisibility}
                  onChange={(e) => setBulkUpdateVisibility(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật mức độ hiển thị
              </label>
              {bulkUpdateVisibility && (
                <select
                  className="admin-input"
                  value={bulkVisibility}
                  onChange={(e) => setBulkVisibility(e.target.value as MediaVisibility)}
                  disabled={bulkSaving}
                >
                  {VISIBILITY_OPTIONS.filter((v) => v.value).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateTags}
                  onChange={(e) => setBulkUpdateTags(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật tags
              </label>
              {bulkUpdateTags && (
                <input
                  className="admin-input"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                  disabled={bulkSaving}
                />
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateKeywords}
                  onChange={(e) => setBulkUpdateKeywords(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật từ khóa SEO
              </label>
              {bulkUpdateKeywords && (
                <input
                  className="admin-input"
                  value={bulkKeywords}
                  onChange={(e) => setBulkKeywords(e.target.value)}
                  disabled={bulkSaving}
                />
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkAddCollections}
                  onChange={(e) => setBulkAddCollections(e.target.checked)}
                  disabled={bulkSaving}
                />
                Thêm vào bộ sưu tập
              </label>
              {bulkAddCollections &&
                renderCollectionCheckboxes(
                  collections,
                  bulkAddCollectionIds,
                  (id) => toggleBulkCollection(bulkAddCollectionIds, setBulkAddCollectionIds, id),
                  bulkSaving,
                )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkRemoveCollections}
                  onChange={(e) => setBulkRemoveCollections(e.target.checked)}
                  disabled={bulkSaving}
                />
                Gỡ khỏi bộ sưu tập
              </label>
              {bulkRemoveCollections &&
                renderCollectionCheckboxes(
                  collections,
                  bulkRemoveCollectionIds,
                  (id) => toggleBulkCollection(bulkRemoveCollectionIds, setBulkRemoveCollectionIds, id),
                  bulkSaving,
                )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateAssetType}
                  onChange={(e) => setBulkUpdateAssetType(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật loại tài sản
              </label>
              {bulkUpdateAssetType && (
                <select
                  className="admin-input"
                  value={bulkAssetType}
                  onChange={(e) => setBulkAssetType(e.target.value as MediaAssetType)}
                  disabled={bulkSaving}
                >
                  {ASSET_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <details className="admin-field">
              <summary className="admin-label" style={{ cursor: "pointer" }}>
                Thêm / gỡ thuật ngữ mô tả (Asset Intelligence)
              </summary>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
                {SEMANTIC_FIELDS.map((field) => (
                  <div key={field} className="admin-field" style={{ margin: 0 }}>
                    <p className="admin-label" style={{ marginBottom: 4 }}>
                      {SEMANTIC_FIELD_LABELS[field]}
                    </p>
                    <label
                      className="admin-field-hint"
                      style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}
                    >
                      <input
                        type="checkbox"
                        checked={bulkSemantic[field].addEnabled}
                        onChange={(e) =>
                          setBulkSemantic((prev) => ({
                            ...prev,
                            [field]: { ...prev[field], addEnabled: e.target.checked },
                          }))
                        }
                        disabled={bulkSaving}
                      />
                      Thêm {SEMANTIC_FIELD_LABELS[field].toLowerCase()}
                    </label>
                    {bulkSemantic[field].addEnabled &&
                      renderVocabNameCheckboxes(
                        field,
                        bulkSemantic[field].add,
                        (name) => toggleBulkSemanticTerm(field, "add", name),
                        bulkSaving,
                      )}
                    <label
                      className="admin-field-hint"
                      style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 4px" }}
                    >
                      <input
                        type="checkbox"
                        checked={bulkSemantic[field].removeEnabled}
                        onChange={(e) =>
                          setBulkSemantic((prev) => ({
                            ...prev,
                            [field]: { ...prev[field], removeEnabled: e.target.checked },
                          }))
                        }
                        disabled={bulkSaving}
                      />
                      Gỡ {SEMANTIC_FIELD_LABELS[field].toLowerCase()}
                    </label>
                    {bulkSemantic[field].removeEnabled &&
                      renderVocabNameCheckboxes(
                        field,
                        bulkSemantic[field].remove,
                        (name) => toggleBulkSemanticTerm(field, "remove", name),
                        bulkSaving,
                      )}
                  </div>
                ))}
              </div>
            </details>
            <details className="admin-field">
              <summary className="admin-label" style={{ cursor: "pointer" }}>
                Thêm / gỡ phù hợp nội dung (content suitability)
              </summary>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label
                    className="admin-field-hint"
                    style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}
                  >
                    <input
                      type="checkbox"
                      checked={bulkAddSuitabilities}
                      onChange={(e) => setBulkAddSuitabilities(e.target.checked)}
                      disabled={bulkSaving}
                    />
                    Thêm phù hợp nội dung
                  </label>
                  {bulkAddSuitabilities &&
                    renderContentSuitabilityPicker(
                      bulkAddSuitabilityValues,
                      (value) =>
                        setBulkAddSuitabilityValues((prev) =>
                          prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
                        ),
                      bulkAddSuitabilitySearch,
                      setBulkAddSuitabilitySearch,
                      bulkSaving,
                    )}
                </div>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label
                    className="admin-field-hint"
                    style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}
                  >
                    <input
                      type="checkbox"
                      checked={bulkRemoveSuitabilities}
                      onChange={(e) => setBulkRemoveSuitabilities(e.target.checked)}
                      disabled={bulkSaving}
                    />
                    Gỡ phù hợp nội dung
                  </label>
                  {bulkRemoveSuitabilities &&
                    renderContentSuitabilityPicker(
                      bulkRemoveSuitabilityValues,
                      (value) =>
                        setBulkRemoveSuitabilityValues((prev) =>
                          prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
                        ),
                      bulkRemoveSuitabilitySearch,
                      setBulkRemoveSuitabilitySearch,
                      bulkSaving,
                    )}
                </div>
              </div>
            </details>
            {bulkError && (
              <p className="admin-field-hint" style={{ color: "#dc2626" }} role="alert">
                {bulkError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => void saveBulkEdit()}
                disabled={bulkSaving}
              >
                {bulkSaving ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setBulkOpen(false)}
                disabled={bulkSaving}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {refsModalAsset && (
        <div className="admin-modal-overlay" onClick={() => setRefsModalAsset(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">Nơi đang sử dụng</h3>
            <p className="admin-field-hint">{refsModalAsset.filename}</p>
            {refsModalLoading ? (
              <InlineLoading title="Đang tải…" tone="admin" />
            ) : (
              renderReferencesList(refsModalItems)
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setRefsModalAsset(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteBlocked && (
        <div className="admin-modal-overlay" onClick={() => setDeleteBlocked(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">Không thể xóa ảnh</h3>
            <p className="admin-field-hint" style={{ color: "#dc2626" }} role="alert">
              {deleteBlocked.message}
            </p>
            <p className="admin-field-hint">
              Ảnh &quot;{deleteBlocked.filename}&quot; đang được sử dụng ở {deleteBlocked.references.length} nơi.
            </p>
            {deleteBlocked.loadingRefs ? (
              <InlineLoading title="Đang tải…" tone="admin" />
            ) : deleteBlocked.references.length > 0 ? (
              renderReferencesList(deleteBlocked.references)
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => void loadDeleteBlockedReferences()}
              >
                Xem nơi đang sử dụng
              </button>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setDeleteBlocked(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
