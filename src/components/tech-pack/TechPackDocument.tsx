import type {
  TechPackPdfAssetDto,
  TechPackPdfDto,
} from "@/features/tech-pack/pdf/tech-pack-pdf.types";
import { formatViDateTime } from "@/features/tech-pack/pdf/tech-pack-pdf-assets";

type Props = {
  data: TechPackPdfDto;
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

function PdfImageBox({ asset, emptyLabel }: { asset: TechPackPdfAssetDto; emptyLabel?: string }) {
  const caption = asset.title ?? asset.typeLabel;
  return (
    <div className="tp-image-box">
      {asset.isPreviewable && asset.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.previewUrl} alt={caption} />
      ) : (
        <p className="tp-image-placeholder">
          {asset.originalFileName
            ? `File gốc: ${asset.originalFileName}`
            : emptyLabel ?? "Không thể tải hình tham chiếu"}
        </p>
      )}
      <div className="tp-caption">{caption}</div>
      {asset.note ? <div className="tp-caption tp-caption--note">{asset.note}</div> : null}
    </div>
  );
}

function PageFooter({ data, pageLabel }: { data: TechPackPdfDto; pageLabel: string }) {
  const generated = formatViDateTime(data.generatedAt);
  return (
    <footer className="tp-page-footer">
      <span>
        {data.code} · v{data.version}
      </span>
      <span>{pageLabel}</span>
      {generated ? <span>Tạo lúc {generated}</span> : null}
    </footer>
  );
}

function PageHeader({ data, title }: { data: TechPackPdfDto; title: string }) {
  return (
    <div className="tp-page-header">
      <div className="tp-page-header__brand">
        {data.company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.company.logoUrl} alt={data.company.brandName} className="tp-logo" />
        ) : (
          <strong>{data.company.brandName}</strong>
        )}
        <div>
          <h2>{title}</h2>
          <p className="tp-subtitle">
            {data.code} · v{data.version}
            {data.title ? ` · ${data.title}` : ""}
          </p>
        </div>
      </div>
      <div className="tp-meta">
        {data.watermark.headerBadge ? (
          <span className={`tp-status-badge tp-status-badge--${data.status.toLowerCase()}`}>
            {data.watermark.headerBadge}
          </span>
        ) : null}
        <div>{data.statusLabel}</div>
      </div>
    </div>
  );
}

export default function TechPackDocument({ data }: Props) {
  const { general, notes, bomRows, placements, measurements, sizeColumns, pattern, assets } = data;
  const releasedAt = data.releasedAt ? formatViDateTime(data.releasedAt) : null;

  const frontSketch = assets.construction.find((a) => a.type === "FLAT_SKETCH_FRONT");
  const backSketch = assets.construction.find((a) => a.type === "FLAT_SKETCH_BACK");
  const callouts = assets.construction.filter((a) => a.type === "CONSTRUCTION_CALLOUT");
  const constructionOther = assets.construction.filter(
    (a) => a.type !== "FLAT_SKETCH_FRONT" && a.type !== "FLAT_SKETCH_BACK" && a.type !== "CONSTRUCTION_CALLOUT",
  );

  return (
    <div className={`tech-pack-document-root${data.watermark.cssClass ? ` ${data.watermark.cssClass}` : ""}`}>
      {data.watermark.label ? (
        <div className="tp-watermark" aria-hidden>
          {data.watermark.label}
        </div>
      ) : null}

      <style>{`
        .tech-pack-document-root {
          position: relative;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          color: #111;
          font-size: 11px;
          line-height: 1.4;
          background: #fff;
          counter-reset: tp-page;
        }
        .tp-watermark {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          font-weight: 700;
          color: rgba(0, 0, 0, 0.06);
          transform: rotate(-32deg);
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
        }
        .tp-watermark--draft .tp-watermark { color: rgba(180, 120, 0, 0.08); }
        .tp-watermark--superseded .tp-watermark { color: rgba(120, 0, 0, 0.07); }
        .tp-page {
          position: relative;
          z-index: 1;
          page-break-after: always;
          padding: 4px 0 12px;
          counter-increment: tp-page;
          min-height: 190mm;
          display: flex;
          flex-direction: column;
        }
        .tp-page:last-child { page-break-after: auto; }
        .tp-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #111;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }
        .tp-page-header__brand { display: flex; gap: 10px; align-items: flex-start; }
        .tp-logo { max-height: 36px; width: auto; object-fit: contain; }
        .tp-page-header h2 { margin: 0; font-size: 14px; letter-spacing: 0.04em; }
        .tp-subtitle { margin: 2px 0 0; font-size: 10px; color: #444; }
        .tp-meta { text-align: right; font-size: 10px; color: #333; }
        .tp-status-badge {
          display: inline-block;
          padding: 2px 6px;
          border: 1px solid #ccc;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .tp-status-badge--draft { border-color: #c9a227; color: #8a6914; }
        .tp-status-badge--released { border-color: #2d6a2d; color: #2d6a2d; }
        .tp-status-badge--superseded { border-color: #8a2a2a; color: #8a2a2a; }
        .tp-page h3 { margin: 8px 0 6px; font-size: 12px; }
        table.tp-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
        table.tp-table th, table.tp-table td {
          border: 1px solid #ccc;
          padding: 4px 6px;
          text-align: left;
          vertical-align: top;
        }
        table.tp-table th { background: #f5f5f5; }
        table.tp-table--meta th { width: 26%; font-weight: 600; }
        table.tp-table--measure th { font-size: 9px; white-space: nowrap; }
        table.tp-table--measure td { text-align: center; }
        table.tp-table--measure td:first-child,
        table.tp-table--measure th:first-child { text-align: left; }
        .tp-block h4 { margin: 8px 0 3px; font-size: 11px; }
        .tp-block p { margin: 0; white-space: pre-wrap; }
        .tp-images { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .tp-images--3 { grid-template-columns: repeat(3, 1fr); }
        .tp-image-box {
          border: 1px solid #ddd;
          padding: 6px;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          break-inside: avoid;
        }
        .tp-images img, .tp-image-box img {
          max-width: 100%;
          max-height: 220px;
          width: auto;
          height: auto;
          object-fit: contain;
        }
        .tp-image-placeholder { font-size: 9px; color: #666; text-align: center; margin: 0; }
        .tp-caption { font-size: 9px; margin-top: 4px; color: #444; text-align: center; }
        .tp-caption--note { color: #666; font-style: italic; }
        .tp-pattern-snapshot {
          background: #f8f8f8;
          border: 1px solid #ddd;
          padding: 8px;
          margin: 8px 0 12px;
        }
        .tp-pattern-snapshot h3 { margin: 0 0 6px; font-size: 11px; }
        .tp-pattern-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10px; }
        .tp-pattern-grid dt { font-weight: 600; margin: 0; }
        .tp-pattern-grid dd { margin: 0 0 4px; }
        .tp-release-info {
          margin-top: 12px;
          padding: 8px;
          border: 1px solid #ddd;
          background: #fafafa;
          font-size: 10px;
        }
        .tp-page-footer {
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #666;
        }
        .tp-page-footer span:nth-child(2)::before { content: "Trang " counter(tp-page); }
        .tp-superseded-note { font-size: 10px; color: #8a2a2a; margin: 6px 0; }
      `}</style>

      <section className="tp-page">
        <PageHeader data={data} title="TECH PACK" />
        {data.supersededBy ? (
          <p className="tp-superseded-note">
            Thay thế bởi {data.supersededBy.code} v{data.supersededBy.version}
          </p>
        ) : null}

        <h3>Thông tin chung &amp; BOM</h3>
        <table className="tp-table tp-table--meta">
          <tbody>
            <FieldRow label="Ngày tạo" value={general.createdDate} />
            <FieldRow label="Ngày phát hành" value={releasedAt} />
            <FieldRow label="Mã job" value={general.jobCode} />
            <FieldRow label="Mã đơn" value={general.orderCode} />
            <FieldRow label="Khách hàng" value={general.customerName} />
            <FieldRow label="Sản phẩm" value={general.productName} />
            <FieldRow label="SKU / mã SP" value={general.productSku} />
            <FieldRow label="Màu" value={general.color} />
            <FieldRow label="Số lượng" value={general.quantity} />
            <FieldRow label="Dải size" value={general.sizeRange} />
            <FieldRow label="Nguồn cung" value={general.supplySource} />
            <FieldRow label="Cách xử lý" value={general.processingMethod} />
            <FieldRow label="Phụ trách SX" value={general.productionOwner} />
            <FieldRow label="Xưởng / team" value={general.workshop} />
            <FieldRow label="Deadline SX nội bộ" value={general.internalDeadline} />
            <FieldRow label="Deadline giao khách" value={general.deliveryDeadline} />
            <FieldRow label="Mã rập" value={pattern?.code} />
            <FieldRow label="Version rập" value={pattern?.version} />
            <FieldRow label="Base size" value={pattern?.baseSize} />
            <FieldRow label="Fit note" value={general.fitNote} />
          </tbody>
        </table>

        <TextBlock label="Ghi chú chung" value={general.generalNote} />
        <TextBlock label="Ghi chú construction" value={general.constructionNote} />

        {bomRows.length > 0 ? (
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
              {bomRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.categoryLabel}</td>
                  <td>{row.itemName}</td>
                  <td style={{ fontSize: 9 }}>{row.masterCodes || "—"}</td>
                  <td>{row.specification ?? "—"}</td>
                  <td>{row.color ?? "—"}</td>
                  <td>{row.supplier ?? "—"}</td>
                  <td>{row.unit ?? "—"}</td>
                  <td>{row.consumption ?? "—"}</td>
                  <td>{row.wastePercent ?? "—"}</td>
                  <td>{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TextBlock label="BOM (ghi chú)" value={notes.bom} />
        )}

        <TextBlock label="Phụ liệu / trim" value={notes.trims} />

        {assets.bom.length > 0 ? (
          <>
            <h3>Tham chiếu BOM / tài liệu</h3>
            <div className="tp-images">
              {assets.bom.map((asset) => (
                <PdfImageBox key={asset.id} asset={asset} />
              ))}
            </div>
          </>
        ) : null}

        <PageFooter data={data} pageLabel="main" />
      </section>

      <section className="tp-page">
        <PageHeader data={data} title="Construction / Hình kỹ thuật" />

        <div className="tp-images">
          {frontSketch ? (
            <PdfImageBox asset={frontSketch} emptyLabel="Chưa có hình kỹ thuật" />
          ) : (
            <div className="tp-image-box">
              <p className="tp-image-placeholder">Chưa có hình kỹ thuật</p>
              <div className="tp-caption">Flat sketch trước</div>
            </div>
          )}
          {backSketch ? (
            <PdfImageBox asset={backSketch} emptyLabel="Chưa có hình kỹ thuật" />
          ) : (
            <div className="tp-image-box">
              <p className="tp-image-placeholder">Chưa có hình kỹ thuật</p>
              <div className="tp-caption">Flat sketch sau</div>
            </div>
          )}
        </div>

        {(callouts.length > 0 || constructionOther.length > 0) && (
          <div className="tp-images tp-images--3">
            {[...callouts, ...constructionOther].map((asset) => (
              <PdfImageBox key={asset.id} asset={asset} emptyLabel="Chưa có hình kỹ thuật" />
            ))}
          </div>
        )}

        {callouts.length === 0 &&
          constructionOther.length === 0 &&
          !frontSketch &&
          !backSketch && <p>Chưa có hình kỹ thuật</p>}

        <TextBlock label="Ghi chú construction" value={general.constructionNote} />

        <PageFooter data={data} pageLabel="construction" />
      </section>

      <section className="tp-page">
        <PageHeader data={data} title="Artwork / Nhãn / Đóng gói" />

        {placements.length > 0 ? (
          <table className="tp-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Vị trí</th>
                <th>Kích thước</th>
                <th>Công nghệ</th>
                <th>Màu in</th>
                <th>Màu chỉ</th>
                <th>File gốc</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {placements.map((row) => (
                <tr key={row.id}>
                  <td>{row.title ?? "—"}</td>
                  <td>{row.bodyPart ?? "—"}</td>
                  <td>{row.sizeText || "—"}</td>
                  <td>{row.technology}</td>
                  <td>{row.inkColors ?? "—"}</td>
                  <td>{row.threadColors ?? "—"}</td>
                  <td>{row.artworkFileName ? `Artwork gốc: ${row.artworkFileName}` : "—"}</td>
                  <td>{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {assets.artwork.length > 0 ? (
          <div className="tp-images">
            {assets.artwork.map((asset) => (
              <PdfImageBox key={asset.id} asset={asset} />
            ))}
          </div>
        ) : placements.length === 0 ? (
          <p>Chưa có artwork / placement.</p>
        ) : null}

        {placements.some((p) => p.previewUrl) && (
          <div className="tp-images">
            {placements
              .filter((p) => p.previewUrl)
              .map((row) => (
                <div key={`preview-${row.id}`} className="tp-image-box">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.previewUrl!} alt={row.title ?? "Placement"} />
                  <div className="tp-caption">{row.title ?? row.bodyPart ?? "Placement"}</div>
                </div>
              ))}
          </div>
        )}

        <TextBlock label="Công nghệ in" value={notes.print} />
        <TextBlock label="Công nghệ thêu" value={notes.embroidery} />

        <PageFooter data={data} pageLabel="artwork" />
      </section>

      <section className="tp-page">
        <PageHeader data={data} title="Đo / Rập / Ghi chú kỹ thuật" />

        {pattern ? (
          <div className="tp-pattern-snapshot">
            <h3>Thông tin rập (snapshot)</h3>
            <dl className="tp-pattern-grid">
              <div>
                <dt>Mã rập</dt>
                <dd>{pattern.code ?? "—"}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{pattern.version ?? "—"}</dd>
              </div>
              <div>
                <dt>Tên rập</dt>
                <dd>{pattern.name ?? "—"}</dd>
              </div>
              <div>
                <dt>Base size</dt>
                <dd>{pattern.baseSize ?? "—"}</dd>
              </div>
              <div>
                <dt>Dải size</dt>
                <dd>{pattern.sizeRange ?? "—"}</dd>
              </div>
              <div>
                <dt>Grading rule</dt>
                <dd>{pattern.gradingRule ?? "—"}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>{pattern.statusLabel ?? "—"}</dd>
              </div>
            </dl>
            {pattern.exceptionReason ? (
              <p>
                <strong>Lý do không chọn rập:</strong> {pattern.exceptionReason}
              </p>
            ) : null}
            {pattern.pdfFileName ? (
              <p>
                <strong>File rập:</strong> {pattern.pdfFileName}
              </p>
            ) : null}
          </div>
        ) : null}

        {pattern?.pdfPreviewUrl ? (
          <div className="tp-images">
            <div className="tp-image-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pattern.pdfPreviewUrl} alt="Pattern PDF preview" />
              <div className="tp-caption">Pattern PDF preview</div>
            </div>
          </div>
        ) : null}

        {assets.measurement.length > 0 ? (
          <div className="tp-images">
            {assets.measurement.map((asset) => (
              <PdfImageBox key={asset.id} asset={asset} />
            ))}
          </div>
        ) : null}

        {measurements.length > 0 ? (
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
              {measurements.map((m) => (
                <tr key={m.id}>
                  <td>{m.pointOfMeasure}</td>
                  <td>{m.description ?? "—"}</td>
                  <td>{m.tolerance ?? "—"}</td>
                  {sizeColumns.map((size) => (
                    <td key={size}>{m.values[size] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Chưa có thông số đo chi tiết. Tham khảo rập và ghi chú kỹ thuật.</p>
        )}

        <TextBlock label="Ghi chú QC" value={notes.qc} />
        <TextBlock label="Ghi chú sản xuất" value={notes.production} />
        <TextBlock label="Ghi chú nội bộ" value={notes.internal} />

        {data.status === "RELEASED" && releasedAt ? (
          <div className="tp-release-info">
            <strong>Thông tin phát hành</strong>
            <div>Version: {data.version}</div>
            {data.releasedBy ? <div>Người phát hành: {data.releasedBy}</div> : null}
            <div>Thời gian: {releasedAt}</div>
          </div>
        ) : null}

        <PageFooter data={data} pageLabel="measurement" />
      </section>
    </div>
  );
}
