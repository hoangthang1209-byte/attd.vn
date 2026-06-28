import type { TechPackDetail } from "@/features/tech-pack/tech-pack.service";
import {
  PATTERN_STATUS_LABELS,
  TECH_PACK_ASSET_TYPE_LABELS,
  TECH_PACK_SOURCE_TYPE_LABELS,
  TECH_PACK_STATUS_LABELS,
} from "@/features/tech-pack/tech-pack-labels";
import {
  ARTWORK_PLACEMENT_TYPE_LABELS,
  TECH_PACK_BOM_CATEGORY_LABELS,
} from "@/features/tech-pack/tech-pack-bom-labels";
import {
  getOrderItemProcessingMethodLabel,
  getOrderItemSupplySourceLabel,
} from "@/features/orders/order-item-classification";
import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";

type Props = {
  pack: TechPackDetail;
};

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <tr>
      <th>{label}</th>
      <td>{value}</td>
    </tr>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="tp-block">
      <h4>{label}</h4>
      <p>{value}</p>
    </div>
  );
}

function sourceTypeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return (
    TECH_PACK_SOURCE_TYPE_LABELS[raw as keyof typeof TECH_PACK_SOURCE_TYPE_LABELS] ??
    getOrderItemSupplySourceLabel(raw as OrderItemSupplySource) ??
    raw
  );
}

function processingMethodLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return getOrderItemProcessingMethodLabel(raw as OrderItemProcessingMethod) ?? raw;
}

function placementTechnology(row: {
  placementType: string;
  printMethod: string | null;
  embroideryMethod: string | null;
  printMethodRef?: { code: string; name: string } | null;
}): string {
  if (row.placementType === "EMBROIDERY") return row.embroideryMethod ?? "Thêu";
  if (row.printMethodRef) return `${row.printMethodRef.code} — ${row.printMethodRef.name}`;
  if (row.printMethod) return row.printMethod;
  return ARTWORK_PLACEMENT_TYPE_LABELS[row.placementType as keyof typeof ARTWORK_PLACEMENT_TYPE_LABELS] ?? row.placementType;
}

function bomMasterCodes(row: {
  material?: { code: string } | null;
  trim?: { code: string } | null;
  supplierRef?: { code: string } | null;
}): string {
  const parts = [
    row.material?.code ? `VL: ${row.material.code}` : null,
    row.trim?.code ? `PL: ${row.trim.code}` : null,
    row.supplierRef?.code ? `NCC: ${row.supplierRef.code}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function sizeRank(size: string): number {
  const normalized = size.trim().toUpperCase();
  const known = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const index = known.indexOf(normalized);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortSizeColumns(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const rankDiff = sizeRank(a) - sizeRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });
  });
}

export default function TechPackDocument({ pack }: Props) {
  const patternCode = pack.patternCodeSnapshot ?? pack.pattern?.code;
  const patternVersion = pack.patternVersionSnapshot ?? (pack.pattern ? String(pack.pattern.version) : null);
  const constructionAssets = pack.assets.filter((a) => a.type !== "MEASUREMENT_DIAGRAM");
  const diagramAssets = pack.assets.filter((a) => a.type === "MEASUREMENT_DIAGRAM");
  const bomItems = pack.bomItems ?? [];
  const placements = pack.artworkPlacements ?? [];

  const sizeColumns = sortSizeColumns(
    Array.from(new Set(pack.measurements.flatMap((m) => m.values.map((v) => v.size)))),
  );

  return (
    <div className="tech-pack-document-root">
      <style>{`
        .tech-pack-document-root { font-family: system-ui, sans-serif; color: #111; font-size: 11px; line-height: 1.4; }
        .tp-page { page-break-after: always; padding: 4px 0 12px; }
        .tp-page:last-child { page-break-after: auto; }
        .tp-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
        .tp-header h1 { margin: 0; font-size: 16px; letter-spacing: 0.02em; }
        .tp-header h2 { margin: 0; font-size: 14px; }
        .tp-subtitle { margin: 2px 0 0; font-size: 11px; color: #444; }
        .tp-meta { text-align: right; font-size: 10px; color: #333; }
        table.tp-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
        table.tp-table th, table.tp-table td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
        table.tp-table th { background: #f5f5f5; }
        table.tp-table--meta th { width: 24%; font-weight: 600; }
        table.tp-table--measure th { font-size: 9px; white-space: nowrap; }
        table.tp-table--measure td { text-align: center; }
        table.tp-table--measure td:first-child,
        table.tp-table--measure th:first-child { text-align: left; }
        .tp-block h4 { margin: 8px 0 3px; font-size: 11px; }
        .tp-block p { margin: 0; white-space: pre-wrap; }
        .tp-images { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .tp-image-box { border: 1px solid #ddd; padding: 6px; min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .tp-images img { max-width: 100%; max-height: 220px; width: auto; height: auto; object-fit: contain; }
        .tp-caption { font-size: 9px; margin-top: 4px; color: #444; text-align: center; }
        .tp-pattern-snapshot { background: #f8f8f8; border: 1px solid #ddd; padding: 8px; margin: 8px 0 12px; }
        .tp-pattern-snapshot h3 { margin: 0 0 6px; font-size: 11px; }
        .tp-pattern-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10px; }
        .tp-pattern-grid dt { font-weight: 600; margin: 0; }
        .tp-pattern-grid dd { margin: 0 0 4px; }
        .tp-release-info { margin-top: 12px; padding: 8px; border: 1px solid #ddd; background: #fafafa; font-size: 10px; }
      `}</style>

      <section className="tp-page">
        <div className="tp-header">
          <div>
            <h1>ATTD — Tech Pack</h1>
            <p className="tp-subtitle">
              {pack.code} · v{pack.version}
              {pack.title ? ` · ${pack.title}` : ""}
            </p>
          </div>
          <div className="tp-meta">
            <div>{TECH_PACK_STATUS_LABELS[pack.status]}</div>
          </div>
        </div>

        <h2>Trang chính / BOM</h2>

        <table className="tp-table tp-table--meta">
          <tbody>
            <FieldRow label="Mã đơn" value={pack.orderCodeSnapshot} />
            <FieldRow label="Mã hạng mục" value={pack.orderItemCodeSnapshot} />
            <FieldRow label="Khách hàng" value={pack.customerNameSnapshot} />
            <FieldRow label="Sản phẩm" value={pack.productNameSnapshot} />
            <FieldRow label="SKU" value={pack.productSkuSnapshot} />
            <FieldRow label="Màu" value={pack.colorSnapshot} />
            <FieldRow label="Size" value={pack.sizeSnapshot} />
            <FieldRow label="Số lượng" value={pack.quantitySnapshot?.toString()} />
            <FieldRow label="Nguồn sản phẩm" value={sourceTypeLabel(pack.sourceType)} />
            <FieldRow label="Cách xử lý" value={processingMethodLabel(pack.processingMethod)} />
            <FieldRow
              label="Deadline"
              value={pack.deadline ? new Date(pack.deadline).toLocaleDateString("vi-VN") : null}
            />
          </tbody>
        </table>

        {bomItems.length > 0 ? (
          <table className="tp-table">
            <thead>
              <tr>
                <th>Danh mục</th>
                <th>Tên</th>
                <th>Mã master</th>
                <th>Quy cách</th>
                <th>Màu</th>
                <th>NCC</th>
                <th>ĐVT</th>
                <th>Định mức</th>
                <th>Hao hụt %</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {bomItems.map((row) => (
                <tr key={row.id}>
                  <td>{TECH_PACK_BOM_CATEGORY_LABELS[row.category]}</td>
                  <td>{row.itemName}</td>
                  <td style={{ fontSize: 9 }}>{bomMasterCodes(row) || "—"}</td>
                  <td>{row.specification ?? "—"}</td>
                  <td>{row.color ?? "—"}</td>
                  <td>
                    {row.supplierRef?.code ? `${row.supplierRef.code} — ` : ""}
                    {row.supplier ?? "—"}
                  </td>
                  <td>{row.unit ?? "—"}</td>
                  <td>{row.consumption ?? "—"}</td>
                  <td>{row.wastePercent ?? "—"}</td>
                  <td>{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TextBlock label="BOM (ghi chú)" value={pack.bomNotes} />
        )}

        <TextBlock label="Phụ liệu" value={pack.trimsNotes} />
        <TextBlock label="QC" value={pack.qcNotes} />
        <TextBlock label="Ghi chú sản xuất" value={pack.productionNotes} />
      </section>

      <section className="tp-page">
        <div className="tp-header">
          <h2>Construction Page</h2>
        </div>

        {placements.length > 0 && (
          <>
            <h3 style={{ fontSize: 12, margin: "8px 0" }}>Vị trí artwork</h3>
            <table className="tp-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Vị trí</th>
                  <th>Kích thước</th>
                  <th>Công nghệ</th>
                  <th>Màu in</th>
                  <th>Màu chỉ</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title ?? "—"}</td>
                    <td>{row.bodyPart ?? "—"}</td>
                    <td>
                      {[row.width, row.height].filter(Boolean).join(" × ") || "—"}{" "}
                      {row.measurementUnit ?? ""}
                    </td>
                    <td>{placementTechnology(row)}</td>
                    <td>{row.inkColors ?? "—"}</td>
                    <td>{row.threadColors ?? "—"}</td>
                    <td>{row.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="tp-images">
          {constructionAssets.map((asset) => (
            <div key={asset.id} className="tp-image-box">
              {asset.previewUrl && (asset.fileType === "IMAGE" || asset.fileType === "PDF") ? (
                asset.fileType === "PDF" ? (
                  <p>{asset.originalFileName ?? "PDF"}</p>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.previewUrl} alt={asset.title ?? asset.originalFileName ?? ""} />
                )
              ) : (
                <p>{asset.originalFileName ?? "File gốc"}</p>
              )}
              <div className="tp-caption">{TECH_PACK_ASSET_TYPE_LABELS[asset.type]}</div>
            </div>
          ))}
        </div>
        {constructionAssets.length === 0 && placements.length === 0 && <p>Chưa có hình construction.</p>}

        <TextBlock label="Công nghệ in" value={pack.printMethodNotes} />
        <TextBlock label="Công nghệ thêu" value={pack.embroideryNotes} />
      </section>

      <section className="tp-page">
        <div className="tp-header">
          <h2>Measurement &amp; Grading</h2>
        </div>

        {(patternCode || pack.pattern) && (
          <div className="tp-pattern-snapshot">
            <h3>Thông tin rập (snapshot)</h3>
            <dl className="tp-pattern-grid">
              <div>
                <dt>Mã rập</dt>
                <dd>{patternCode ?? "—"}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{patternVersion ?? "—"}</dd>
              </div>
              <div>
                <dt>Base size</dt>
                <dd>{pack.pattern?.baseSize ?? "—"}</dd>
              </div>
              <div>
                <dt>Size range</dt>
                <dd>{pack.pattern?.sizeRange ?? "—"}</dd>
              </div>
              <div>
                <dt>Grading rule</dt>
                <dd>{pack.pattern?.gradingRule ?? "—"}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  {pack.pattern?.status
                    ? PATTERN_STATUS_LABELS[pack.pattern.status as keyof typeof PATTERN_STATUS_LABELS]
                    : "—"}
                </dd>
              </div>
            </dl>
            {!pack.pattern && pack.patternExceptionReason && (
              <p>
                <strong>Lý do không chọn rập:</strong> {pack.patternExceptionReason}
              </p>
            )}
          </div>
        )}

        {diagramAssets.length > 0 && (
          <div className="tp-images">
            {diagramAssets.map((asset) =>
              asset.previewUrl && asset.fileType === "IMAGE" ? (
                <div key={asset.id} className="tp-image-box">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.previewUrl} alt="Sơ đồ đo" />
                  <div className="tp-caption">Sơ đồ đo</div>
                </div>
              ) : null,
            )}
          </div>
        )}

        {pack.measurements.length > 0 ? (
          <table className="tp-table tp-table--measure">
            <thead>
              <tr>
                <th>POM</th>
                <th>Mô tả</th>
                <th>Tolerance</th>
                {sizeColumns.map((size) => (
                  <th key={size}>{size}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pack.measurements.map((m) => {
                const valueMap = new Map(m.values.map((v) => [v.size, v.value]));
                return (
                  <tr key={m.id}>
                    <td>{m.pointOfMeasure}</td>
                    <td>{m.description ?? "—"}</td>
                    <td>{m.tolerance ?? "—"}</td>
                    {sizeColumns.map((size) => (
                      <td key={size}>{valueMap.get(size) ?? "—"}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>Chưa có bảng đo.</p>
        )}

        {pack.status === "RELEASED" && (
          <div className="tp-release-info">
            <strong>Thông tin phát hành</strong>
            <div>Version: {pack.version}</div>
            {pack.releasedBy && <div>Người phát hành: {pack.releasedBy}</div>}
            {pack.releasedAt && (
              <div>Thời gian: {new Date(pack.releasedAt).toLocaleString("vi-VN")}</div>
            )}
          </div>
        )}
      </section>

      <span data-tech-pack-pdf-ready="true" hidden />
    </div>
  );
}
