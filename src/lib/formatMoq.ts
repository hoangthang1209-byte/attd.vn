/** Public B2B minimum order quantity formatting (Sprint 27.1.3). */

export function isPublicMoq(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function formatMoqNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** Product card label: "Từ {n} sản phẩm" */
export function formatProductCardMoq(moq: number): string {
  return `Từ ${formatMoqNumber(moq)} sản phẩm`;
}

/** PDP inline text: "Số lượng tối thiểu: {n} sản phẩm" */
export function formatPdpMoqText(moq: number): string {
  return `Số lượng tối thiểu: ${formatMoqNumber(moq)} sản phẩm`;
}

/** PDP table / fact value: "{n} sản phẩm" */
export function formatPdpMoqValue(moq: number): string {
  return `${formatMoqNumber(moq)} sản phẩm`;
}
