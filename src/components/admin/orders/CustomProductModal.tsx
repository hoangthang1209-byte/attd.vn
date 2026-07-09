"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderProductGender } from "@prisma/client";
import AdminQuickCreateShell from "@/components/admin/AdminQuickCreateShell";
import MediaPicker from "@/components/admin/media/MediaPicker";
import { ORDER_PRODUCT_GENDER_OPTIONS } from "@/features/orders/order-gender";
import type { ColorRecord } from "@/features/colors/color.service";
import type { CategoryOption } from "@/components/admin/orders/QuickAddCategoryModal";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

export type CustomProductResult = {
  productId: string;
  variantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string;
  systemCode?: string | null;
  colorId: string;
  categoryId: string;
  gender: OrderProductGender;
  colorSnapshot: string;
  categorySnapshot: string;
  genderSnapshot: string;
  description: string | null;
  designImageUrl: string | null;
  moqSnapshot: number | null;
  productionLeadTime: string | null;
  unit: string;
};

type Props = {
  open: boolean;
  customerCode: string;
  colors: ColorRecord[];
  categories: CategoryOption[];
  onClose: () => void;
  onCreated: (result: CustomProductResult) => void;
  onAddColor: () => void;
  onAddCategory: () => void;
  selectColorId?: string | null;
  selectCategoryId?: string | null;
};

const FORM_ID = "custom-product-form";

export default function CustomProductModal({
  open,
  customerCode,
  colors,
  categories,
  onClose,
  onCreated,
  onAddColor,
  onAddCategory,
  selectColorId,
  selectCategoryId,
}: Props) {
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [colorId, setColorId] = useState("");
  const [gender, setGender] = useState<OrderProductGender>("UNISEX");
  const [description, setDescription] = useState("");
  const [defaultMoq, setDefaultMoq] = useState("");
  const [unit, setUnit] = useState("cái");
  const [designImageUrl, setDesignImageUrl] = useState<string | null>(null);
  const [productionLeadTime, setProductionLeadTime] = useState("");
  const [sizeName, setSizeName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectColorId) {
      setColorId(selectColorId);
      if (fieldErrors.colorId) setFieldErrors((p) => ({ ...p, colorId: "" }));
    }
  }, [selectColorId]);

  useEffect(() => {
    if (selectCategoryId) {
      setCategoryId(selectCategoryId);
      if (fieldErrors.categoryId) setFieldErrors((p) => ({ ...p, categoryId: "" }));
    }
  }, [selectCategoryId]);

  function resetForm() {
    setName("");
    setCategoryId("");
    setColorId("");
    setGender("UNISEX");
    setDescription("");
    setDefaultMoq("");
    setUnit("cái");
    setDesignImageUrl(null);
    setProductionLeadTime("");
    setSizeName("");
    setFormError(null);
    setFieldErrors({});
    setPending(false);
    submitLock.current = false;
  }

  function handleClose() {
    if (pending) return;
    resetForm();
    onClose();
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Vui lòng nhập tên sản phẩm.";
    if (!categoryId) errors.categoryId = "Vui lòng chọn danh mục.";
    if (!colorId) errors.colorId = "Vui lòng chọn màu sắc.";
    if (!customerCode.trim()) {
      errors.customer = "Vui lòng chọn khách hàng trước khi tạo sản phẩm tùy chọn.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || submitLock.current) return;

    setFormError(null);
    setFieldErrors({});
    if (!validate()) return;

    submitLock.current = true;
    setPending(true);

    await mutate({
      loadingMessage: "Đang tạo sản phẩm…",
      successMessage: "Đã tạo sản phẩm tùy chọn.",
      errorFallback: "Không thể tạo sản phẩm tùy chọn. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/orders/custom-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            categoryId,
            colorId,
            gender,
            description: description.trim() || null,
            defaultMoq: defaultMoq.trim() ? Number(defaultMoq) : null,
            unit: unit.trim() || "cái",
            designImageUrl,
            productionLeadTime: productionLeadTime.trim() || null,
            customerCode: customerCode.trim(),
            sizeName: sizeName.trim() || null,
          }),
        });
        const result = await parseAdminJsonResponse(
          res,
          (data) => data.product as CustomProductResult & { genderSnapshot?: string },
        );
        if (!result.ok) {
          console.error("[CustomProductModal] POST custom-product", res.status, result.message);
        }
        return result;
      },
      onSuccess: (product) => {
        onCreated({
          ...product,
          genderSnapshot:
            product.genderSnapshot ??
            ORDER_PRODUCT_GENDER_OPTIONS.find((o) => o.value === gender)?.label ??
            "",
        });
        resetForm();
        onClose();
      },
    });

    setPending(false);
    submitLock.current = false;
  }

  return (
    <AdminQuickCreateShell
      open={open}
      size="wide"
      title="Tạo sản phẩm tùy chọn"
      subtitle="Sản phẩm sẽ được lưu vào danh mục và chọn cho dòng đơn hàng hiện tại."
      onClose={handleClose}
      pending={pending}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={handleClose} disabled={pending}>
            Hủy
          </button>
          <AdminLoadingButton type="submit" form={FORM_ID} variant="primary" pending={pending} pendingLabel="Đang tạo sản phẩm…">
            Tạo sản phẩm
          </AdminLoadingButton>
        </>
      }
    >
      {formError && <p className="admin-error">{formError}</p>}
      {fieldErrors.customer && <p className="admin-error">{fieldErrors.customer}</p>}

      <form id={FORM_ID} noValidate onSubmit={(e) => void handleSubmit(e)}>
        <div className="admin-quick-create-grid admin-quick-create-grid--3">
          <div className="admin-field admin-quick-create-grid__span-2">
            <label className="admin-label" htmlFor="custom-product-name">
              Tên sản phẩm *
            </label>
            <input
              id="custom-product-name"
              className="admin-input"
              value={name}
              disabled={pending}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
              }}
            />
            {fieldErrors.name && <p className="admin-field-error">{fieldErrors.name}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="custom-product-gender">
              Giới tính *
            </label>
            <select
              id="custom-product-gender"
              className="admin-input"
              value={gender}
              disabled={pending}
              onChange={(e) => setGender(e.target.value as OrderProductGender)}
            >
              {ORDER_PRODUCT_GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="custom-product-category">
              Danh mục *
            </label>
            <select
              id="custom-product-category"
              className="admin-input"
              value={categoryId}
              disabled={pending}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (fieldErrors.categoryId) setFieldErrors((p) => ({ ...p, categoryId: "" }));
              }}
            >
              <option value="">— Chọn danh mục —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && <p className="admin-field-error">{fieldErrors.categoryId}</p>}
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onAddCategory} disabled={pending}>
              Thêm danh mục mới
            </button>
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="custom-product-color">
              Màu mặc định *
            </label>
            <select
              id="custom-product-color"
              className="admin-input"
              value={colorId}
              disabled={pending}
              onChange={(e) => {
                setColorId(e.target.value);
                if (fieldErrors.colorId) setFieldErrors((p) => ({ ...p, colorId: "" }));
              }}
            >
              <option value="">— Chọn màu —</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.colorId && <p className="admin-field-error">{fieldErrors.colorId}</p>}
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onAddColor} disabled={pending}>
              Thêm màu mới
            </button>
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="custom-product-unit">
              Đơn vị
            </label>
            <input id="custom-product-unit" className="admin-input" value={unit} disabled={pending} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="custom-product-size">
              Size template (tùy chọn)
            </label>
            <input id="custom-product-size" className="admin-input" value={sizeName} disabled={pending} onChange={(e) => setSizeName(e.target.value)} placeholder="M, L, XL…" />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="custom-product-moq">
              MOQ
            </label>
            <input id="custom-product-moq" className="admin-input" type="number" min="0" value={defaultMoq} disabled={pending} onChange={(e) => setDefaultMoq(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="custom-product-lead">
              Thời gian sản xuất
            </label>
            <input id="custom-product-lead" className="admin-input" value={productionLeadTime} disabled={pending} onChange={(e) => setProductionLeadTime(e.target.value)} />
          </div>
          <div className="admin-field admin-quick-create-grid__full">
            <label className="admin-label" htmlFor="custom-product-desc">
              Mô tả
            </label>
            <textarea id="custom-product-desc" className="admin-textarea" rows={2} value={description} disabled={pending} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="admin-field admin-quick-create-grid__full">
            <label className="admin-label">Ảnh thiết kế / sản phẩm</label>
            <MediaPicker folder="general" usageType="auto" value={designImageUrl} onChange={setDesignImageUrl} />
          </div>
        </div>
      </form>
    </AdminQuickCreateShell>
  );
}
