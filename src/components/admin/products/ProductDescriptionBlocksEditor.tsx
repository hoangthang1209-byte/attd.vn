"use client";

import { useCallback, useState } from "react";
import HomepageMediaAssetField from "@/components/admin/HomepageMediaAssetField";
import ProductDescriptionBlocks from "@/components/marketplace/ProductDescriptionBlocks";
import {
  createEmptyBulletListBlock,
  createEmptyHeadingBlock,
  createEmptyImageBlock,
  createEmptyImageGridBlock,
  createEmptyParagraphBlock,
  type ProductDescriptionBlock,
  type ProductDescriptionImageGridItem,
} from "@/features/products/product-description-blocks";

type Props = {
  value: ProductDescriptionBlock[];
  onChange: (blocks: ProductDescriptionBlock[]) => void;
  error?: string | null;
  legacyDescription?: string;
};

function moveBlock(blocks: ProductDescriptionBlock[], from: number, to: number): ProductDescriptionBlock[] {
  if (to < 0 || to >= blocks.length || from === to) return blocks;
  const next = [...blocks];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function updateBlockAt(
  blocks: ProductDescriptionBlock[],
  index: number,
  nextBlock: ProductDescriptionBlock,
): ProductDescriptionBlock[] {
  return blocks.map((block, i) => (i === index ? nextBlock : block));
}

export default function ProductDescriptionBlocksEditor({
  value,
  onChange,
  error,
  legacyDescription = "",
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const addBlock = useCallback(
    (factory: () => ProductDescriptionBlock) => {
      onChange([...value, factory()]);
    },
    [onChange, value],
  );

  return (
    <div className="admin-field" data-field="descriptionBlocks">
      <label className="admin-label">Mô tả nâng cao</label>
      <p className="admin-field-hint">
        Khi có khối nội dung hợp lệ, trang sản phẩm sẽ hiển thị mô tả nâng cao thay cho mô tả đầy đủ
        bên trên. Xóa hết khối sẽ khôi phục mô tả đầy đủ (legacy). Ảnh phải chọn từ thư viện media;
        alt text hỗ trợ accessibility và SEO.
      </p>

      <div className="admin-btn-row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => addBlock(() => createEmptyHeadingBlock(2))}>
          Thêm tiêu đề
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => addBlock(createEmptyParagraphBlock)}>
          Thêm đoạn văn
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => addBlock(createEmptyBulletListBlock)}>
          Thêm danh sách
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => addBlock(createEmptyImageBlock)}>
          Thêm hình ảnh
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => addBlock(createEmptyImageGridBlock)}>
          Thêm 2 hình ảnh
        </button>
        {value.length > 0 && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            onClick={() => setPreviewOpen((open) => !open)}
          >
            {previewOpen ? "Ẩn xem trước" : "Xem trước"}
          </button>
        )}
      </div>

      {value.length === 0 ? (
        <p className="admin-field-hint">
          Chưa có khối mô tả nâng cao. Đang dùng mô tả đầy đủ
          {legacyDescription.trim() ? " hiện có." : " (nếu đã nhập)."}
        </p>
      ) : (
        <div className="product-desc-blocks-editor">
          {value.map((block, index) => (
            <div key={block.id} className="product-desc-blocks-editor__item" data-block-type={block.type}>
              <div className="product-desc-blocks-editor__toolbar">
                <span className="admin-field-hint" style={{ margin: 0 }}>
                  {block.type === "heading"
                    ? "Tiêu đề"
                    : block.type === "paragraph"
                      ? "Đoạn văn"
                      : block.type === "bulletList"
                        ? "Danh sách"
                        : block.type === "image"
                          ? "Hình ảnh"
                          : "Lưới 2 ảnh"}
                  {" · "}
                  {index + 1}/{value.length}
                </span>
                <div className="admin-btn-row" style={{ gap: 4 }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    disabled={index === 0}
                    onClick={() => onChange(moveBlock(value, index, index - 1))}
                    aria-label="Di chuyển lên"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    disabled={index === value.length - 1}
                    onClick={() => onChange(moveBlock(value, index, index + 1))}
                    aria-label="Di chuyển xuống"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {block.type === "heading" && (
                <div className="admin-form-grid" style={{ gap: 8 }}>
                  <div className="admin-form-group">
                    <label>Cấp tiêu đề</label>
                    <select
                      className="admin-input"
                      value={block.level}
                      onChange={(e) =>
                        onChange(
                          updateBlockAt(value, index, {
                            ...block,
                            level: Number(e.target.value) === 3 ? 3 : 2,
                          }),
                        )
                      }
                    >
                      <option value={2}>H2</option>
                      <option value={3}>H3</option>
                    </select>
                  </div>
                  <div className="admin-form-group" style={{ gridColumn: "1 / -1" }}>
                    <label>Nội dung tiêu đề</label>
                    <input
                      className="admin-input"
                      value={block.text}
                      onChange={(e) =>
                        onChange(updateBlockAt(value, index, { ...block, text: e.target.value }))
                      }
                      placeholder="Tiêu đề mục"
                    />
                  </div>
                </div>
              )}

              {block.type === "paragraph" && (
                <div className="admin-form-group">
                  <label>Đoạn văn</label>
                  <textarea
                    className="admin-textarea"
                    rows={4}
                    value={block.text}
                    onChange={(e) =>
                      onChange(updateBlockAt(value, index, { ...block, text: e.target.value }))
                    }
                    placeholder="Nội dung mô tả…"
                  />
                </div>
              )}

              {block.type === "bulletList" && (
                <div className="admin-form-group">
                  <label>Các mục (mỗi dòng một mục)</label>
                  <textarea
                    className="admin-textarea"
                    rows={4}
                    value={block.items.join("\n")}
                    onChange={(e) =>
                      onChange(
                        updateBlockAt(value, index, {
                          ...block,
                          items: e.target.value.split("\n"),
                        }),
                      )
                    }
                    placeholder={"Ưu điểm 1\nƯu điểm 2"}
                  />
                </div>
              )}

              {block.type === "image" && (
                <div className="admin-form-grid" style={{ gap: 8 }}>
                  <HomepageMediaAssetField
                    label="Ảnh từ thư viện"
                    folder="products"
                    value={{
                      mediaAssetId: block.mediaId || null,
                      imageUrl: block.imageUrl || null,
                      imageAlt: block.alt || null,
                    }}
                    onChange={(media) =>
                      onChange(
                        updateBlockAt(value, index, {
                          ...block,
                          mediaId: media.mediaAssetId ?? "",
                          imageUrl: media.imageUrl ?? "",
                          alt: media.imageAlt?.trim() || block.alt,
                        }),
                      )
                    }
                    onAltChange={(alt) =>
                      onChange(updateBlockAt(value, index, { ...block, alt }))
                    }
                    emptyHint="Chọn ảnh từ Media Library — không dán URL ngoài."
                  />
                  <div className="admin-form-group">
                    <label>Layout</label>
                    <select
                      className="admin-input"
                      value={block.layout}
                      onChange={(e) =>
                        onChange(
                          updateBlockAt(value, index, {
                            ...block,
                            layout: e.target.value === "full" ? "full" : "content",
                          }),
                        )
                      }
                    >
                      <option value="content">Theo nội dung</option>
                      <option value="full">Full width</option>
                    </select>
                  </div>
                  <div className="admin-form-group" style={{ gridColumn: "1 / -1" }}>
                    <label>Chú thích (tuỳ chọn)</label>
                    <input
                      className="admin-input"
                      value={block.caption ?? ""}
                      onChange={(e) =>
                        onChange(
                          updateBlockAt(value, index, {
                            ...block,
                            caption: e.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                </div>
              )}

              {block.type === "imageGrid" && (
                <div className="product-desc-blocks-editor__grid">
                  {[0, 1].map((slot) => {
                    const item: ProductDescriptionImageGridItem = block.items[slot] ?? {
                      mediaId: "",
                      imageUrl: "",
                      alt: "",
                      caption: "",
                    };
                    return (
                      <div key={`${block.id}-slot-${slot}`} className="admin-form-group">
                        <HomepageMediaAssetField
                          label={`Ảnh ${slot + 1}`}
                          folder="products"
                          value={{
                            mediaAssetId: item.mediaId || null,
                            imageUrl: item.imageUrl || null,
                            imageAlt: item.alt || null,
                          }}
                          onChange={(media) => {
                            const items = [...block.items];
                            while (items.length < 2) {
                              items.push({ mediaId: "", imageUrl: "", alt: "", caption: "" });
                            }
                            items[slot] = {
                              ...items[slot],
                              mediaId: media.mediaAssetId ?? "",
                              imageUrl: media.imageUrl ?? "",
                              alt: media.imageAlt?.trim() || items[slot]?.alt || "",
                            };
                            onChange(updateBlockAt(value, index, { ...block, items }));
                          }}
                          onAltChange={(alt) => {
                            const items = [...block.items];
                            while (items.length < 2) {
                              items.push({ mediaId: "", imageUrl: "", alt: "", caption: "" });
                            }
                            items[slot] = { ...items[slot], alt };
                            onChange(updateBlockAt(value, index, { ...block, items }));
                          }}
                          emptyHint="Chọn ảnh từ Media Library."
                        />
                        <label>Chú thích (tuỳ chọn)</label>
                        <input
                          className="admin-input"
                          value={item.caption ?? ""}
                          onChange={(e) => {
                            const items = [...block.items];
                            while (items.length < 2) {
                              items.push({ mediaId: "", imageUrl: "", alt: "", caption: "" });
                            }
                            items[slot] = { ...items[slot], caption: e.target.value };
                            onChange(updateBlockAt(value, index, { ...block, items }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {previewOpen && value.length > 0 && (
        <div className="product-desc-blocks-editor__preview" aria-live="polite">
          <p className="admin-field-hint">Xem trước (renderer công khai)</p>
          <ProductDescriptionBlocks blocks={value} preview />
        </div>
      )}

      {error && (
        <p className="admin-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
