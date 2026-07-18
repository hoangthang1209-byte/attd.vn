"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";
import PublishQualityChecklist from "@/components/admin/products/PublishQualityChecklist";
import ProductB2BSharedAttributeField from "@/components/admin/products/ProductB2BSharedAttributeField";
import ProductMaterialSection from "@/components/admin/products/ProductMaterialSection";
import ProductCatalogSpecificationsSection, {
  type ProductSpecificationFormRow,
} from "@/components/admin/products/ProductCatalogSpecificationsSection";
import ProductCatalogContentSection, {
  type ProductCustomizationFormRow,
} from "@/components/admin/products/ProductCatalogContentSection";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import ProductCatalogVariantsSection, {
  type ProductCatalogVariantsSectionHandle,
} from "@/components/admin/products/ProductCatalogVariantsSection";
import ProductInformationAttributesSection from "@/components/admin/products/ProductInformationAttributesSection";
import type { SharedAttributePickerOption } from "@/components/admin/products/ProductOptionGroupBuilder";
import {
  mapOptionsToFormRows,
  mapVariantsToFormRows,
  type MatrixVariantFormRow,
  type ProductAttributeAssignmentFormRow,
} from "@/features/products/product-catalog-form-mappers";
import ProductCatalogFormErrorSummary from "@/components/admin/products/ProductCatalogFormErrorSummary";
import ProductCategoryCascadingPicker from "@/components/admin/products/ProductCategoryCascadingPicker";
import ProductExportDialog from "@/components/admin/products/ProductExportDialog";
import ProductSizeChartEditor from "@/components/admin/products/ProductSizeChartEditor";
import ProductContentSuggestButton from "@/components/admin/products/ProductContentSuggestButton";
import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import {
  joinSuggestedTags,
  suggestProductCustomizationNote,
  suggestProductLongDescription,
  suggestProductSeoDescription,
  suggestProductSeoTitle,
  suggestProductShortDescription,
  suggestProductSizeChartNote,
  suggestProductSpecificationSummary,
  suggestProductTags,
} from "@/features/products/product-content-suggestions";
import {
  resolveOptionValueRefFromGroups,
} from "@/features/products/product-variant-matrix.utils";
import {
  buildOptionsFingerprint,
  buildPersistedOptionsPayload,
  countActiveOptionValues,
  optionGroupsMissingPersistedIds,
  OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR,
} from "@/features/products/product-option-persistence";
import {
  fieldErrorInputClass,
  resolveTabForField,
  scrollToFirstFieldError,
  validateProductCatalogFormLocal,
  validateProductDraftForMatrixGeneration,
} from "@/features/products/product-catalog-form-validation";
import {
  buildProductFormErrorDescriptors,
  countErrorsByTab,
  clearFieldErrorsForEdit,
  focusProductFormError,
  type ProductFormErrorDescriptor,
  type ProductFormTabId,
} from "@/features/products/product-form-error-descriptors";
import { normalizeProductFormFieldErrors } from "@/features/products/product-form-row-error-keys";
import {
  resolveAutomaticSalesBadgePreviews,
  PRODUCT_CURATED_BADGE_LABELS,
  PRODUCT_CURATED_BADGE_KEYS,
  type ProductCuratedBadgeKey,
} from "@/features/products/product-sales-badges";
import {
  createEmptyProductSizeChart,
  isLikelyApparelProduct,
  isPublicSizeChartRenderable,
  validateProductSizeChartForSave,
  type ProductSizeChart,
} from "@/features/products/product-size-chart";
import { validateProductCategorySelection } from "@/features/categories/category-cascade-utils";
import { useAdminMutation } from "@/hooks/useAdminAction";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  SEO_PUBLISH_QUALITY_SUMMARY,
  buildProductPublishChecklist,
  type ProductPublishQualityInput,
} from "@/lib/seo/publish-quality-gate";

type Category = {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  skuCode: string | null;
  parentId?: string | null;
  isActive?: boolean;
};

type ProductFormData = {
  id?: string;
  slug?: string;
  name: string;
  productCode: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  material: string;
  form: string;
  fit: string;
  defaultMoq: string;
  leadTime: string;
  useCases: string;
  targetCustomers: string;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  tags: string;
  status: string;
  featuredImage: string;
  gallery: string[];
  specifications: ProductSpecificationFormRow[];
  attributeAssignments: ProductAttributeAssignmentFormRow[];
  customizations: ProductCustomizationFormRow[];
  options: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
  curatedSalesBadges: ProductCuratedBadgeKey[];
  publicSizeChart: ProductSizeChart;
};

const FORM_SECTIONS = [
  { id: "section-basic", tab: "basic" as const, label: "Cơ bản" },
  { id: "section-media", tab: "media" as const, label: "Hình ảnh" },
  { id: "section-b2b", tab: "basic" as const, label: "B2B" },
  { id: "section-variants", tab: "variants" as const, label: "Biến thể" },
  { id: "section-size-chart", tab: "content" as const, label: "Bảng size" },
  { id: "section-content", tab: "content" as const, label: "Nội dung" },
  { id: "section-seo", tab: "seo" as const, label: "SEO" },
] as const;

type FormTabId = ProductFormTabId;

type Props = {
  initialData?: Partial<ProductFormData> & { id?: string; slug?: string };
  categories?: Category[];
  preselectAttributeId?: string;
  preselectUsage?: string;
};

const LEAD_TIME_PRESETS = [
  "Có sẵn: 1–3 ngày",
  "Đặt hàng: 5–10 ngày",
  "OEM: 10–20 ngày tùy số lượng",
  "Thỏa thuận theo đơn hàng",
];

export default function ProductCatalogForm({
  initialData,
  categories: propCategories,
  preselectAttributeId,
  preselectUsage,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const [categories, setCategories] = useState<Category[]>(propCategories ?? []);
  const [sharedAttributes, setSharedAttributes] = useState<SharedAttributePickerOption[]>([]);
  const [sharedAttributesLoading, setSharedAttributesLoading] = useState(false);
  const [sharedAttributesError, setSharedAttributesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FormTabId>(() =>
    searchParams.get("generateVariants") === "1" ? "variants" : "basic",
  );

  const scrollToFormSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const scroller = document.getElementById("admin-content-scroll");
    if (!(scroller instanceof HTMLElement)) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const header = scroller.querySelector("header");
    const headerOffset = header instanceof HTMLElement ? header.offsetHeight + 8 : 8;
    const top =
      el.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      headerOffset;
    scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("admin-product-edit-dense");
    return () => document.documentElement.classList.remove("admin-product-edit-dense");
  }, []);

  const focusFormTabSection = useCallback((tab: FormTabId) => {
    setActiveTab(tab);
    const sectionByTab: Record<FormTabId, string> = {
      basic: "section-basic",
      media: "section-media",
      variants: "section-variants",
      content: "section-content",
      seo: "section-seo",
    };
    requestAnimationFrame(() => scrollToFormSection(sectionByTab[tab] ?? "section-basic"));
  }, [scrollToFormSection]);
  const [form, setForm] = useState<ProductFormData>({
    id: initialData?.id,
    slug: initialData?.slug,
    name: initialData?.name ?? "",
    productCode: initialData?.productCode ?? "",
    categoryId: initialData?.categoryId ?? "",
    shortDescription: initialData?.shortDescription ?? "",
    description: initialData?.description ?? "",
    seoTitle: initialData?.seoTitle ?? "",
    seoDescription: initialData?.seoDescription ?? "",
    material: initialData?.material ?? "",
    form: initialData?.form ?? "",
    fit: initialData?.fit ?? "",
    defaultMoq: initialData?.defaultMoq ?? "",
    leadTime: initialData?.leadTime ?? "",
    useCases: initialData?.useCases ?? "",
    targetCustomers: initialData?.targetCustomers ?? "",
    supportsPrinting: initialData?.supportsPrinting ?? false,
    supportsEmbroidery: initialData?.supportsEmbroidery ?? false,
    supportsOem: initialData?.supportsOem ?? true,
    tags: initialData?.tags ?? "",
    status: initialData?.status ?? "DRAFT",
    featuredImage: initialData?.featuredImage ?? "",
    gallery: initialData?.gallery ?? [],
    specifications: initialData?.specifications ?? [],
    attributeAssignments: initialData?.attributeAssignments ?? [],
    customizations: initialData?.customizations ?? [],
    options: initialData?.options ?? [],
    variants: initialData?.variants ?? [],
    curatedSalesBadges: initialData?.curatedSalesBadges ?? [],
    publicSizeChart: initialData?.publicSizeChart ?? createEmptyProductSizeChart(),
  });
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(() => JSON.stringify(form));
  const isFormDirty = useMemo(() => JSON.stringify(form) !== savedFormSnapshot, [form, savedFormSnapshot]);
  const [saving, setSaving] = useState(false);
  const [bulkOpInProgress, setBulkOpInProgress] = useState(false);
  const [matrixBusy, setMatrixBusy] = useState(false);
  const variantsSectionRef = useRef<ProductCatalogVariantsSectionHandle>(null);
  const matrixAutoOpenTriggeredRef = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;
  const [exportDialog, setExportDialog] = useState<"export" | "clone" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [productCodePreview, setProductCodePreview] = useState<string | null>(
    initialData?.productCode ?? null
  );
  const [categorySkuCode, setCategorySkuCode] = useState<string | null>(null);
  const [productCodePreviewError, setProductCodePreviewError] = useState<string | null>(null);
  const [allowManualProductCode, setAllowManualProductCode] = useState(false);
  const deletedVariantIdsRef = useRef<Set<string>>(new Set());
  const attributeSectionRef = useRef<HTMLElement | null>(null);
  const preselectHandledRef = useRef(false);
  const [initialStatus] = useState(() => initialData?.status ?? "DRAFT");
  const [initialLegacyFit] = useState(() => initialData?.fit?.trim() ?? "");
  const [legacyFitClearPending, setLegacyFitClearPending] = useState(false);

  const productPublishQualityInput = useMemo((): ProductPublishQualityInput => ({
    name: form.name,
    slug: form.slug,
    categoryId: form.categoryId,
    description: form.description,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    featuredImage: form.featuredImage,
    gallery: form.gallery,
    variants: form.variants.map((variant) => ({
      variantStatus: variant.variantStatus,
      imageUrl: variant.imageUrl,
    })),
    specifications: form.specifications,
    attributeAssignments: form.attributeAssignments,
    options: form.options,
    warnMissingSizeChart: isLikelyApparelProduct({
      name: form.name,
      options: form.options,
    }),
    publicSizeChartEnabled: form.publicSizeChart.enabled,
    publicSizeChartRenderable: isPublicSizeChartRenderable(form.publicSizeChart),
  }), [form]);

  const productPublishChecklist = useMemo(
    () => buildProductPublishChecklist(productPublishQualityInput),
    [productPublishQualityInput],
  );

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === form.categoryId)?.name ?? null,
    [categories, form.categoryId],
  );

  const contentSuggestionInput = useMemo(
    () => ({
      name: form.name,
      categoryName: selectedCategoryName,
      defaultMoq: form.defaultMoq,
      leadTime: form.leadTime,
      material: form.material,
      useCases: form.useCases,
      targetCustomers: form.targetCustomers,
      supportsPrinting: form.supportsPrinting,
      supportsEmbroidery: form.supportsEmbroidery,
      supportsOem: form.supportsOem,
      options: form.options,
      variants: form.variants,
      specifications: form.specifications,
      customizations: form.customizations,
      sizeChart: form.publicSizeChart,
      shortDescription: form.shortDescription,
      description: form.description,
    }),
    [form, selectedCategoryName],
  );

  const showProductPublishChecklist = form.status === "ACTIVE";
  const showProductLegacySeoWarning =
    Boolean(form.id) &&
    initialStatus === "ACTIVE" &&
    form.status === "ACTIVE" &&
    productPublishChecklist.some((item) => !item.complete);

  const errorDescriptorContext = useMemo(
    () => ({
      form,
      sharedAttributes,
      attributeAssignments: form.attributeAssignments,
      options: form.options,
      specifications: form.specifications,
      customizations: form.customizations,
      variants: form.variants,
    }),
    [form, sharedAttributes],
  );

  const errorDescriptors = useMemo(
    () => buildProductFormErrorDescriptors(fieldErrors, errorDescriptorContext),
    [fieldErrors, errorDescriptorContext],
  );

  const tabErrorCounts = useMemo(
    () => countErrorsByTab(errorDescriptors),
    [errorDescriptors],
  );

  const loadSharedAttributes = useCallback(async () => {
    setSharedAttributesLoading(true);
    setSharedAttributesError(null);
    try {
      const res = await fetch("/api/admin/attributes?activeOnly=1");
      const items = await res.json() as SharedAttributePickerOption[];
      setSharedAttributes(Array.isArray(items) ? items : []);
    } catch {
      setSharedAttributes([]);
      setSharedAttributesError("Không thể tải thuộc tính dùng chung.");
    }
    setSharedAttributesLoading(false);
  }, []);

  useEffect(() => {
    if (!propCategories) {
      void fetch("/api/admin/products/categories")
        .then((r) => r.json())
        .then((cats: Category[]) => setCategories(cats));
    }
    const timer = window.setTimeout(() => {
      void loadSharedAttributes();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [propCategories, loadSharedAttributes]);

  useEffect(() => {
    if (preselectHandledRef.current) return;
    const attributeId =
      preselectAttributeId ?? searchParams.get("attributeId") ?? undefined;
    const usage = preselectUsage ?? searchParams.get("usage") ?? undefined;
    if (!attributeId || usage !== "specification") return;
    if (sharedAttributesLoading) return;

    const attribute = sharedAttributes.find((item) => item.id === attributeId);
    if (!attribute?.isSpecificationAttribute) return;

    preselectHandledRef.current = true;
    const timer = window.setTimeout(() => {
      focusFormTabSection("content");
      setForm((prev) => {
        if (prev.attributeAssignments.some((row) => row.attributeId === attributeId)) {
          return prev;
        }
        return {
          ...prev,
          attributeAssignments: [
            ...prev.attributeAssignments,
            {
              clientKey: `assign-preselect-${attributeId}`,
              attributeId,
              useCustomValue: false,
              sortOrder: prev.attributeAssignments.length,
            },
          ],
        };
      });
      requestAnimationFrame(() => {
        attributeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    preselectAttributeId,
    preselectUsage,
    searchParams,
    sharedAttributes,
    sharedAttributesLoading,
  ]);

  useEffect(() => {
    if (form.id || !form.categoryId) {
      if (!form.id) {
        const timer = window.setTimeout(() => {
          setProductCodePreview(null);
          setCategorySkuCode(null);
          setProductCodePreviewError(null);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    let cancelled = false;
    void fetch("/api/admin/products/sku-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: form.categoryId }),
    })
      .then(async (res) => {
        const data = await res.json() as {
          productCodePreview?: string | null;
          categorySkuCode?: string | null;
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setProductCodePreview(null);
          setCategorySkuCode(data.categorySkuCode ?? null);
          setProductCodePreviewError(data.message ?? "Không thể xem ID dự kiến.");
          return;
        }
        setProductCodePreview(data.productCodePreview ?? null);
        setCategorySkuCode(data.categorySkuCode ?? null);
        setProductCodePreviewError(null);
      })
      .catch(() => {
        if (!cancelled) setProductCodePreviewError("Không thể xem ID dự kiến.");
      });

    return () => {
      cancelled = true;
    };
  }, [form.categoryId, form.id]);

  function setField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof key === "string") {
      setFieldErrors((prev) => clearFieldErrorsForEdit(prev, key));
    }
  }

  function clearFieldErrorKey(fieldKey: string) {
    setFieldErrors((prev) => clearFieldErrorsForEdit(prev, fieldKey));
  }

  async function reloadProductFromServer(): Promise<boolean> {
    const productId = formRef.current.id;
    if (!productId) return false;
    try {
      const res = await fetch(`/api/admin/products/${productId}`);
      if (!res.ok) return false;
      const product = (await res.json()) as {
        options: Parameters<typeof mapOptionsToFormRows>[0];
        variants: Parameters<typeof mapVariantsToFormRows>[0];
      };
      const nextOptions = mapOptionsToFormRows(product.options ?? []);
      const nextVariants = mapVariantsToFormRows(product.variants ?? []).filter(
        (variant) => !variant.id || !deletedVariantIdsRef.current.has(variant.id),
      );
      setForm((prev) => ({
        ...prev,
        options: nextOptions,
        variants: nextVariants,
      }));
      formRef.current = {
        ...formRef.current,
        options: nextOptions,
        variants: nextVariants,
      };
      return true;
    } catch {
      return false;
    }
  }

  function handleVariantDeleted(variantId: string) {
    deletedVariantIdsRef.current.add(variantId);
  }

  function moveGallery(idx: number, dir: -1 | 1) {
    const arr = [...form.gallery];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setField("gallery", arr);
  }

  function applyValidationErrors(errors: Record<string, string>, summaryMessage: string) {
    const normalized = normalizeProductFormFieldErrors(errors, {
      attributeAssignments: form.attributeAssignments,
      options: form.options,
      specifications: form.specifications,
      customizations: form.customizations,
    });
    setFieldErrors(normalized);
    const firstField = Object.keys(normalized)[0];
    if (firstField === "publicSizeChart") {
      setActiveTab("content");
      requestAnimationFrame(() => {
        scrollToFormSection("section-size-chart");
        scrollToFirstFieldError(normalized);
      });
    } else if (firstField) {
      focusFormTabSection(resolveTabForField(firstField, { form, sharedAttributes }));
      requestAnimationFrame(() => scrollToFirstFieldError(normalized));
    } else {
      requestAnimationFrame(() => scrollToFirstFieldError(normalized));
    }
    setError(summaryMessage);
  }

  async function handleFocusError(descriptor: ProductFormErrorDescriptor) {
    if (descriptor.key === "publicSizeChart" || descriptor.focusTarget === "publicSizeChart") {
      setActiveTab("content");
      requestAnimationFrame(() => scrollToFormSection("section-size-chart"));
      return;
    }
    await focusProductFormError(descriptor, {
      setActiveTab: focusFormTabSection,
    });
  }

  function buildValidAttributeAssignments() {
    return form.attributeAssignments
      .filter((row) => {
        const customValue = row.useCustomValue ? row.customValue?.trim() : "";
        const sharedValueId = row.useCustomValue ? "" : row.attributeValueId?.trim();
        return Boolean(customValue || sharedValueId);
      })
      .map((row, index) => ({
        id: row.id,
        attributeId: row.attributeId,
        attributeValueId: row.useCustomValue ? null : row.attributeValueId || null,
        customValue: row.useCustomValue ? row.customValue?.trim() || null : null,
        sortOrder: row.sortOrder ?? index,
      }));
  }

  function buildMatrixDraftPayload() {
    const payload = buildPayload();
    return {
      ...payload,
      status: "DRAFT",
      attributeAssignments: buildValidAttributeAssignments(),
      variants: [],
    };
  }

  function consumeMatrixAutoOpenParam() {
    if (searchParams.get("generateVariants") !== "1") return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("generateVariants");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function tryOpenMatrixFromQueryParam() {
    if (searchParams.get("generateVariants") !== "1") return;
    if (!form.id || matrixAutoOpenTriggeredRef.current) return;
    matrixAutoOpenTriggeredRef.current = true;
    variantsSectionRef.current?.openMatrixConfirmation();
    consumeMatrixAutoOpenParam();
  }

  useEffect(() => {
    tryOpenMatrixFromQueryParam();
  }, [form.id, form.options, searchParams]);

  function parseNumberField(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const n = parseFloat(trimmed.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }

  const automaticSalesBadgePreview = useMemo(
    () =>
      resolveAutomaticSalesBadgePreviews({
        defaultMoq: parseNumberField(form.defaultMoq) ?? null,
        supportsPrinting: form.supportsPrinting,
        supportsOem: form.supportsOem,
      }),
    [form.defaultMoq, form.supportsPrinting, form.supportsOem],
  );

  const curatedBadgeLimitReached = form.curatedSalesBadges.length >= 2;

  function toggleCuratedSalesBadge(key: ProductCuratedBadgeKey) {
    setForm((prev) => {
      const selected = prev.curatedSalesBadges.includes(key);
      if (selected) {
        return {
          ...prev,
          curatedSalesBadges: prev.curatedSalesBadges.filter((item) => item !== key),
        };
      }
      if (prev.curatedSalesBadges.length >= 2) return prev;
      return {
        ...prev,
        curatedSalesBadges: [...prev.curatedSalesBadges, key],
      };
    });
    clearFieldErrorKey("curatedSalesBadges");
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      ...(form.slug !== undefined ? { slug: form.slug.trim() || undefined } : {}),
      ...(form.id && allowManualProductCode
        ? { productCode: form.productCode.trim() || undefined }
        : form.id
          ? {}
          : {}),
      categoryId: form.categoryId,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
      ...(legacyFitClearPending
        ? { fit: null }
        : initialLegacyFit
          ? { fit: initialLegacyFit }
          : {}),
      defaultMoq: form.defaultMoq.trim() ? parseNumberField(form.defaultMoq) : undefined,
      leadTime: form.leadTime.trim() || undefined,
      useCases: form.useCases.split(",").map((s) => s.trim()).filter(Boolean),
      targetCustomers: form.targetCustomers.split(",").map((s) => s.trim()).filter(Boolean),
      supportsPrinting: form.supportsPrinting,
      supportsEmbroidery: form.supportsEmbroidery,
      supportsOem: form.supportsOem,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      status: form.status,
      curatedSalesBadges: form.curatedSalesBadges,
      publicSizeChart: form.publicSizeChart,
      featuredImage: form.featuredImage.trim() || undefined,
      gallery: form.gallery.map((url) => url.trim()).filter(Boolean),
      specifications: form.specifications
        .filter((row) => row.label.trim() && row.value.trim())
        .map((row, index) => ({
          id: row.id,
          label: row.label.trim(),
          value: row.value.trim(),
          sortOrder: row.sortOrder ?? index,
        })),
      customizations: form.customizations
        .filter((row) => row.label.trim())
        .map((row, index) => ({
          id: row.id,
          label: row.label.trim(),
          description: row.description?.trim() || undefined,
          sortOrder: row.sortOrder ?? index,
          enabled: row.enabled !== false,
        })),
      attributeAssignments: form.attributeAssignments.map((row, index) => ({
        id: row.id,
        attributeId: row.attributeId,
        attributeValueId: row.useCustomValue ? null : row.attributeValueId || null,
        customValue: row.useCustomValue ? row.customValue?.trim() || null : null,
        sortOrder: row.sortOrder ?? index,
      })),
      options: buildPersistedOptionsPayload(form.options),
      variants: form.variants.map((v) => ({
        id: v.id,
        clientKey: v.clientKey,
        sku: v.sku.trim() || undefined,
        colorName: v.colorName.trim() || undefined,
        colorCode: v.colorCode.trim() || undefined,
        sizeName: v.sizeName.trim() || undefined,
        dimensions: v.dimensions.trim() || undefined,
        capacity: v.capacity.trim() || undefined,
        displayLabel: v.displayLabel.trim() || undefined,
        moqOverride: v.moqOverride.trim() ? parseNumberField(v.moqOverride) : undefined,
        leadTimeOverride: v.leadTimeOverride.trim() || undefined,
        materialOverride: v.materialOverride.trim() || undefined,
        optionValueIds:
          v.variantKind === "structured" && v.optionValueIds.length
            ? v.optionValueIds.map((id) => resolveOptionValueRefFromGroups(form.options, id))
            : undefined,
        wholesalePrice: v.wholesalePrice.trim() ? parseNumberField(v.wholesalePrice) : undefined,
        dealerPrice: v.dealerPrice.trim() ? parseNumberField(v.dealerPrice) : undefined,
        stockQty: v.stockQty.trim() ? parseInt(v.stockQty, 10) : 0,
        stockStatus: v.stockStatus,
        variantStatus: v.variantStatus,
        internalNote: v.internalNote.trim() || undefined,
        imageUrl: v.imageUrl.trim() || undefined,
      })),
    };
  }

  /**
   * Persist current in-memory option groups once before server matrix preview.
   * Always reads latest form via formRef (not a stale render closure).
   * Returns options fingerprint on success so execute can detect later edits.
   */
  async function ensureOptionsSavedForMatrix(): Promise<string | null> {
    const latest = formRef.current;
    if (!latest.id) return buildOptionsFingerprint(latest.options);

    const expectedValueCount = countActiveOptionValues(latest.options);
    const localErrors = validateProductDraftForMatrixGeneration(latest);
    const optionErrors = Object.fromEntries(
      Object.entries(localErrors).filter(([key]) => key.startsWith("options")),
    );
    if (Object.keys(optionErrors).length > 0) {
      applyValidationErrors(
        optionErrors,
        "Lưu nhóm biến thể trước khi tạo tổ hợp. Vui lòng sửa các trường được đánh dấu.",
      );
      return null;
    }

    const optionsPayload = buildPersistedOptionsPayload(latest.options);
    const res = await fetch(`/api/admin/products/${latest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: optionsPayload }),
    });
    const body = (await res.json()) as {
      message?: string;
      error?: string;
      fieldErrors?: Record<string, string>;
      options?: Parameters<typeof mapOptionsToFormRows>[0];
      variants?: Parameters<typeof mapVariantsToFormRows>[0];
    };
    if (!res.ok) {
      applyValidationErrors(
        body.fieldErrors ?? { options: body.error ?? body.message ?? "Không thể lưu nhóm tuỳ chọn." },
        body.error ?? body.message ?? "Không thể lưu nhóm tuỳ chọn.",
      );
      return null;
    }

    // Prefer server-returned option groups with fresh IDs; otherwise force reload.
    let nextOptions = body.options ? mapOptionsToFormRows(body.options) : null;
    let nextVariants = body.variants
      ? mapVariantsToFormRows(body.variants).filter(
          (variant) => !variant.id || !deletedVariantIdsRef.current.has(variant.id),
        )
      : null;

    if (!nextOptions || optionGroupsMissingPersistedIds(nextOptions)) {
      const reloaded = await reloadProductFromServer();
      if (!reloaded) {
        setError(OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR);
        setFieldErrors({ options: OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR });
        return null;
      }
      nextOptions = formRef.current.options;
      nextVariants = formRef.current.variants;
    } else {
      setForm((prev) => ({
        ...prev,
        options: nextOptions!,
        variants: nextVariants ?? prev.variants,
      }));
      formRef.current = {
        ...formRef.current,
        options: nextOptions,
        variants: nextVariants ?? formRef.current.variants,
      };
    }

    if (
      optionGroupsMissingPersistedIds(nextOptions) ||
      countActiveOptionValues(nextOptions) < expectedValueCount
    ) {
      setError(OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR);
      setFieldErrors({ options: OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR });
      return null;
    }

    return buildOptionsFingerprint(nextOptions);
  }

  async function saveProduct(stayOnVariants = false): Promise<boolean> {
    if (matrixBusy) {
      setError("Đang tạo tổ hợp biến thể. Vui lòng đợi hoàn tất rồi lưu sản phẩm.");
      return false;
    }
    setError(null);
    setErrorDetail(null);
    setFieldErrors({});

    const localErrors = validateProductCatalogFormLocal(form);
    const categoryError = validateProductCategorySelection(form.categoryId, categories);
    if (categoryError) {
      localErrors.categoryId = categoryError;
    }
    const sizeChartError = validateProductSizeChartForSave(form.publicSizeChart);
    if (sizeChartError && form.status === "ACTIVE") {
      localErrors.publicSizeChart = sizeChartError;
    }
    if (Object.keys(localErrors).length > 0) {
      applyValidationErrors(
        localErrors,
        form.id
          ? "Không thể lưu sản phẩm. Vui lòng kiểm tra các trường được đánh dấu."
          : "Không thể tạo sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
      );
      return false;
    }

    setSaving(true);
    const payload = buildPayload();
    const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
    const method = form.id ? "PATCH" : "POST";

    const saved = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: stayOnVariants ? "Đã lưu sản phẩm. Tiếp tục thiết lập biến thể." : "Đã lưu thông tin.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as {
          id?: string;
          productCode?: string;
          slug?: string;
          message?: string;
          error?: string;
          detail?: string;
          code?: string;
          fieldErrors?: Record<string, string>;
          issues?: Array<{ field: string; message: string }>;
          options?: Parameters<typeof mapOptionsToFormRows>[0];
          variants?: Parameters<typeof mapVariantsToFormRows>[0];
        };
        if (!res.ok) {
          setErrorDetail(
            process.env.NODE_ENV === "development" ? body.detail ?? null : null,
          );
          const summary =
            body.code === SEO_PUBLISH_QUALITY_GATE_FAILED
              ? SEO_PUBLISH_QUALITY_SUMMARY
              : body.error ?? body.message ?? "Không thể lưu sản phẩm.";
          if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
            applyValidationErrors(body.fieldErrors, summary);
          } else {
            setError(summary);
          }
          return { ok: false as const, message: summary };
        }
        return { ok: true as const, data: body };
      },
      onSuccess: (product) => {
        if (stayOnVariants && product?.id) {
          setForm((prev) => {
            const next = {
              ...prev,
              id: product.id,
              productCode: product.productCode ?? prev.productCode,
              slug: product.slug ?? prev.slug,
              options: product.options ? mapOptionsToFormRows(product.options) : prev.options,
              variants: product.variants
                ? mapVariantsToFormRows(product.variants).filter(
                    (variant) => !variant.id || !deletedVariantIdsRef.current.has(variant.id),
                  )
                : prev.variants,
            };
            queueMicrotask(() => setSavedFormSnapshot(JSON.stringify(next)));
            return next;
          });
          focusFormTabSection("variants");
          if (!form.id) {
            router.replace(`/admin/products/${product.id}/edit`);
          }
          router.refresh();
          return;
        }
        router.push("/admin/products");
        router.refresh();
      },
    });

    setSaving(false);
    return Boolean(saved);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveProduct(false);
  }

  async function saveProductForMatrixGeneration(): Promise<boolean> {
    setError(null);
    setErrorDetail(null);
    setFieldErrors({});

    const localErrors = validateProductDraftForMatrixGeneration(form);
    if (Object.keys(localErrors).length > 0) {
      applyValidationErrors(
        localErrors,
        form.id
          ? "Không thể lưu sản phẩm. Vui lòng kiểm tra các trường được đánh dấu."
          : "Không thể tạo sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
      );
      return false;
    }

    setSaving(true);
    const payload = buildMatrixDraftPayload();
    const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
    const method = form.id ? "PATCH" : "POST";

    const saved = await mutate({
      loadingMessage: "Đang lưu sản phẩm…",
      successMessage: "Đã lưu sản phẩm. Tiếp tục tạo tổ hợp biến thể.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as {
          id?: string;
          productCode?: string;
          slug?: string;
          message?: string;
          error?: string;
          detail?: string;
          code?: string;
          fieldErrors?: Record<string, string>;
          issues?: Array<{ field: string; message: string }>;
          options?: Parameters<typeof mapOptionsToFormRows>[0];
          variants?: Parameters<typeof mapVariantsToFormRows>[0];
        };
        if (!res.ok) {
          setErrorDetail(
            process.env.NODE_ENV === "development" ? body.detail ?? null : null,
          );
          const summary =
            body.code === SEO_PUBLISH_QUALITY_GATE_FAILED
              ? SEO_PUBLISH_QUALITY_SUMMARY
              : body.error ?? body.message ?? "Không thể lưu sản phẩm.";
          if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
            applyValidationErrors(body.fieldErrors, summary);
          } else {
            setError(summary);
          }
          return { ok: false as const, message: summary };
        }
        return { ok: true as const, data: body };
      },
      onSuccess: (product) => {
        if (!product?.id) return;
        setForm((prev) => ({
          ...prev,
          id: product.id,
          productCode: product.productCode ?? prev.productCode,
          slug: product.slug ?? prev.slug,
          options: product.options ? mapOptionsToFormRows(product.options) : prev.options,
          variants: product.variants
            ? mapVariantsToFormRows(product.variants).filter(
                (variant) => !variant.id || !deletedVariantIdsRef.current.has(variant.id),
              )
            : [],
        }));
        setActiveTab("variants");
        matrixAutoOpenTriggeredRef.current = false;
        router.replace(`/admin/products/${product.id}/edit?generateVariants=1`);
        router.refresh();
        queueMicrotask(() => tryOpenMatrixFromQueryParam());
      },
    });

    setSaving(false);
    return Boolean(saved);
  }

  async function saveAndContinueForMatrix(): Promise<boolean> {
    return saveProductForMatrixGeneration();
  }

  const publicSlug = form.slug ?? "";
  const publicUrl = publicSlug ? `/san-pham/${publicSlug}` : null;

  useEffect(() => {
    if (searchParams.get("generateVariants") !== "1") return;
    requestAnimationFrame(() => scrollToFormSection("section-variants"));
  }, [searchParams]);

  return (
    <form
      className="admin-catalog-form admin-catalog-form--onescreen"
      onSubmit={(e) => void handleSubmit(e)}
      data-testid="product-catalog-form-onescreen"
    >
      {/* Header — shell already shows product title; keep compact meta only */}
      <div className="admin-catalog-form__header" data-testid="product-catalog-form-header">
        <div className="admin-catalog-form__header-main">
          {!form.id && <h2 className="admin-catalog-form__title">Thêm sản phẩm mới</h2>}
          <div className="admin-catalog-form__meta">
            {form.id && form.productCode && (
              <code className="admin-catalog-code" data-testid="product-editor-code">{form.productCode}</code>
            )}
            <span className={`admin-kb-badge admin-catalog-form__status admin-catalog-form__status--${form.status.toLowerCase()}`}>
              {form.status === "DRAFT"
                ? "Nháp"
                : form.status === "ACTIVE"
                  ? "Đang bán"
                  : form.status === "INACTIVE"
                    ? "Tạm dừng"
                    : "Lưu trữ"}
            </span>
          </div>
        </div>
        <div className="admin-catalog-form__header-actions">
          {form.id && (
            <>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setExportDialog("export")}>
                Xuất
              </button>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setExportDialog("clone")}>
                Nhân bản mẫu
              </button>
            </>
          )}
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">
              Xem trên website
            </a>
          )}
        </div>
      </div>

      {form.id && exportDialog && (
        <ProductExportDialog
          open
          onClose={() => setExportDialog(null)}
          defaultScope="single"
          productIds={[form.id]}
          cloneTemplate={exportDialog === "clone"}
        />
      )}

      <ProductCatalogFormErrorSummary
        descriptors={errorDescriptors}
        formError={error}
        errorDetail={errorDetail}
        onFocusError={(descriptor) => void handleFocusError(descriptor)}
      />

      <nav className="admin-catalog-section-nav" aria-label="Mục biểu mẫu sản phẩm">
        {FORM_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`admin-catalog-section-nav__link${activeTab === section.tab ? " is-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(section.tab);
              scrollToFormSection(section.id);
            }}
          >
            {section.label}
            {tabErrorCounts[section.tab] > 0 && (
              <span className="admin-catalog-tab__badge" aria-label={`${tabErrorCounts[section.tab]} lỗi`}>
                {tabErrorCounts[section.tab]}
              </span>
            )}
          </a>
        ))}
      </nav>

      <fieldset className="admin-catalog-fieldset admin-catalog-fieldset--dense" id="section-basic">
        <legend>1. Thông tin cơ bản</legend>
        <p className="admin-catalog-section-help">Tên, danh mục, mã sản phẩm, trạng thái và mô tả ngắn.</p>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field" data-field="name">
            <label className="admin-label">Tên sản phẩm <span className="admin-required">*</span></label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.name))}`}
              value={form.name}
              data-field="name"
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Áo thun CVC basic"
            />
            {fieldErrors.name && <p className="admin-field-error" role="alert">{fieldErrors.name}</p>}
          </div>
          <ProductCategoryCascadingPicker
            categories={categories}
            value={form.categoryId}
            onChange={(categoryId) => setField("categoryId", categoryId)}
            error={fieldErrors.categoryId}
            onClearError={() => clearFieldErrorKey("categoryId")}
          />
          <div className="admin-field" data-field="productCode">
            <label className="admin-label">
              {form.id ? "ID sản phẩm" : "ID sản phẩm tự động"}
            </label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.productCode))}`}
              value={form.id ? form.productCode : (productCodePreview ?? "")}
              readOnly={!form.id || !allowManualProductCode}
              data-field="productCode"
              aria-invalid={Boolean(fieldErrors.productCode)}
              placeholder={form.categoryId ? "Đang tải ID dự kiến…" : "Chọn danh mục để xem ID dự kiến"}
              onChange={(e) => {
                setField("productCode", e.target.value);
                clearFieldErrorKey("productCode");
              }}
            />
            {!form.id && form.categoryId && categorySkuCode && (
              <p className="admin-field-hint">
                Mã danh mục: <strong>{categorySkuCode}</strong>
                {productCodePreview && (
                  <> · ID sản phẩm dự kiến: <code className="admin-catalog-code">{productCodePreview}</code></>
                )}
              </p>
            )}
            {productCodePreviewError && (
              <p className="admin-error" style={{ marginTop: 4 }}>{productCodePreviewError}</p>
            )}
            {!form.id && (
              <p className="admin-field-hint">ID sản phẩm được tạo tự động khi lưu theo thứ tự danh mục (vd. TS0001, TS0002).</p>
            )}
            {form.id && !allowManualProductCode && (
              <button
                type="button"
                className="btn-tertiary btn-sm"
                style={{ marginTop: 6 }}
                onClick={() => setAllowManualProductCode(true)}
              >
                Chỉnh mã thủ công
              </button>
            )}
            {fieldErrors.productCode && <p className="admin-field-error" role="alert">{fieldErrors.productCode}</p>}
          </div>
          <div className="admin-field" data-field="slug">
            <label className="admin-label">Slug</label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.slug))}`}
              value={form.slug ?? ""}
              data-field="slug"
              onChange={(e) => setField("slug", e.target.value)}
              placeholder="tu-sinh-neu-bo-trong"
            />
            {fieldErrors.slug && <p className="admin-field-error" role="alert">{fieldErrors.slug}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select className="admin-input" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Tạm dừng</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
            {showProductPublishChecklist && (
              <PublishQualityChecklist
                items={productPublishChecklist}
                legacyWarning={showProductLegacySeoWarning}
              />
            )}
          </div>
        </div>
        <div className="admin-field">
          <div className="admin-content-suggest-label-row">
            <label className="admin-label">Mô tả ngắn</label>
            <ProductContentSuggestButton
              existingValue={form.shortDescription}
              preferRetryLabel
              onApply={() => suggestProductShortDescription(contentSuggestionInput)}
              onFilled={(value) => setField("shortDescription", Array.isArray(value) ? value.join(", ") : value)}
            />
          </div>
          <textarea className="admin-textarea" rows={2} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} />
        </div>
        <div className="admin-field">
          <div className="admin-content-suggest-label-row">
            <label className="admin-label">Tags (cách nhau bởi dấu phẩy)</label>
            <ProductContentSuggestButton
              existingValue={form.tags}
              preferRetryLabel
              onApply={() => suggestProductTags(contentSuggestionInput)}
              onFilled={(value) =>
                setField("tags", Array.isArray(value) ? joinSuggestedTags(value) : value)
              }
            />
          </div>
          <input className="admin-input" value={form.tags} onChange={(e) => setField("tags", e.target.value)} placeholder="áo thun trơn, CVC, nguồn hàng sỉ" />
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset admin-catalog-fieldset--dense" id="section-media" data-testid="section-media">
        <legend>2. Hình ảnh sản phẩm</legend>
        <p className="admin-catalog-section-help">Ảnh chính và gallery hiển thị trên trang sản phẩm.</p>
        <p className="admin-field-hint">Ảnh nên tối ưu 200–300KB trước khi upload.</p>

        <div className="admin-catalog-media-grid">
          <div className="admin-field" data-field="featuredImage">
            <label className="admin-label">Ảnh đại diện</label>
            <div className="admin-catalog-media-inline">
              <MediaPicker
                label="Ảnh đại diện"
                value={form.featuredImage}
                onChange={(url) => setField("featuredImage", url)}
                folder="products"
              />
              <input
                className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.featuredImage))}`}
                value={form.featuredImage}
                data-field="featuredImage"
                onChange={(e) => setField("featuredImage", e.target.value)}
                placeholder="URL ảnh hoặc chọn từ thư viện"
              />
            </div>
            {fieldErrors.featuredImage && (
              <p className="admin-field-error" role="alert">{fieldErrors.featuredImage}</p>
            )}
          </div>

          <div className="admin-field" data-field="curatedSalesBadges">
            <label className="admin-label">Nhãn trên ảnh đại diện</label>
            <div className="admin-catalog-sales-badge-chips">
              {PRODUCT_CURATED_BADGE_KEYS.map((key) => {
                const selected = form.curatedSalesBadges.includes(key);
                const disabled = !selected && curatedBadgeLimitReached;
                return (
                  <label
                    key={key}
                    className={`admin-catalog-sales-badge-chip${selected ? " admin-catalog-sales-badge-chip--selected" : ""}${disabled ? " admin-catalog-sales-badge-chip--disabled" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleCuratedSalesBadge(key)}
                    />
                    {PRODUCT_CURATED_BADGE_LABELS[key]}
                  </label>
                );
              })}
            </div>
            <p className="admin-field-hint">Đã chọn {form.curatedSalesBadges.length}/2</p>
            {fieldErrors.curatedSalesBadges && (
              <p className="admin-field-error" role="alert">{fieldErrors.curatedSalesBadges}</p>
            )}
            {automaticSalesBadgePreview.length > 0 && (
              <div className="admin-catalog-sales-badge-preview-list" style={{ marginTop: 6 }}>
                {automaticSalesBadgePreview.map((badge) => (
                  <span key={badge.key} className="admin-catalog-sales-badge-preview-item">
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="admin-field admin-catalog-gallery-field" data-compact-empty={form.gallery.length === 0 ? "true" : "false"}>
          <div className="admin-catalog-gallery-picker">
            <label className="admin-label" style={{ marginRight: 8 }}>Thư viện ảnh</label>
            <MediaPicker
              multiple={true}
              selectedUrls={form.gallery}
              onAdd={(urls) => {
                const existing = new Set(form.gallery);
                const toAdd = urls.filter((u) => !existing.has(u));
                setField("gallery", [...form.gallery, ...toAdd]);
              }}
              folder="products"
            />
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => setField("gallery", [...form.gallery, ""])}>
              + URL
            </button>
          </div>
          {form.gallery.length === 0 ? (
            <p className="admin-field-hint admin-catalog-gallery-empty">Chưa có ảnh gallery.</p>
          ) : (
            <div className="admin-catalog-gallery-list">
              {form.gallery.map((url, idx) => (
                <div key={idx} className="admin-catalog-gallery-row">
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid #e5e7eb", flexShrink: 0 }} />
                  )}
                  <input
                    className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors[`gallery.${idx}`]))}`}
                    value={url}
                    data-field={`gallery.${idx}`}
                    onChange={(e) => {
                      const next = [...form.gallery];
                      next[idx] = e.target.value;
                      setField("gallery", next);
                      clearFieldErrorKey(`gallery.${idx}`);
                    }}
                    placeholder="URL ảnh gallery"
                  />
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" title="Di chuyển lên" disabled={idx === 0} onClick={() => moveGallery(idx, -1)}>↑</button>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" title="Di chuyển xuống" disabled={idx === form.gallery.length - 1} onClick={() => moveGallery(idx, 1)}>↓</button>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" title="Xóa ảnh" onClick={() => setField("gallery", form.gallery.filter((_, i) => i !== idx))}>✕</button>
                  {fieldErrors[`gallery.${idx}`] && (
                    <p className="admin-field-error" role="alert" style={{ flex: "1 1 100%" }}>
                      {fieldErrors[`gallery.${idx}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Thông tin B2B ───────────────────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset admin-catalog-fieldset--dense" id="section-b2b">
        <legend>3. Thông tin bán sỉ / B2B</legend>
        <p className="admin-catalog-section-help">Chất liệu, form, MOQ, lead time và tùy chọn hỗ trợ OEM/in/thêu.</p>
        <div className="admin-seo-brief-form-grid">
          <ProductB2BSharedAttributeField
            attributeCode="MATERIAL"
            label="Chất liệu"
            customValueActionLabel="Nhập chất liệu riêng"
            assignments={form.attributeAssignments}
            sharedAttributes={sharedAttributes}
            sharedAttributesLoading={sharedAttributesLoading}
            fieldErrors={fieldErrors}
            onAssignmentsChange={(attributeAssignments) => setField("attributeAssignments", attributeAssignments)}
            onRefreshSharedAttributes={loadSharedAttributes}
          />
          <div className="admin-field">
            <ProductB2BSharedAttributeField
              attributeCode="FIT"
              label="Form / Kiểu dáng"
              customValueActionLabel="Nhập form riêng"
              assignments={form.attributeAssignments}
              sharedAttributes={sharedAttributes}
              sharedAttributesLoading={sharedAttributesLoading}
              fieldErrors={fieldErrors}
              onAssignmentsChange={(attributeAssignments) => setField("attributeAssignments", attributeAssignments)}
              onRefreshSharedAttributes={loadSharedAttributes}
            />
            {initialLegacyFit && !legacyFitClearPending && (
              <div className="admin-field-hint" style={{ marginTop: 8 }}>
                Fit cũ: {initialLegacyFit}
                {" "}
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => {
                    if (!window.confirm("Xóa dữ liệu Fit cũ khỏi sản phẩm khi lưu?")) return;
                    setLegacyFitClearPending(true);
                  }}
                >
                  Xóa dữ liệu Fit cũ
                </button>
              </div>
            )}
            {legacyFitClearPending && (
              <p className="admin-field-hint" style={{ marginTop: 8 }}>
                Dữ liệu Fit cũ sẽ được xóa khi lưu sản phẩm.
              </p>
            )}
          </div>
          <div className="admin-field" data-field="defaultMoq">
            <label className="admin-label">MOQ tối thiểu (cái)</label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.defaultMoq))}`}
              type="number"
              min="1"
              data-field="defaultMoq"
              value={form.defaultMoq}
              onChange={(e) => setField("defaultMoq", e.target.value)}
              placeholder="50"
            />
            {fieldErrors.defaultMoq && <p className="admin-field-error" role="alert">{fieldErrors.defaultMoq}</p>}
            <p className="admin-field-hint">Số lượng tối thiểu cho một đơn sỉ</p>
          </div>
          <div className="admin-field" data-field="leadTime">
            <label className="admin-label">Lead-time (thời gian giao/sản xuất)</label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.leadTime))}`}
              value={form.leadTime}
              data-field="leadTime"
              onChange={(e) => setField("leadTime", e.target.value)}
              placeholder="Có sẵn: 1–3 ngày"
            />
            {fieldErrors.leadTime && <p className="admin-field-error" role="alert">{fieldErrors.leadTime}</p>}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {LEAD_TIME_PRESETS.map((preset) => (
                <button key={preset} type="button" className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => setField("leadTime", preset)}>
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Ứng dụng B2B (cách nhau bởi dấu phẩy)</label>
            <input className="admin-input" value={form.useCases} onChange={(e) => setField("useCases", e.target.value)} placeholder="Xưởng in, Đồng phục công ty, Đại lý sỉ" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Đối tượng phù hợp (cách nhau bởi dấu phẩy)</label>
            <input className="admin-input" value={form.targetCustomers} onChange={(e) => setField("targetCustomers", e.target.value)} placeholder="Đại lý sỉ, Doanh nghiệp, Agency" />
          </div>
        </div>

        <div className="admin-catalog-toggles">
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={form.supportsPrinting} onChange={(e) => setField("supportsPrinting", e.target.checked)} />
            Hỗ trợ in
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={form.supportsEmbroidery} onChange={(e) => setField("supportsEmbroidery", e.target.checked)} />
            Hỗ trợ thêu
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={form.supportsOem} onChange={(e) => setField("supportsOem", e.target.checked)} />
            Hỗ trợ OEM
          </label>
        </div>
      </fieldset>

      {/* ── Biến thể ─────────────────────────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset admin-catalog-fieldset--dense" id="section-variants">
        <legend>4. Biến thể &amp; thuộc tính</legend>
        <p className="admin-catalog-section-help">Chọn thuộc tính dùng chung, tạo tổ hợp biến thể. Quản lý màu sắc toàn cục tại trang thuộc tính.</p>
        <ProductCatalogVariantsSection
          ref={variantsSectionRef}
          productId={form.id}
          productCode={form.productCode || productCodePreview || ""}
          defaultMoq={form.defaultMoq}
          defaultLeadTime={form.leadTime}
          optionGroups={form.options}
          variants={form.variants}
          sharedAttributes={sharedAttributes}
          sharedAttributesLoading={sharedAttributesLoading}
          sharedAttributesError={sharedAttributesError}
          onRefreshSharedAttributes={() => void loadSharedAttributes()}
          fieldErrors={fieldErrors}
          onOptionGroupsChange={(options) => setField("options", options)}
          onVariantsChange={(variants) => setField("variants", variants)}
          onReloadProduct={reloadProductFromServer}
          onBeforeMatrixGenerate={ensureOptionsSavedForMatrix}
          productSaveInProgress={saving}
          onMatrixBusyChange={setMatrixBusy}
          onSaveAndContinue={saveAndContinueForMatrix}
          onVariantDeleted={handleVariantDeleted}
          onBulkOperationChange={setBulkOpInProgress}
        />
        {fieldErrors.options && (
          <p className="admin-field-error" role="alert">{fieldErrors.options}</p>
        )}
      </fieldset>

      <fieldset className="admin-catalog-fieldset admin-catalog-fieldset--dense" id="section-size-chart" data-field="publicSizeChart">
        <legend>5. Bảng size</legend>
        <p className="admin-catalog-section-help">Bật và chỉnh bảng size công khai khi cần hiển thị trên trang sản phẩm.</p>
        <div className="admin-content-suggest-section-actions">
          <ProductContentSuggestButton
            label="Gợi ý ghi chú bảng size"
            existingValue={form.publicSizeChart.note ?? ""}
            preferRetryLabel
            onApply={() => suggestProductSizeChartNote(contentSuggestionInput)}
            onFilled={(value) =>
              setField("publicSizeChart", {
                ...form.publicSizeChart,
                note: Array.isArray(value) ? value.join(" ") : value,
              })
            }
          />
        </div>
        <ProductSizeChartEditor
          value={form.publicSizeChart}
          onChange={(publicSizeChart) => {
            setField("publicSizeChart", publicSizeChart);
            clearFieldErrorKey("publicSizeChart");
          }}
          options={form.options}
          variants={form.variants}
          error={fieldErrors.publicSizeChart}
        />
      </fieldset>

      <fieldset className="admin-catalog-fieldset admin-catalog-fieldset--dense" id="section-content">
        <legend>6. Nội dung chi tiết</legend>
        <p className="admin-catalog-section-help">Mô tả dài, thông số nổi bật và khả năng tùy chỉnh.</p>

        <details className="admin-catalog-accordion" open data-testid="content-accordion-description">
          <summary>Mô tả</summary>
          <div className="admin-field" data-field="description">
            <div className="admin-content-suggest-label-row">
              <label className="admin-label">Mô tả sản phẩm đầy đủ</label>
              <ProductContentSuggestButton
                existingValue={form.description}
                preferRetryLabel
                onApply={() => suggestProductLongDescription(contentSuggestionInput)}
                onFilled={(value) => setField("description", Array.isArray(value) ? value.join("\n") : value)}
              />
            </div>
            <textarea
              className={`admin-textarea${fieldErrorInputClass(Boolean(fieldErrors.description))}`}
              rows={5}
              data-field="description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
            {fieldErrors.description && <p className="admin-field-error" role="alert">{fieldErrors.description}</p>}
          </div>
        </details>

        <details
          className="admin-catalog-accordion"
          open={form.attributeAssignments.length > 0}
          data-testid="content-accordion-attributes"
        >
          <summary>Thuộc tính sản phẩm ({form.attributeAssignments.length})</summary>
          <ProductInformationAttributesSection
            rows={form.attributeAssignments}
            sharedAttributes={sharedAttributes}
            sharedAttributesLoading={sharedAttributesLoading}
            sharedAttributesError={sharedAttributesError}
            fieldErrors={fieldErrors}
            onChange={(attributeAssignments) => setField("attributeAssignments", attributeAssignments)}
            onRefreshSharedAttributes={loadSharedAttributes}
            sectionRef={attributeSectionRef}
          />
        </details>

        <details
          className="admin-catalog-accordion"
          open={form.specifications.length > 0}
          data-testid="content-accordion-specs"
        >
          <summary>Thông số nổi bật ({form.specifications.length})</summary>
          <div className="admin-content-suggest-section-actions">
            <ProductContentSuggestButton
              label="Gợi ý thông số"
              existingValue={form.specifications.map((row) => `${row.label} ${row.value}`).join(" ")}
              onApply={() => {
                const rows = suggestProductSpecificationSummary(contentSuggestionInput);
                if (!rows.length) return null;
                return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
              }}
              onFilled={() => {
                const rows = suggestProductSpecificationSummary(contentSuggestionInput);
                if (!rows.length) return;
                setField(
                  "specifications",
                  rows.map((row, index) => ({
                    clientKey: `spec-suggest-${index}`,
                    label: row.label,
                    value: row.value,
                    sortOrder: index,
                  })),
                );
              }}
            />
          </div>
          <ProductCatalogSpecificationsSection
            rows={form.specifications}
            fieldErrors={fieldErrors}
            onChange={(specifications) => setField("specifications", specifications)}
            onFieldEdit={clearFieldErrorKey}
          />
        </details>

        <details
          className="admin-catalog-accordion"
          open={form.customizations.length > 0}
          data-testid="content-accordion-customizations"
        >
          <summary>Khả năng tùy chỉnh ({form.customizations.length})</summary>
          <div className="admin-content-suggest-section-actions">
            <ProductContentSuggestButton
              label="Gợi ý tùy chỉnh"
              existingValue={form.customizations.map((row) => row.label).join(" ")}
              onApply={() => {
                const note = suggestProductCustomizationNote(contentSuggestionInput);
                return note?.label ?? null;
              }}
              onFilled={() => {
                const note = suggestProductCustomizationNote(contentSuggestionInput);
                if (!note?.label.trim()) return;
                setField("customizations", [
                  ...form.customizations,
                  {
                    clientKey: `cust-suggest-${Date.now()}`,
                    label: note.label,
                    description: note.description ?? "",
                    enabled: true,
                    sortOrder: form.customizations.length,
                  },
                ]);
              }}
            />
          </div>
          <ProductCatalogContentSection
            rows={form.customizations}
            fieldErrors={fieldErrors}
            onChange={(customizations) => setField("customizations", customizations)}
            onFieldEdit={clearFieldErrorKey}
          />
        </details>
      </fieldset>

      <fieldset className="admin-catalog-fieldset admin-catalog-fieldset--dense" id="section-seo">
        <legend>7. SEO &amp; hiển thị website</legend>
        <p className="admin-catalog-section-help">Tiêu đề/mô tả SEO và tùy chọn hiển thị nâng cao.</p>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field" data-field="seoTitle">
            <div className="admin-content-suggest-label-row">
              <label className="admin-label">SEO title</label>
              <ProductContentSuggestButton
                existingValue={form.seoTitle}
                preferRetryLabel
                onApply={() => suggestProductSeoTitle(contentSuggestionInput)}
                onFilled={(value) => setField("seoTitle", Array.isArray(value) ? value.join(" ") : value)}
              />
            </div>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.seoTitle))}`}
              data-field="seoTitle"
              value={form.seoTitle}
              onChange={(e) => setField("seoTitle", e.target.value)}
            />
            {fieldErrors.seoTitle && <p className="admin-field-error" role="alert">{fieldErrors.seoTitle}</p>}
          </div>
          <div className="admin-field" data-field="seoDescription">
            <div className="admin-content-suggest-label-row">
              <label className="admin-label">SEO description</label>
              <ProductContentSuggestButton
                existingValue={form.seoDescription}
                preferRetryLabel
                onApply={() => suggestProductSeoDescription(contentSuggestionInput)}
                onFilled={(value) =>
                  setField("seoDescription", Array.isArray(value) ? value.join(" ") : value)
                }
              />
            </div>
            <textarea
              className={`admin-textarea${fieldErrorInputClass(Boolean(fieldErrors.seoDescription))}`}
              rows={2}
              data-field="seoDescription"
              value={form.seoDescription}
              onChange={(e) => setField("seoDescription", e.target.value)}
            />
            {fieldErrors.seoDescription && <p className="admin-field-error" role="alert">{fieldErrors.seoDescription}</p>}
          </div>
        </div>
        {publicUrl && (
          <p className="admin-field-hint">
            Xem trước công khai: <a href={publicUrl} target="_blank" rel="noopener noreferrer">{publicUrl}</a>
          </p>
        )}
        {showProductPublishChecklist && (
          <PublishQualityChecklist
            items={productPublishChecklist}
            legacyWarning={showProductLegacySeoWarning}
          />
        )}
      </fieldset>

      {form.id && (
        <details className="admin-catalog-accordion admin-catalog-accordion--material" data-testid="product-material-accordion">
          <summary>Vật tư / BOM &amp; costing nâng cao</summary>
          <ProductMaterialSection productId={form.id} />
        </details>
      )}

      <div className="admin-catalog-form__sticky-actions" id="section-save" data-testid="product-sticky-save-bar">
        <AdminLoadingButton
          type="submit"
          variant="primary"
          pending={saving || bulkOpInProgress || matrixBusy}
          pendingLabel={
            matrixBusy
              ? "Đang tạo tổ hợp biến thể..."
              : saving
                ? "Đang lưu sản phẩm..."
                : "Đang cập nhật biến thể..."
          }
          disabled={matrixBusy}
        >
          {form.id ? "Lưu thay đổi" : "Tạo sản phẩm"}
        </AdminLoadingButton>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => router.push("/admin/products")}>
          Hủy
        </button>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary">
            Xem trên website ↗
          </a>
        )}
        {form.id && (
          <span
            className={`admin-catalog-form__dirty-hint${isFormDirty ? " is-dirty" : ""}`}
            data-testid="product-editor-dirty-state"
            aria-live="polite"
          >
            {isFormDirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ"}
          </span>
        )}
      </div>
    </form>
  );
}
