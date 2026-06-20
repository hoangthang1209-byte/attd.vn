"use client";

import { useState } from "react";
import type { OrderProductGender } from "@prisma/client";
import MediaPicker from "@/components/admin/media/MediaPicker";
import { ORDER_PRODUCT_GENDER_OPTIONS } from "@/features/orders/order-gender";
import type { ColorRecord } from "@/features/colors/color.service";
import type { CategoryOption } from "@/components/admin/orders/QuickAddCategoryModal";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

export type CustomProductResult = {
  productId: string;
  variantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string;
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
};

export default function CustomProductModal({
  open,
  customerCode,
  colors,
  categories,
  onClose,
  onCreated,
  onAddColor,
  onAddCategory,
}: Props) {
  const mutate = useAdminMutation();
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
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerCode.trim()) {
      setError("Vui lòng chọn khách hàng trước khi tạo sản phẩm tùy chọn.");
      return;
    }

    await mutate({
      loadingMessage: "Đang tạo sản phẩm…",
      successMessage: "Đã tạo sản phẩm tùy chọn.",
      action: async () => {
        const res = await fetch("/api/orders/custom-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            categoryId,
            colorId,
            gender,
            description: description || null,
            defaultMoq: defaultMoq.trim() ? Number(defaultMoq) : null,
            unit: unit || "cái",
            designImageUrl,
            productionLeadTime: productionLeadTime || null,
            customerCode,
            sizeName: sizeName || null,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.product as CustomProductResult & { genderSnapshot?: string });
      },
      onSuccess: (product) => {
        onCreated({
          ...product,
          genderSnapshot: product.genderSnapshot ?? ORDER_PRODUCT_GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? "",
        });
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
        onClose();
      },
    });
  }

  return (
    <div className="quote-quick-contact-modal">
      <div className="quote-quick-contact-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <form className="quote-quick-contact-modal__panel quote-quick-contact-modal__panel--wide" onSubmit={(e) => void handleSubmit(e)}>
        <h3 className="quote-quick-contact-modal__title">Tạo sản phẩm tùy chọn</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-catalog-variant-fields">
          <div className="admin-field">
            <label className="admin-label">Tên sản phẩm *</label>
            <input className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Danh mục *</label>
            <select className="admin-input" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— Chọn danh mục —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onAddCategory}>
              Thêm danh mục mới
            </button>
          </div>
          <div className="admin-field">
            <label className="admin-label">Màu sắc *</label>
            <select className="admin-input" required value={colorId} onChange={(e) => setColorId(e.target.value)}>
              <option value="">— Chọn màu —</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onAddColor}>
              Thêm màu mới
            </button>
          </div>
          <div className="admin-field">
            <label className="admin-label">Giới tính *</label>
            <select className="admin-input" required value={gender} onChange={(e) => setGender(e.target.value as OrderProductGender)}>
              {ORDER_PRODUCT_GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Size (tùy chọn)</label>
            <input className="admin-input" value={sizeName} onChange={(e) => setSizeName(e.target.value)} placeholder="M, L, XL…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">MOQ</label>
            <input className="admin-input" type="number" min="0" value={defaultMoq} onChange={(e) => setDefaultMoq(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Đơn vị</label>
            <input className="admin-input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Thời gian sản xuất</label>
            <input className="admin-input" value={productionLeadTime} onChange={(e) => setProductionLeadTime(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Mô tả</label>
            <textarea className="admin-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Ảnh thiết kế / sản phẩm</label>
            <MediaPicker folder="general" usageType="auto" value={designImageUrl} onChange={setDesignImageUrl} />
          </div>
        </div>
        <div className="quote-quick-contact-modal__actions">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="admin-btn admin-btn--primary">Tạo sản phẩm</button>
        </div>
      </form>
    </div>
  );
}
