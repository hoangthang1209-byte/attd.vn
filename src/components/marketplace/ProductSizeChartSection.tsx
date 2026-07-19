import {
  DEFAULT_SIZE_CHART_TITLE,
  isPublicSizeChartRenderable,
  type ProductSizeChart,
} from "@/features/products/product-size-chart";

type Props = {
  chart: ProductSizeChart | null | undefined;
};

export default function ProductSizeChartSection({ chart }: Props) {
  if (!isPublicSizeChartRenderable(chart) || !chart) return null;

  const title = chart.title?.trim() || DEFAULT_SIZE_CHART_TITLE;
  const unitLabel = chart.unit === "inch" ? "inch" : "cm";

  return (
    <section className="mp-section mp-pdp-section mp-pdp-size-chart" id="mp-pdp-size-chart">
      <header className="mp-pdp-section-head">
        <h2 className="mp-pdp-section-title">{title}</h2>
        <p className="mp-pdp-section-subtitle">Đơn vị: {unitLabel}</p>
      </header>
      <div className="mp-pdp-size-chart__table-wrap">
        <table className="mp-pdp-size-chart__table">
          <thead>
            <tr>
              <th scope="col">Size</th>
              {chart.columns.map((column) => (
                <th key={column.id} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.size}</th>
                {chart.columns.map((column) => (
                  <td key={column.id}>{row.values[column.id] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chart.note?.trim() ? (
        <p className="mp-pdp-size-chart__note">{chart.note.trim()}</p>
      ) : null}
    </section>
  );
}
