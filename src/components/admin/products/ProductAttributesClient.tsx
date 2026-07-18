"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AttributePresetDialog from "@/components/admin/products/AttributePresetDialog";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { useAdminAction } from "@/hooks/useAdminAction";
import {
  ATTRIBUTE_VALUE_DUPLICATE_MESSAGE,
  isColorAttribute,
  isValidHexColor,
  suggestAttributeColorCode,
  suggestColorHex,
} from "@/features/products/attribute-color-utils";

type DisplayType = "TEXT" | "COLOR_SWATCH" | "SIZE" | "SELECT" | "IMAGE_SWATCH";
type Status = "ACTIVE" | "INACTIVE";

const DISPLAY_TYPE_LABELS: Record<DisplayType, string> = {
  TEXT: "text",
  COLOR_SWATCH: "color swatch",
  SIZE: "size",
  SELECT: "select",
  IMAGE_SWATCH: "image swatch",
};

const CODE_SLUG_LOCKED_HINT =
  "Mã không thể thay đổi vì thuộc tính này đang được sử dụng trong sản phẩm, biến thể hoặc dữ liệu liên quan.";

const UNSAVED_INLINE_CONFIRM = "Bạn có muốn bỏ thay đổi chưa lưu?";

type AttributeValue = {
  id: string;
  name: string;
  code: string;
  slug: string;
  hexCode: string | null;
  imageUrl: string | null;
  status: Status;
  sortOrder: number;
  usageCount: number;
  isReferenced: boolean;
};

type Attribute = {
  id: string;
  name: string;
  code: string;
  slug: string;
  displayType: DisplayType;
  isVariantAttribute: boolean;
  isSpecificationAttribute: boolean;
  status: Status;
  sortOrder: number;
  note: string | null;
  usageCount: number;
  isReferenced: boolean;
  values: AttributeValue[];
};

type AttributeForm = {
  name: string;
  code: string;
  slug: string;
  displayType: DisplayType;
  isVariantAttribute: boolean;
  isSpecificationAttribute: boolean;
  status: Status;
  sortOrder: string;
  note: string;
};

type ValueForm = {
  attributeId: string;
  name: string;
  code: string;
  slug: string;
  hexCode: string;
  imageUrl: string;
  status: Status;
  sortOrder: string;
};

type InlineAttributeDraft = {
  name: string;
  note: string;
  displayType: DisplayType;
  isVariantAttribute: boolean;
  isSpecificationAttribute: boolean;
  sortOrder: string;
  status: Status;
  code: string;
  slug: string;
  isReferenced: boolean;
};

type InlineValueDraft = {
  name: string;
  hexCode: string;
  imageUrl: string;
  sortOrder: string;
  status: Status;
  code: string;
  slug: string;
  isReferenced: boolean;
};

type ApiAttributePatch = {
  id: string;
  name: string;
  code: string;
  slug: string;
  displayType: DisplayType;
  isVariantAttribute: boolean;
  isSpecificationAttribute: boolean;
  status: Status;
  sortOrder: number;
  note: string | null;
};

type ApiValuePatch = {
  id: string;
  name: string;
  code: string;
  slug: string;
  hexCode: string | null;
  imageUrl: string | null;
  status: Status;
  sortOrder: number;
};

const defaultAttributeForm = (): AttributeForm => ({
  name: "",
  code: "",
  slug: "",
  displayType: "TEXT",
  isVariantAttribute: true,
  isSpecificationAttribute: false,
  status: "ACTIVE",
  sortOrder: "0",
  note: "",
});

const defaultValueForm = (attributeId = ""): ValueForm => ({
  attributeId,
  name: "",
  code: "",
  slug: "",
  hexCode: "",
  imageUrl: "",
  status: "ACTIVE",
  sortOrder: "0",
});

type QuickAddDraft = {
  name: string;
  code: string;
  hexCode: string;
  imageUrl: string;
  sortOrder: string;
  status: Status;
  codeTouched: boolean;
  hexTouched: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
};

function defaultQuickAddDraft(sortOrder = "0"): QuickAddDraft {
  return {
    name: "",
    code: "",
    hexCode: "",
    imageUrl: "",
    sortOrder,
    status: "ACTIVE",
    codeTouched: false,
    hexTouched: false,
    error: null,
    fieldErrors: {},
  };
}

function errorClass(fieldErrors: Record<string, string>, field: string) {
  return fieldErrors[field] ? " admin-input--error" : "";
}

function sortAttributes(list: Attribute[]): Attribute[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
}

function sortValues(list: AttributeValue[]): AttributeValue[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
}

function inlineAttributeDraftFromAttribute(attribute: Attribute): InlineAttributeDraft {
  return {
    name: attribute.name,
    note: attribute.note ?? "",
    displayType: attribute.displayType,
    isVariantAttribute: attribute.isVariantAttribute,
    isSpecificationAttribute: attribute.isSpecificationAttribute,
    sortOrder: String(attribute.sortOrder),
    status: attribute.status,
    code: attribute.code,
    slug: attribute.slug,
    isReferenced: attribute.isReferenced,
  };
}

function inlineValueDraftFromValue(value: AttributeValue): InlineValueDraft {
  return {
    name: value.name,
    hexCode: value.hexCode ?? "",
    imageUrl: value.imageUrl ?? "",
    sortOrder: String(value.sortOrder),
    status: value.status,
    code: value.code,
    slug: value.slug,
    isReferenced: value.isReferenced,
  };
}

function draftsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ProductAttributesClient() {
  const { toast } = useAdminAction();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [attributeForm, setAttributeForm] = useState<AttributeForm>(defaultAttributeForm());
  const [valueForm, setValueForm] = useState<ValueForm>(defaultValueForm());
  const [isSavingCreateAttribute, setIsSavingCreateAttribute] = useState(false);
  const [isSavingCreateValue, setIsSavingCreateValue] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createAttributeFieldErrors, setCreateAttributeFieldErrors] = useState<Record<string, string>>({});
  const [createValueFieldErrors, setCreateValueFieldErrors] = useState<Record<string, string>>({});
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [showCreateAttribute, setShowCreateAttribute] = useState(false);
  const [showAdvancedValueForm, setShowAdvancedValueForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAttributeIds, setExpandedAttributeIds] = useState<Record<string, boolean>>({});
  const [quickAddDrafts, setQuickAddDrafts] = useState<Record<string, QuickAddDraft>>({});
  const [savingQuickAddId, setSavingQuickAddId] = useState<string | null>(null);
  const quickAddNameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [inlineAttributeEditId, setInlineAttributeEditId] = useState<string | null>(null);
  const [inlineAttributeDraft, setInlineAttributeDraft] = useState<InlineAttributeDraft | null>(null);
  const [inlineAttributeBaseline, setInlineAttributeBaseline] = useState<InlineAttributeDraft | null>(null);
  const [inlineAttributeFieldErrors, setInlineAttributeFieldErrors] = useState<Record<string, string>>({});
  const [inlineAttributeAdvancedId, setInlineAttributeAdvancedId] = useState<string | null>(null);
  const [savingAttributeId, setSavingAttributeId] = useState<string | null>(null);

  const [inlineValueEditId, setInlineValueEditId] = useState<string | null>(null);
  const [inlineValueAttributeId, setInlineValueAttributeId] = useState<string | null>(null);
  const [inlineValueDraft, setInlineValueDraft] = useState<InlineValueDraft | null>(null);
  const [inlineValueBaseline, setInlineValueBaseline] = useState<InlineValueDraft | null>(null);
  const [inlineValueFieldErrors, setInlineValueFieldErrors] = useState<Record<string, string>>({});
  const [inlineValueAdvancedId, setInlineValueAdvancedId] = useState<string | null>(null);
  const [savingValueId, setSavingValueId] = useState<string | null>(null);

  const attributeSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const valueFormRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("includeInactiveValues", "1");
      if (!showInactive) params.set("activeOnly", "1");
      const res = await fetch(`/api/admin/attributes?${params.toString()}`);
      const data = await res.json() as Attribute[];
      setAttributes(Array.isArray(data) ? sortAttributes(data) : []);
    } catch {
      setAttributes([]);
    }
    setLoading(false);
  }, [showInactive]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function focusAttribute(attributeId: string) {
    const section = attributeSectionRefs.current[attributeId];
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateAttributeInList(attributeId: string, updater: (attribute: Attribute) => Attribute) {
    setAttributes((previous) => sortAttributes(previous.map((attribute) => (
      attribute.id === attributeId ? updater(attribute) : attribute
    ))));
  }

  function updateValueInList(
    attributeId: string,
    valueId: string,
    updater: (value: AttributeValue) => AttributeValue,
  ) {
    updateAttributeInList(attributeId, (attribute) => ({
      ...attribute,
      values: sortValues(attribute.values.map((value) => (
        value.id === valueId ? updater(value) : value
      ))),
    }));
  }

  function clearInlineAttributeFieldError(field: string) {
    setInlineAttributeFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function clearInlineValueFieldError(field: string) {
    setInlineValueFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function closeInlineAttributeEdit() {
    setInlineAttributeEditId(null);
    setInlineAttributeDraft(null);
    setInlineAttributeBaseline(null);
    setInlineAttributeFieldErrors({});
    setInlineAttributeAdvancedId(null);
  }

  function closeInlineValueEdit() {
    setInlineValueEditId(null);
    setInlineValueAttributeId(null);
    setInlineValueDraft(null);
    setInlineValueBaseline(null);
    setInlineValueFieldErrors({});
    setInlineValueAdvancedId(null);
  }

  function isInlineAttributeDirty(): boolean {
    if (!inlineAttributeDraft || !inlineAttributeBaseline) return false;
    return !draftsEqual(inlineAttributeDraft, inlineAttributeBaseline);
  }

  function isInlineValueDirty(): boolean {
    if (!inlineValueDraft || !inlineValueBaseline) return false;
    return !draftsEqual(inlineValueDraft, inlineValueBaseline);
  }

  function openInlineAttributeEdit(attribute: Attribute) {
    if (inlineAttributeEditId && inlineAttributeEditId !== attribute.id) {
      if (isInlineAttributeDirty() && !window.confirm(UNSAVED_INLINE_CONFIRM)) return;
      closeInlineAttributeEdit();
    }
    const draft = inlineAttributeDraftFromAttribute(attribute);
    setInlineAttributeEditId(attribute.id);
    setInlineAttributeDraft(draft);
    setInlineAttributeBaseline(draft);
    setInlineAttributeFieldErrors({});
    setInlineAttributeAdvancedId(null);
  }

  function openInlineValueEdit(attribute: Attribute, value: AttributeValue) {
    if (inlineValueEditId && inlineValueEditId !== value.id) {
      if (isInlineValueDirty() && !window.confirm(UNSAVED_INLINE_CONFIRM)) return;
      closeInlineValueEdit();
    }
    const draft = inlineValueDraftFromValue(value);
    setInlineValueEditId(value.id);
    setInlineValueAttributeId(attribute.id);
    setInlineValueDraft(draft);
    setInlineValueBaseline(draft);
    setInlineValueFieldErrors({});
    setInlineValueAdvancedId(null);
  }

  function cancelInlineAttributeEdit() {
    if (isInlineAttributeDirty() && !window.confirm(UNSAVED_INLINE_CONFIRM)) return;
    closeInlineAttributeEdit();
  }

  function cancelInlineValueEdit() {
    if (isInlineValueDirty() && !window.confirm(UNSAVED_INLINE_CONFIRM)) return;
    closeInlineValueEdit();
  }

  function manageValues(attribute: Attribute) {
    setValueForm(defaultValueForm(attribute.id));
    setCreateValueFieldErrors({});
    setExpandedAttributeIds((current) => ({ ...current, [attribute.id]: true }));
    setQuickAddDrafts((current) => ({
      ...current,
      [attribute.id]:
        current[attribute.id] ??
        defaultQuickAddDraft(String(attribute.values.length)),
    }));
    window.setTimeout(() => {
      quickAddNameRefs.current[attribute.id]?.focus();
    }, 50);
  }

  function updateQuickAddDraft(attributeId: string, patch: Partial<QuickAddDraft>) {
    setQuickAddDrafts((current) => {
      const previous = current[attributeId] ?? defaultQuickAddDraft();
      return {
        ...current,
        [attributeId]: { ...previous, ...patch },
      };
    });
  }

  function onQuickAddNameChange(attribute: Attribute, name: string) {
    const previous = quickAddDrafts[attribute.id] ?? defaultQuickAddDraft();
    const isColor = isColorAttribute(attribute);
    const suggestedCode = isColor ? suggestAttributeColorCode(name) : previous.code;
    const nextCode = previous.codeTouched ? previous.code : suggestedCode;
    const nextHex =
      isColor && !previous.hexTouched
        ? suggestColorHex(nextCode || name)
        : previous.hexCode;
    updateQuickAddDraft(attribute.id, {
      name,
      code: nextCode,
      hexCode: nextHex,
      error: null,
      fieldErrors: {},
    });
  }

  async function submitQuickAdd(attribute: Attribute) {
    const draft = quickAddDrafts[attribute.id] ?? defaultQuickAddDraft();
    const name = draft.name.trim();
    if (!name) {
      updateQuickAddDraft(attribute.id, {
        fieldErrors: { name: "Tên hiển thị là bắt buộc." },
      });
      return;
    }
    if (isColorAttribute(attribute) && draft.hexCode.trim() && !isValidHexColor(draft.hexCode)) {
      updateQuickAddDraft(attribute.id, {
        fieldErrors: { hexCode: "Mã màu HEX không hợp lệ." },
      });
      return;
    }

    const duplicate = attribute.values.some(
      (value) =>
        value.name.trim().toLowerCase() === name.toLowerCase() ||
        (draft.code.trim() && value.code.trim().toUpperCase() === draft.code.trim().toUpperCase()),
    );
    if (duplicate) {
      updateQuickAddDraft(attribute.id, {
        error: ATTRIBUTE_VALUE_DUPLICATE_MESSAGE,
        fieldErrors: { name: ATTRIBUTE_VALUE_DUPLICATE_MESSAGE },
      });
      return;
    }

    setSavingQuickAddId(attribute.id);
    setError(null);
    try {
      const payload = {
        name,
        code: draft.code.trim() || undefined,
        hexCode: draft.hexCode.trim() || undefined,
        imageUrl: draft.imageUrl.trim() || undefined,
        status: draft.status,
        sortOrder: draft.sortOrder || String(attribute.values.length),
      };
      const res = await fetch(`/api/admin/attributes/${attribute.id}/values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | (ApiValuePatch & { message?: string; fieldErrors?: Record<string, string> })
        | null;
      if (!res.ok || !data) {
        const message =
          data?.fieldErrors?.name ||
          data?.fieldErrors?.code ||
          data?.message ||
          "Không thể lưu giá trị thuộc tính.";
        const isDuplicate =
          /đã tồn tại/i.test(message) ||
          Boolean(data?.fieldErrors?.name || data?.fieldErrors?.code);
        updateQuickAddDraft(attribute.id, {
          error: isDuplicate ? ATTRIBUTE_VALUE_DUPLICATE_MESSAGE : message,
          fieldErrors: data?.fieldErrors ?? { name: message },
        });
        return;
      }

      updateAttributeInList(attribute.id, (current) => ({
        ...current,
        values: sortValues([
          ...current.values,
          {
            id: data.id,
            name: data.name,
            code: data.code,
            slug: data.slug,
            hexCode: data.hexCode,
            imageUrl: data.imageUrl,
            status: data.status,
            sortOrder: data.sortOrder,
            usageCount: 0,
            isReferenced: false,
          },
        ]),
      }));
      setQuickAddDrafts((current) => ({
        ...current,
        [attribute.id]: defaultQuickAddDraft(String(attribute.values.length + 1)),
      }));
      setMessage("Đã tạo giá trị.");
      toast.success("Đã tạo giá trị.");
      window.setTimeout(() => quickAddNameRefs.current[attribute.id]?.focus(), 30);
    } catch {
      updateQuickAddDraft(attribute.id, {
        error: "Lỗi mạng hoặc lỗi không xác định khi lưu giá trị thuộc tính.",
      });
    } finally {
      setSavingQuickAddId(null);
    }
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredAttributes = attributes.filter((attribute) => {
    if (!normalizedSearch) return true;
    const haystack = [
      attribute.name,
      attribute.code,
      attribute.slug,
      ...attribute.values.map((value) => `${value.name} ${value.code}`),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  async function handlePresetSuccess(attributeId: string, successMessage: string) {
    setMessage(successMessage);
    setError(null);
    await load();
    window.setTimeout(() => focusAttribute(attributeId), 100);
  }

  async function handleCreateAttributeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateAttributeFieldErrors({});
    setError(null);
    if (!attributeForm.name.trim()) {
      setCreateAttributeFieldErrors({ name: "Tên thuộc tính là bắt buộc." });
      return;
    }

    setIsSavingCreateAttribute(true);
    try {
      const payload = {
        name: attributeForm.name.trim(),
        code: attributeForm.code.trim() || undefined,
        slug: attributeForm.slug.trim() || undefined,
        displayType: attributeForm.displayType,
        isVariantAttribute: attributeForm.isVariantAttribute,
        isSpecificationAttribute: attributeForm.isSpecificationAttribute,
        status: attributeForm.status,
        sortOrder: attributeForm.sortOrder,
        note: attributeForm.note.trim() || undefined,
      };

      const res = await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null) as ApiAttributePatch & { message?: string; fieldErrors?: Record<string, string> } | null;
      if (!res.ok || !data) {
        setCreateAttributeFieldErrors(data?.fieldErrors ?? {});
        setError(data?.message ?? "Không thể lưu thuộc tính.");
        return;
      }

      setAttributes((previous) => sortAttributes([
        ...previous,
        {
          id: data.id,
          name: data.name,
          code: data.code,
          slug: data.slug,
          displayType: data.displayType,
          isVariantAttribute: data.isVariantAttribute,
          isSpecificationAttribute: data.isSpecificationAttribute,
          status: data.status,
          sortOrder: data.sortOrder,
          note: data.note,
          usageCount: 0,
          isReferenced: false,
          values: [],
        },
      ]));
      setAttributeForm(defaultAttributeForm());
      setShowCreateAttribute(false);
      setMessage("Đã tạo thuộc tính.");
      toast.success("Đã tạo thuộc tính.");
    } catch {
      setError("Lỗi mạng hoặc lỗi không xác định khi lưu thuộc tính.");
    } finally {
      setIsSavingCreateAttribute(false);
    }
  }

  async function handleCreateValueSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateValueFieldErrors({});
    setError(null);
    if (!valueForm.attributeId) {
      setCreateValueFieldErrors({ attributeId: "Vui lòng chọn thuộc tính cha." });
      return;
    }
    if (!valueForm.name.trim()) {
      setCreateValueFieldErrors({ name: "Tên hiển thị là bắt buộc." });
      return;
    }

    setIsSavingCreateValue(true);
    try {
      const payload = {
        name: valueForm.name.trim(),
        code: valueForm.code.trim() || undefined,
        slug: valueForm.slug.trim() || undefined,
        hexCode: valueForm.hexCode.trim() || undefined,
        imageUrl: valueForm.imageUrl.trim() || undefined,
        status: valueForm.status,
        sortOrder: valueForm.sortOrder,
      };
      const res = await fetch(`/api/admin/attributes/${valueForm.attributeId}/values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null) as ApiValuePatch & { message?: string; fieldErrors?: Record<string, string> } | null;
      if (!res.ok || !data) {
        setCreateValueFieldErrors(data?.fieldErrors ?? {});
        setError(data?.message ?? "Không thể lưu giá trị thuộc tính.");
        return;
      }

      const parentAttributeId = valueForm.attributeId;
      updateAttributeInList(parentAttributeId, (attribute) => ({
        ...attribute,
        values: sortValues([
          ...attribute.values,
          {
            id: data.id,
            name: data.name,
            code: data.code,
            slug: data.slug,
            hexCode: data.hexCode,
            imageUrl: data.imageUrl,
            status: data.status,
            sortOrder: data.sortOrder,
            usageCount: 0,
            isReferenced: false,
          },
        ]),
      }));
      setValueForm(defaultValueForm(parentAttributeId));
      setMessage("Đã tạo giá trị.");
      toast.success("Đã tạo giá trị.");
    } catch {
      setError("Lỗi mạng hoặc lỗi không xác định khi lưu giá trị thuộc tính.");
    } finally {
      setIsSavingCreateValue(false);
    }
  }

  async function saveInlineAttribute(attribute: Attribute) {
    if (!inlineAttributeDraft) return;
    setInlineAttributeFieldErrors({});
    if (!inlineAttributeDraft.name.trim()) {
      setInlineAttributeFieldErrors({ name: "Tên thuộc tính là bắt buộc." });
      return;
    }

    setSavingAttributeId(attribute.id);
    try {
      const payload: Record<string, unknown> = {
        name: inlineAttributeDraft.name.trim(),
        displayType: inlineAttributeDraft.displayType,
        isVariantAttribute: inlineAttributeDraft.isVariantAttribute,
        isSpecificationAttribute: inlineAttributeDraft.isSpecificationAttribute,
        status: inlineAttributeDraft.status,
        sortOrder: inlineAttributeDraft.sortOrder,
        note: inlineAttributeDraft.note.trim() || undefined,
      };
      if (inlineAttributeAdvancedId === attribute.id) {
        payload.code = inlineAttributeDraft.code.trim() || undefined;
        payload.slug = inlineAttributeDraft.slug.trim() || undefined;
      }

      const res = await fetch(`/api/admin/attributes/${attribute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null) as ApiAttributePatch & { message?: string; fieldErrors?: Record<string, string> } | null;
      if (!res.ok || !data) {
        setInlineAttributeFieldErrors(data?.fieldErrors ?? {});
        if (!data?.fieldErrors || Object.keys(data.fieldErrors).length === 0) {
          setInlineAttributeFieldErrors({ _form: data?.message ?? "Không thể lưu thuộc tính." });
        }
        return;
      }

      updateAttributeInList(attribute.id, (current) => ({
        ...current,
        name: data.name,
        code: data.code,
        slug: data.slug,
        displayType: data.displayType,
        isVariantAttribute: data.isVariantAttribute,
        isSpecificationAttribute: data.isSpecificationAttribute,
        status: data.status,
        sortOrder: data.sortOrder,
        note: data.note,
      }));
      closeInlineAttributeEdit();
      toast.success("Đã cập nhật thuộc tính.");
    } catch {
      setInlineAttributeFieldErrors({ _form: "Lỗi mạng hoặc lỗi không xác định khi lưu thuộc tính." });
    } finally {
      setSavingAttributeId(null);
    }
  }

  async function saveInlineValue(attribute: Attribute, value: AttributeValue) {
    if (!inlineValueDraft) return;
    setInlineValueFieldErrors({});
    if (!inlineValueDraft.name.trim()) {
      setInlineValueFieldErrors({ name: "Tên giá trị không được để trống." });
      return;
    }

    setSavingValueId(value.id);
    try {
      const payload: Record<string, unknown> = {
        name: inlineValueDraft.name.trim(),
        hexCode: inlineValueDraft.hexCode.trim() || undefined,
        imageUrl: inlineValueDraft.imageUrl.trim() || undefined,
        status: inlineValueDraft.status,
        sortOrder: inlineValueDraft.sortOrder,
      };
      if (inlineValueAdvancedId === value.id) {
        payload.code = inlineValueDraft.code.trim() || undefined;
        payload.slug = inlineValueDraft.slug.trim() || undefined;
      }

      const res = await fetch(`/api/admin/attributes/${attribute.id}/values/${value.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null) as ApiValuePatch & { message?: string; fieldErrors?: Record<string, string> } | null;
      if (!res.ok || !data) {
        setInlineValueFieldErrors(data?.fieldErrors ?? {});
        if (!data?.fieldErrors || Object.keys(data.fieldErrors).length === 0) {
          setInlineValueFieldErrors({ _form: data?.message ?? "Không thể lưu giá trị thuộc tính." });
        }
        return;
      }

      updateValueInList(attribute.id, value.id, (current) => ({
        ...current,
        name: data.name,
        code: data.code,
        slug: data.slug,
        hexCode: data.hexCode,
        imageUrl: data.imageUrl,
        status: data.status,
        sortOrder: data.sortOrder,
      }));
      closeInlineValueEdit();
      toast.success("Đã cập nhật giá trị thuộc tính.");
    } catch {
      setInlineValueFieldErrors({ _form: "Lỗi mạng hoặc lỗi không xác định khi lưu giá trị thuộc tính." });
    } finally {
      setSavingValueId(null);
    }
  }

  async function patchAttributeStatus(attribute: Attribute) {
    const nextStatus: Status = attribute.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/attributes/${attribute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => null) as ApiAttributePatch & { message?: string } | null;
      if (!res.ok || !data) {
        toast.error(data?.message ?? "Không thể cập nhật trạng thái. Vui lòng thử lại.");
        return;
      }
      updateAttributeInList(attribute.id, (current) => ({ ...current, status: data.status }));
      toast.success("Đã cập nhật trạng thái thuộc tính.");
    } catch {
      toast.error("Không thể cập nhật trạng thái. Vui lòng thử lại.");
    }
  }

  async function patchValueStatus(attribute: Attribute, value: AttributeValue) {
    const nextStatus: Status = value.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/attributes/${attribute.id}/values/${value.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => null) as ApiValuePatch & { message?: string } | null;
      if (!res.ok || !data) {
        toast.error(data?.message ?? "Không thể cập nhật trạng thái. Vui lòng thử lại.");
        return;
      }
      updateValueInList(attribute.id, value.id, (current) => ({ ...current, status: data.status }));
      toast.success("Đã cập nhật trạng thái giá trị.");
    } catch {
      toast.error("Không thể cập nhật trạng thái. Vui lòng thử lại.");
    }
  }

  async function deleteAttribute(attribute: Attribute) {
    if (!window.confirm(`Xóa thuộc tính "${attribute.name}"? Chỉ xóa được khi chưa sử dụng.`)) return;
    const res = await fetch(`/api/admin/attributes/${attribute.id}`, { method: "DELETE" });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể xóa thuộc tính. Hãy ngừng sử dụng thay vì xóa.");
      return;
    }
    if (inlineAttributeEditId === attribute.id) closeInlineAttributeEdit();
    setAttributes((previous) => previous.filter((item) => item.id !== attribute.id));
    setMessage("Đã xóa thuộc tính.");
    toast.success("Đã xóa thuộc tính.");
  }

  async function deleteValue(attribute: Attribute, value: AttributeValue) {
    if (!window.confirm(`Xóa giá trị "${value.name}"? Chỉ xóa được khi chưa sử dụng.`)) return;
    const res = await fetch(`/api/admin/attributes/${attribute.id}/values/${value.id}`, { method: "DELETE" });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể xóa giá trị. Hãy ngừng sử dụng thay vì xóa.");
      return;
    }
    if (inlineValueEditId === value.id) closeInlineValueEdit();
    updateAttributeInList(attribute.id, (current) => ({
      ...current,
      values: current.values.filter((item) => item.id !== value.id),
    }));
    setMessage("Đã xóa giá trị.");
    toast.success("Đã xóa giá trị.");
  }

  return (
    <div className="admin-catalog-page admin-attributes-page" data-testid="admin-attributes-page">
      <p className="admin-field-hint admin-attributes-page__help">
        Quản lý thuộc tính dùng chung cho biến thể và thông số sản phẩm. Danh sách bên dưới là nơi làm việc chính.
      </p>

      <div className="admin-catalog-toolbar admin-attributes-toolbar">
        <div className="admin-catalog-toolbar-left">
          <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" onClick={() => setPresetDialogOpen(true)}>
            Tạo từ bộ mặc định
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            data-testid="attributes-toggle-create"
            onClick={() => setShowCreateAttribute((current) => !current)}
          >
            {showCreateAttribute ? "Đóng thêm thuộc tính" : "Thêm thuộc tính"}
          </button>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void load()}>
            Làm mới danh sách
          </button>
        </div>
        <div className="admin-attributes-toolbar__filters">
          <input
            className="admin-input admin-attributes-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên / mã / giá trị…"
            aria-label="Tìm thuộc tính"
            data-testid="attributes-search"
          />
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Hiện ngừng sử dụng
          </label>
        </div>
      </div>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      {showCreateAttribute && (
        <form
          className="admin-catalog-fieldset admin-catalog-fieldset--dense"
          onSubmit={(e) => void handleCreateAttributeSubmit(e)}
          data-testid="attributes-create-form"
        >
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Thêm thuộc tính mới</legend>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Tên thuộc tính <span className="admin-required">*</span></label>
              <input
                className={`admin-input${errorClass(createAttributeFieldErrors, "name")}`}
                value={attributeForm.name}
                onChange={(e) => {
                  setCreateAttributeFieldErrors((current) => {
                    if (!current.name) return current;
                    const next = { ...current };
                    delete next.name;
                    return next;
                  });
                  setAttributeForm((form) => ({ ...form, name: e.target.value }));
                }}
                placeholder="Màu sắc, Kích thước, Form dáng…"
              />
              {createAttributeFieldErrors.name && <p className="admin-field-error" role="alert">{createAttributeFieldErrors.name}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã thuộc tính</label>
              <input
                className={`admin-input${errorClass(createAttributeFieldErrors, "code")}`}
                value={attributeForm.code}
                onChange={(e) => setAttributeForm((form) => ({ ...form, code: e.target.value.toUpperCase() }))}
                placeholder="COLOR, SIZE, FIT…"
              />
              {createAttributeFieldErrors.code && <p className="admin-field-error" role="alert">{createAttributeFieldErrors.code}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Slug</label>
              <input
                className={`admin-input${errorClass(createAttributeFieldErrors, "slug")}`}
                value={attributeForm.slug}
                onChange={(e) => setAttributeForm((form) => ({ ...form, slug: e.target.value }))}
                placeholder="Tự sinh nếu bỏ trống"
              />
              {createAttributeFieldErrors.slug && <p className="admin-field-error" role="alert">{createAttributeFieldErrors.slug}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Kiểu hiển thị</label>
              <select className="admin-input" value={attributeForm.displayType} onChange={(e) => setAttributeForm((form) => ({ ...form, displayType: e.target.value as DisplayType }))}>
                {Object.entries(DISPLAY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Thứ tự sắp xếp</label>
              <input className="admin-input" type="number" value={attributeForm.sortOrder} onChange={(e) => setAttributeForm((form) => ({ ...form, sortOrder: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Trạng thái</label>
              <select className="admin-input" value={attributeForm.status} onChange={(e) => setAttributeForm((form) => ({ ...form, status: e.target.value as Status }))}>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngừng sử dụng</option>
              </select>
            </div>
          </div>
          <div className="admin-catalog-toggle-grid">
            <label className="admin-catalog-toggle">
              <input type="checkbox" checked={attributeForm.isVariantAttribute} onChange={(e) => setAttributeForm((form) => ({ ...form, isVariantAttribute: e.target.checked }))} />
              Dùng để tạo biến thể
            </label>
            <label className="admin-catalog-toggle">
              <input type="checkbox" checked={attributeForm.isSpecificationAttribute} onChange={(e) => setAttributeForm((form) => ({ ...form, isSpecificationAttribute: e.target.checked }))} />
              Dùng làm thông số sản phẩm
            </label>
          </div>
          <div className="admin-field">
            <label className="admin-label">Ghi chú nội bộ</label>
            <textarea className="admin-textarea" rows={2} value={attributeForm.note} onChange={(e) => setAttributeForm((form) => ({ ...form, note: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AdminLoadingButton
              type="submit"
              variant="primary"
              pending={isSavingCreateAttribute}
              pendingLabel="Đang thêm thuộc tính..."
            >
              Thêm thuộc tính
            </AdminLoadingButton>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShowCreateAttribute(false)}>
              Đóng
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <TableLoading
          title="Đang tải thuộc tính..."
          description="Hệ thống đang tải danh sách thuộc tính và giá trị."
          tone="admin"
        />
      ) : (
        <div className="admin-attributes-list" data-testid="attributes-list">
          {filteredAttributes.length === 0 ? (
            <p className="admin-field-hint">Không có thuộc tính phù hợp.</p>
          ) : (
            filteredAttributes.map((attribute) => {
            const isInlineEditingAttribute = inlineAttributeEditId === attribute.id && inlineAttributeDraft;
            const valuesExpanded = expandedAttributeIds[attribute.id] === true;
            const isColor = isColorAttribute(attribute);
            const quickDraft = quickAddDrafts[attribute.id] ?? defaultQuickAddDraft(String(attribute.values.length));
            return (
              <section
                key={attribute.id}
                ref={(node) => { attributeSectionRefs.current[attribute.id] = node; }}
                className="admin-product-section admin-attribute-card"
              >
                {isInlineEditingAttribute ? (
                  <div className="admin-attribute-inline-edit-panel">
                    <div className="admin-attribute-inline-edit-meta">
                      <code className="admin-catalog-code">{inlineAttributeDraft.code}</code>
                      <span>{attribute.slug}</span>
                      <span>Đang dùng trong {attribute.usageCount} sản phẩm / biến thể</span>
                      <span className={`admin-kb-badge ${attribute.status === "ACTIVE" ? "admin-kb-badge--verified" : "admin-kb-badge--low"}`}>
                        {attribute.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng sử dụng"}
                      </span>
                    </div>
                    <div className="admin-attribute-inline-edit-grid">
                      <div className="admin-field">
                        <label className="admin-label">Tên thuộc tính</label>
                        <input
                          className={`admin-input${errorClass(inlineAttributeFieldErrors, "name")}`}
                          value={inlineAttributeDraft.name}
                          onChange={(e) => {
                            clearInlineAttributeFieldError("name");
                            setInlineAttributeDraft((draft) => draft ? { ...draft, name: e.target.value } : draft);
                          }}
                        />
                        {inlineAttributeFieldErrors.name && <p className="admin-field-error" role="alert">{inlineAttributeFieldErrors.name}</p>}
                      </div>
                      <div className="admin-field">
                        <label className="admin-label">Kiểu hiển thị</label>
                        <select
                          className={`admin-input${errorClass(inlineAttributeFieldErrors, "displayType")}`}
                          value={inlineAttributeDraft.displayType}
                          onChange={(e) => {
                            clearInlineAttributeFieldError("displayType");
                            setInlineAttributeDraft((draft) => draft ? { ...draft, displayType: e.target.value as DisplayType } : draft);
                          }}
                        >
                          {Object.entries(DISPLAY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        {inlineAttributeFieldErrors.displayType && <p className="admin-field-error" role="alert">{inlineAttributeFieldErrors.displayType}</p>}
                      </div>
                      <div className="admin-field">
                        <label className="admin-label">Thứ tự</label>
                        <input
                          className={`admin-input${errorClass(inlineAttributeFieldErrors, "sortOrder")}`}
                          type="number"
                          value={inlineAttributeDraft.sortOrder}
                          onChange={(e) => {
                            clearInlineAttributeFieldError("sortOrder");
                            setInlineAttributeDraft((draft) => draft ? { ...draft, sortOrder: e.target.value } : draft);
                          }}
                        />
                        {inlineAttributeFieldErrors.sortOrder && <p className="admin-field-error" role="alert">{inlineAttributeFieldErrors.sortOrder}</p>}
                      </div>
                      <div className="admin-field">
                        <label className="admin-label">Trạng thái</label>
                        <select
                          className="admin-input"
                          value={inlineAttributeDraft.status}
                          onChange={(e) => setInlineAttributeDraft((draft) => draft ? { ...draft, status: e.target.value as Status } : draft)}
                        >
                          <option value="ACTIVE">Đang hoạt động</option>
                          <option value="INACTIVE">Ngừng sử dụng</option>
                        </select>
                      </div>
                      <div className="admin-field admin-attribute-inline-edit-grid--full">
                        <label className="admin-label">Ghi chú</label>
                        <textarea
                          className="admin-textarea"
                          value={inlineAttributeDraft.note}
                          onChange={(e) => setInlineAttributeDraft((draft) => draft ? { ...draft, note: e.target.value } : draft)}
                        />
                      </div>
                      <div className="admin-catalog-toggle-grid admin-attribute-inline-edit-grid--full">
                        <label className="admin-catalog-toggle">
                          <input
                            type="checkbox"
                            checked={inlineAttributeDraft.isVariantAttribute}
                            onChange={(e) => setInlineAttributeDraft((draft) => draft ? { ...draft, isVariantAttribute: e.target.checked } : draft)}
                          />
                          Dùng tạo biến thể
                        </label>
                        <label className="admin-catalog-toggle">
                          <input
                            type="checkbox"
                            checked={inlineAttributeDraft.isSpecificationAttribute}
                            onChange={(e) => setInlineAttributeDraft((draft) => draft ? { ...draft, isSpecificationAttribute: e.target.checked } : draft)}
                          />
                          Dùng làm thông số
                        </label>
                      </div>
                    </div>
                    {inlineAttributeAdvancedId === attribute.id ? (
                      <div className="admin-attribute-inline-edit-identifiers">
                        <div className="admin-field">
                          <label className="admin-label">Mã</label>
                          <input
                            className={`admin-input${errorClass(inlineAttributeFieldErrors, "code")}`}
                            value={inlineAttributeDraft.code}
                            readOnly={inlineAttributeDraft.isReferenced}
                            onChange={(e) => {
                              clearInlineAttributeFieldError("code");
                              setInlineAttributeDraft((draft) => draft ? { ...draft, code: e.target.value.toUpperCase() } : draft);
                            }}
                          />
                          {inlineAttributeDraft.isReferenced && <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>}
                          {inlineAttributeFieldErrors.code && <p className="admin-field-error" role="alert">{inlineAttributeFieldErrors.code}</p>}
                        </div>
                        <div className="admin-field">
                          <label className="admin-label">Slug</label>
                          <input
                            className={`admin-input${errorClass(inlineAttributeFieldErrors, "slug")}`}
                            value={inlineAttributeDraft.slug}
                            readOnly={inlineAttributeDraft.isReferenced}
                            onChange={(e) => {
                              clearInlineAttributeFieldError("slug");
                              setInlineAttributeDraft((draft) => draft ? { ...draft, slug: e.target.value } : draft);
                            }}
                          />
                          {inlineAttributeDraft.isReferenced && <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>}
                          {inlineAttributeFieldErrors.slug && <p className="admin-field-error" role="alert">{inlineAttributeFieldErrors.slug}</p>}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => setInlineAttributeAdvancedId(attribute.id)}
                      >
                        Chỉnh mã nâng cao
                      </button>
                    )}
                    {inlineAttributeFieldErrors._form && (
                      <p className="admin-field-error" role="alert">{inlineAttributeFieldErrors._form}</p>
                    )}
                    <div className="admin-attribute-inline-edit-actions">
                      <AdminLoadingButton
                        type="button"
                        variant="primary"
                        size="xs"
                        pending={savingAttributeId === attribute.id}
                        pendingLabel="Đang lưu thuộc tính..."
                        onClick={() => void saveInlineAttribute(attribute)}
                      >
                        Lưu
                      </AdminLoadingButton>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={cancelInlineAttributeEdit}>
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-section-head">
                    <div>
                      <h3 className="admin-subtitle" style={{ marginBottom: 4 }}>{attribute.name}</h3>
                      <p className="admin-field-hint">
                        <code className="admin-catalog-code">{attribute.code}</code> · {attribute.slug} · {DISPLAY_TYPE_LABELS[attribute.displayType]} · Đang dùng trong {attribute.usageCount} sản phẩm / biến thể
                      </p>
                    </div>
                    <div className="admin-catalog-actions-cell">
                      {attribute.status === "ACTIVE" && attribute.isSpecificationAttribute && (
                        <Link
                          href={`/admin/products/new?attributeId=${attribute.id}&usage=specification`}
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                        >
                          Dùng cho sản phẩm mới
                        </Link>
                      )}
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => openInlineAttributeEdit(attribute)}>
                        Sửa nhanh
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        data-testid={`manage-values-${attribute.id}`}
                        onClick={() => manageValues(attribute)}
                      >
                        Quản lý giá trị
                      </button>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void patchAttributeStatus(attribute)}>
                        {attribute.status === "ACTIVE" ? "Ngừng sử dụng" : "Kích hoạt"}
                      </button>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void deleteAttribute(attribute)}>Xóa</button>
                    </div>
                  </div>
                )}

                {valuesExpanded && (
                <div className="admin-catalog-table-wrap" data-testid={`attribute-values-${attribute.id}`}>
                  <table className="admin-catalog-table admin-catalog-table--dense">
                    <thead>
                      <tr>
                        <th>{isColor ? "Tên màu" : "Tên hiển thị"}</th>
                        <th>{isColor ? "Mã" : "Mã giá trị"}</th>
                        {isColor && <th>HEX màu</th>}
                        {isColor && <th>Ảnh/swatch</th>}
                        {!isColor && <th>Slug</th>}
                        <th>Thứ tự</th>
                        <th>Trạng thái</th>
                        <th>Sử dụng</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attribute.values.map((value) => {
                        const isInlineEditingValue =
                          inlineValueEditId === value.id
                          && inlineValueAttributeId === attribute.id
                          && inlineValueDraft;

                        if (isInlineEditingValue) {
                          return (
                            <tr key={value.id} className="admin-attribute-value-inline-edit">
                              <td colSpan={8}>
                                <div className="admin-attribute-value-inline-fields">
                                  <div className="admin-field">
                                    <label className="admin-label">Tên giá trị</label>
                                    <input
                                      className={`admin-input${errorClass(inlineValueFieldErrors, "name")}`}
                                      value={inlineValueDraft.name}
                                      onChange={(e) => {
                                        clearInlineValueFieldError("name");
                                        setInlineValueDraft((draft) => draft ? { ...draft, name: e.target.value } : draft);
                                      }}
                                    />
                                    {inlineValueFieldErrors.name && <p className="admin-field-error" role="alert">{inlineValueFieldErrors.name}</p>}
                                  </div>
                                  <div className="admin-field">
                                    <label className="admin-label">HEX màu</label>
                                    <input
                                      className={`admin-input${errorClass(inlineValueFieldErrors, "hexCode")}`}
                                      value={inlineValueDraft.hexCode}
                                      onChange={(e) => {
                                        clearInlineValueFieldError("hexCode");
                                        setInlineValueDraft((draft) => draft ? { ...draft, hexCode: e.target.value } : draft);
                                      }}
                                    />
                                    {inlineValueFieldErrors.hexCode && <p className="admin-field-error" role="alert">{inlineValueFieldErrors.hexCode}</p>}
                                  </div>
                                  <div className="admin-field">
                                    <label className="admin-label">Ảnh (URL)</label>
                                    <input
                                      className="admin-input"
                                      value={inlineValueDraft.imageUrl}
                                      onChange={(e) => setInlineValueDraft((draft) => draft ? { ...draft, imageUrl: e.target.value } : draft)}
                                    />
                                  </div>
                                  <div className="admin-field">
                                    <label className="admin-label">Thứ tự</label>
                                    <input
                                      className={`admin-input${errorClass(inlineValueFieldErrors, "sortOrder")}`}
                                      type="number"
                                      value={inlineValueDraft.sortOrder}
                                      onChange={(e) => {
                                        clearInlineValueFieldError("sortOrder");
                                        setInlineValueDraft((draft) => draft ? { ...draft, sortOrder: e.target.value } : draft);
                                      }}
                                    />
                                    {inlineValueFieldErrors.sortOrder && <p className="admin-field-error" role="alert">{inlineValueFieldErrors.sortOrder}</p>}
                                  </div>
                                  <div className="admin-field">
                                    <label className="admin-label">Trạng thái</label>
                                    <select
                                      className="admin-input"
                                      value={inlineValueDraft.status}
                                      onChange={(e) => setInlineValueDraft((draft) => draft ? { ...draft, status: e.target.value as Status } : draft)}
                                    >
                                      <option value="ACTIVE">Đang hoạt động</option>
                                      <option value="INACTIVE">Ngừng sử dụng</option>
                                    </select>
                                  </div>
                                  <div className="admin-field">
                                    <label className="admin-label">Mã / slug</label>
                                    <p className="admin-field-hint">
                                      <code className="admin-catalog-code">{inlineValueDraft.code}</code> · {inlineValueDraft.slug}
                                    </p>
                                  </div>
                                  {inlineValueAdvancedId === value.id ? (
                                    <>
                                      <div className="admin-field">
                                        <label className="admin-label">Mã giá trị</label>
                                        <input
                                          className={`admin-input${errorClass(inlineValueFieldErrors, "code")}`}
                                          value={inlineValueDraft.code}
                                          readOnly={inlineValueDraft.isReferenced}
                                          onChange={(e) => {
                                            clearInlineValueFieldError("code");
                                            setInlineValueDraft((draft) => draft ? { ...draft, code: e.target.value.toUpperCase() } : draft);
                                          }}
                                        />
                                        {inlineValueDraft.isReferenced && <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>}
                                        {inlineValueFieldErrors.code && <p className="admin-field-error" role="alert">{inlineValueFieldErrors.code}</p>}
                                      </div>
                                      <div className="admin-field">
                                        <label className="admin-label">Slug</label>
                                        <input
                                          className={`admin-input${errorClass(inlineValueFieldErrors, "slug")}`}
                                          value={inlineValueDraft.slug}
                                          readOnly={inlineValueDraft.isReferenced}
                                          onChange={(e) => {
                                            clearInlineValueFieldError("slug");
                                            setInlineValueDraft((draft) => draft ? { ...draft, slug: e.target.value } : draft);
                                          }}
                                        />
                                        {inlineValueDraft.isReferenced && <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>}
                                        {inlineValueFieldErrors.slug && <p className="admin-field-error" role="alert">{inlineValueFieldErrors.slug}</p>}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="admin-field" style={{ display: "flex", alignItems: "end" }}>
                                      <button
                                        type="button"
                                        className="admin-btn admin-btn--secondary admin-btn--xs"
                                        onClick={() => setInlineValueAdvancedId(value.id)}
                                      >
                                        Chỉnh mã nâng cao
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {inlineValueFieldErrors._form && (
                                  <p className="admin-field-error" role="alert">{inlineValueFieldErrors._form}</p>
                                )}
                                <div className="admin-attribute-inline-edit-actions" style={{ marginTop: 8 }}>
                                  <AdminLoadingButton
                                    type="button"
                                    variant="primary"
                                    size="xs"
                                    pending={savingValueId === value.id}
                                    pendingLabel="Đang lưu giá trị..."
                                    onClick={() => void saveInlineValue(attribute, value)}
                                  >
                                    Lưu
                                  </AdminLoadingButton>
                                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={cancelInlineValueEdit}>
                                    Hủy
                                  </button>
                                  <span className="admin-field-hint">Đang dùng trong {value.usageCount} sản phẩm / biến thể</span>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={value.id}>
                            <td>{value.name}</td>
                            <td><code className="admin-catalog-code">{value.code}</code></td>
                            {isColor && (
                              <td>
                                <span className="admin-attribute-swatch-cell">
                                  {value.hexCode ? (
                                    <span
                                      className={`admin-attribute-swatch${/^#(?:fff|ffffff)$/i.test(value.hexCode) ? " admin-attribute-swatch--light" : ""}`}
                                      style={{ background: value.hexCode }}
                                      title={value.hexCode}
                                    />
                                  ) : (
                                    "—"
                                  )}
                                  <span>{value.hexCode || "—"}</span>
                                </span>
                              </td>
                            )}
                            {isColor && <td>{value.imageUrl ? "Có ảnh" : "—"}</td>}
                            {!isColor && <td>{value.slug}</td>}
                            <td>{value.sortOrder}</td>
                            <td>
                              <span className={`admin-kb-badge ${value.status === "ACTIVE" ? "admin-kb-badge--verified" : "admin-kb-badge--low"}`}>
                                {value.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng sử dụng"}
                              </span>
                            </td>
                            <td>Đang dùng trong {value.usageCount} sản phẩm / biến thể</td>
                            <td>
                              <div className="admin-catalog-actions-cell">
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => openInlineValueEdit(attribute, value)}>
                                  Sửa nhanh
                                </button>
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void patchValueStatus(attribute, value)}>
                                  {value.status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                                </button>
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void deleteValue(attribute, value)}>Xóa</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {attribute.values.length === 0 && (
                        <tr>
                          <td colSpan={isColor ? 8 : 7}>Chưa có giá trị. Dùng dòng thêm bên dưới.</td>
                        </tr>
                      )}
                      <tr className="admin-attribute-quick-add-row" data-testid={`quick-add-row-${attribute.id}`}>
                        <td>
                          <input
                            ref={(node) => {
                              quickAddNameRefs.current[attribute.id] = node;
                            }}
                            className={`admin-input${errorClass(quickDraft.fieldErrors, "name")}`}
                            value={quickDraft.name}
                            placeholder={isColor ? "+ Thêm màu mới" : "+ Thêm giá trị mới"}
                            aria-label={isColor ? "Tên màu mới" : "Tên giá trị mới"}
                            onChange={(e) => onQuickAddNameChange(attribute, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void submitQuickAdd(attribute);
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className={`admin-input${errorClass(quickDraft.fieldErrors, "code")}`}
                            value={quickDraft.code}
                            placeholder="Mã"
                            onChange={(e) =>
                              updateQuickAddDraft(attribute.id, {
                                code: e.target.value.toUpperCase(),
                                codeTouched: true,
                                hexCode:
                                  isColor && !quickDraft.hexTouched
                                    ? suggestColorHex(e.target.value.toUpperCase())
                                    : quickDraft.hexCode,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void submitQuickAdd(attribute);
                              }
                            }}
                          />
                        </td>
                        {isColor && (
                          <td>
                            <input
                              className={`admin-input${errorClass(quickDraft.fieldErrors, "hexCode")}`}
                              value={quickDraft.hexCode}
                              placeholder="#000000"
                              onChange={(e) =>
                                updateQuickAddDraft(attribute.id, {
                                  hexCode: e.target.value,
                                  hexTouched: true,
                                  fieldErrors: {},
                                  error: null,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void submitQuickAdd(attribute);
                                }
                              }}
                            />
                          </td>
                        )}
                        {isColor && (
                          <td>
                            <input
                              className="admin-input"
                              value={quickDraft.imageUrl}
                              placeholder="URL ảnh"
                              onChange={(e) => updateQuickAddDraft(attribute.id, { imageUrl: e.target.value })}
                            />
                          </td>
                        )}
                        {!isColor && <td>—</td>}
                        <td>
                          <input
                            className="admin-input"
                            type="number"
                            value={quickDraft.sortOrder}
                            onChange={(e) => updateQuickAddDraft(attribute.id, { sortOrder: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            className="admin-input"
                            value={quickDraft.status}
                            onChange={(e) => updateQuickAddDraft(attribute.id, { status: e.target.value as Status })}
                          >
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Ngừng sử dụng</option>
                          </select>
                        </td>
                        <td>—</td>
                        <td>
                          <AdminLoadingButton
                            type="button"
                            variant="primary"
                            size="xs"
                            pending={savingQuickAddId === attribute.id}
                            pendingLabel="Đang thêm..."
                            onClick={() => void submitQuickAdd(attribute)}
                          >
                            Thêm
                          </AdminLoadingButton>
                        </td>
                      </tr>
                      {(quickDraft.error || quickDraft.fieldErrors.name || quickDraft.fieldErrors.hexCode) && (
                        <tr>
                          <td colSpan={isColor ? 8 : 7}>
                            <p className="admin-field-error" role="alert">
                              {quickDraft.error ||
                                quickDraft.fieldErrors.name ||
                                quickDraft.fieldErrors.hexCode}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                )}
              </section>
            );
          })
          )}
        </div>
      )}

      <div className="admin-attributes-advanced-toggle">
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          data-testid="attributes-advanced-value-toggle"
          onClick={() => setShowAdvancedValueForm((current) => !current)}
        >
          {showAdvancedValueForm ? "Ẩn thêm giá trị nâng cao" : "Thêm giá trị nâng cao"}
        </button>
      </div>

      {showAdvancedValueForm && (
        <form
          ref={valueFormRef}
          className="admin-catalog-fieldset admin-catalog-fieldset--dense"
          onSubmit={(e) => void handleCreateValueSubmit(e)}
          data-testid="attributes-create-value-form"
        >
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Thêm giá trị nâng cao</legend>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Thuộc tính cha <span className="admin-required">*</span></label>
              <select
                className={`admin-input${errorClass(createValueFieldErrors, "attributeId")}`}
                value={valueForm.attributeId}
                onChange={(e) => setValueForm((form) => ({ ...form, attributeId: e.target.value }))}
              >
                <option value="">— Chọn thuộc tính —</option>
                {attributes.map((attribute) => <option key={attribute.id} value={attribute.id}>{attribute.name} ({attribute.code})</option>)}
              </select>
              {createValueFieldErrors.attributeId && <p className="admin-field-error" role="alert">{createValueFieldErrors.attributeId}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Tên hiển thị <span className="admin-required">*</span></label>
              <input
                className={`admin-input${errorClass(createValueFieldErrors, "name")}`}
                value={valueForm.name}
                onChange={(e) => setValueForm((form) => ({ ...form, name: e.target.value }))}
                placeholder="Đen, Trắng, S, Regular fit…"
              />
              {createValueFieldErrors.name && <p className="admin-field-error" role="alert">{createValueFieldErrors.name}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã giá trị</label>
              <input className="admin-input" value={valueForm.code} onChange={(e) => setValueForm((form) => ({ ...form, code: e.target.value.toUpperCase() }))} placeholder="BLK, WHT, S…" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Slug</label>
              <input className="admin-input" value={valueForm.slug} onChange={(e) => setValueForm((form) => ({ ...form, slug: e.target.value }))} placeholder="Tự sinh nếu bỏ trống" />
            </div>
            <div className="admin-field">
              <label className="admin-label">HEX màu</label>
              <input className="admin-input" value={valueForm.hexCode} onChange={(e) => setValueForm((form) => ({ ...form, hexCode: e.target.value }))} placeholder="#000000" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ảnh giá trị</label>
              <input className="admin-input" value={valueForm.imageUrl} onChange={(e) => setValueForm((form) => ({ ...form, imageUrl: e.target.value }))} placeholder="URL ảnh nếu dùng image swatch" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Thứ tự</label>
              <input className="admin-input" type="number" value={valueForm.sortOrder} onChange={(e) => setValueForm((form) => ({ ...form, sortOrder: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Trạng thái</label>
              <select className="admin-input" value={valueForm.status} onChange={(e) => setValueForm((form) => ({ ...form, status: e.target.value as Status }))}>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngừng sử dụng</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AdminLoadingButton
              type="submit"
              variant="primary"
              pending={isSavingCreateValue}
              pendingLabel="Đang thêm giá trị..."
            >
              Thêm giá trị
            </AdminLoadingButton>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShowAdvancedValueForm(false)}>
              Đóng
            </button>
          </div>
        </form>
      )}

      <AttributePresetDialog
        open={presetDialogOpen}
        onClose={() => setPresetDialogOpen(false)}
        onSuccess={(attributeId, successMessage) => void handlePresetSuccess(attributeId, successMessage)}
        onOpenExisting={(attributeId) => {
          void load().then(() => focusAttribute(attributeId));
        }}
      />
    </div>
  );
}
