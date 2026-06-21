import type { ProductionSheetFileRow } from "@/features/orders/production-sheet/production-sheet.types";

type Props = {
  orderLevelFiles: ProductionSheetFileRow[];
  itemLevelFiles: Array<{
    orderItemId: string;
    productName: string;
    files: ProductionSheetFileRow[];
  }>;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function FilesTable({ files }: { files: ProductionSheetFileRow[] }) {
  return (
    <table className="production-sheet-table production-sheet-files-table">
      <thead>
        <tr>
          <th>Loại tài liệu</th>
          <th>Tên file / tiêu đề</th>
          <th>Phiên bản</th>
          <th>Áp dụng cho</th>
          <th>Ghi chú</th>
          <th>Truy cập</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id} className="production-sheet-table__row">
            <td>{file.typeLabel}</td>
            <td>
              <div className="production-sheet-file-cell">
                {file.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.previewUrl} alt="" className="production-sheet-file-thumb" />
                ) : (
                  <span className="production-sheet-file-ext">
                    {(file.format ?? file.mimeType.split("/").pop() ?? "FILE").toUpperCase()}
                  </span>
                )}
                <div>
                  <strong>{file.title}</strong>
                  <div className="production-sheet-file-meta">
                    {file.filename} · {formatBytes(file.sizeBytes)}
                  </div>
                </div>
              </div>
            </td>
            <td>v{file.version}</td>
            <td>{file.appliesToLabel}</td>
            <td>{file.note ?? "—"}</td>
            <td>{file.accessLabel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ProductionSheetFilesTable({ orderLevelFiles, itemLevelFiles }: Props) {
  const hasFiles = orderLevelFiles.length > 0 || itemLevelFiles.length > 0;

  return (
    <section className="production-sheet-section production-sheet-files">
      <h2 className="production-sheet-section__title">TÀI LIỆU SẢN XUẤT ĐANG ÁP DỤNG</h2>
      {!hasFiles ? (
        <p className="production-sheet-warning">Chưa có tài liệu sản xuất đang áp dụng.</p>
      ) : (
        <>
          <h3 className="production-sheet-subsection__title">A. Tài liệu chung của đơn hàng</h3>
          {orderLevelFiles.length ? (
            <FilesTable files={orderLevelFiles} />
          ) : (
            <p className="production-sheet-empty">Không có tài liệu cấp đơn hàng.</p>
          )}

          <h3 className="production-sheet-subsection__title">B. Tài liệu theo sản phẩm</h3>
          {itemLevelFiles.length ? (
            itemLevelFiles.map((group) => (
              <div key={group.orderItemId} className="production-sheet-file-group">
                <h4 className="production-sheet-file-group__title">{group.productName}</h4>
                <FilesTable files={group.files} />
              </div>
            ))
          ) : (
            <p className="production-sheet-empty">Không có tài liệu cấp sản phẩm.</p>
          )}
        </>
      )}
    </section>
  );
}
