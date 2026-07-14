"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { MediaOrientation, MediaVisibility } from "@prisma/client";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
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

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const WARN_FILE_SIZE = 500 * 1024;
const MAX_BATCH = 50;
const BULK_MAX = 100;

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
  OTHER: "Khác",
};

type UploadFile = {
  file: File;
  id: string;
  status: "pending" | "checking" | "uploading" | "done" | "error" | "warn" | "duplicate";
  warning?: string;
  error?: string;
  result?: MediaAssetWithClassification;
  duplicateAsset?: DuplicateAssetSummary;
  reused?: boolean;
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

export default function MediaLibraryClient({ cmsReady = true }: { cmsReady?: boolean }) {
  const toast = useAdminToast();
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
  const [uploadLibraryId, setUploadLibraryId] = useState("");
  const [uploadRoleId, setUploadRoleId] = useState("");
  const [uploadVisibility, setUploadVisibility] = useState<MediaVisibility>("PUBLIC");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadKeywords, setUploadKeywords] = useState("");
  const [uploadCollectionIds, setUploadCollectionIds] = useState<string[]>([]);
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
      /* ignore taxonomy load errors */
    }
  }, []);

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
  }, [libraryId, roleId, collectionId, visibility, orientation, hasAltText, search, loadReferenceCounts]);

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

  function buildUploadFormData(item: UploadFile, forceDuplicateUpload = false): FormData {
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

  async function uploadSingleItem(item: UploadFile, forceDuplicateUpload = false) {
    setUploadQueue((q) => q.map((u) => (u.id === item.id ? { ...u, status: "uploading" } : u)));
    const fd = buildUploadFormData(item, forceDuplicateUpload);
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

  function reuseDuplicateItem(itemId: string) {
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

  function reuseAllDuplicates() {
    const duplicateIds = uploadQueue.filter((u) => u.status === "duplicate").map((u) => u.id);
    for (const id of duplicateIds) reuseDuplicateItem(id);
  }

  function skipAllDuplicates() {
    setUploadQueue((q) => q.filter((u) => u.status !== "duplicate"));
  }

  async function uploadAllDuplicatesAnyway() {
    const duplicates = uploadQueue.filter((u) => u.status === "duplicate");
    for (const item of duplicates) {
      await uploadSingleItem(item, true);
    }
    await load();
  }

  function toggleUploadCollection(id: string) {
    setUploadCollectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
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
    setEditing({
      id: asset.id,
      libraryId: asset.libraryId ?? "",
      roleId: asset.roleId ?? "",
      visibility: asset.visibility,
      altText: asset.altText ?? "",
      title: asset.title ?? "",
      caption: asset.caption ?? "",
      description: asset.description ?? "",
      tags: (asset.tags ?? []).join(", "),
      keywords: (asset.keywords ?? []).join(", "),
      contentLanguage: asset.contentLanguage ?? "",
      collectionIds: assetCollections(asset).map((col) => col.id),
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
          collectionIds: editing.collectionIds,
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
    setSelectedIds(new Set(assets.map((asset) => asset.id)));
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
    setBulkOpen(true);
  }

  async function saveBulkEdit() {
    if (bulkSaving || selectedIds.size === 0) return;
    if (
      !bulkUpdateLibrary &&
      !bulkUpdateRole &&
      !bulkUpdateVisibility &&
      !bulkUpdateTags &&
      !bulkUpdateKeywords &&
      !bulkAddCollections &&
      !bulkRemoveCollections
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
  const allLoadedSelected = assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id));

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

  return (
    <div className="admin-media-page">
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
                      onClick={reuseAllDuplicates}
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
            </details>
            <div className="admin-media-queue-list">
              {uploadQueue.map((item) => (
                <div key={item.id} className={`admin-media-queue-item status-${item.status}`}>
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
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary admin-btn--xs"
                        onClick={() => reuseDuplicateItem(item.id)}
                      >
                        Dùng ảnh đã có
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => void uploadSingleItem(item, true).then(() => load())}
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
        <span className="admin-field-hint">{assets.length} ảnh</span>
        {assets.length > 0 && (
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
              </>
            )}
          </>
        )}
      </div>

      {loading ? (
        <CardGridLoading title="Đang tải thư viện ảnh…" tone="admin" cards={8} />
      ) : assets.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có ảnh trong bộ lọc này.</p>
        </div>
      ) : (
        <div className="admin-media-grid">
          {assets.map((asset) => {
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
