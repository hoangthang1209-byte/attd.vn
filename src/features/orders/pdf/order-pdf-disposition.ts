export type OrderPdfDisposition = "attachment" | "inline";

export function parseOrderPdfDisposition(
  value: string | null | undefined,
): OrderPdfDisposition {
  return value === "inline" ? "inline" : "attachment";
}

export function orderPdfContentDisposition(
  filename: string,
  disposition: OrderPdfDisposition,
): string {
  return `${disposition}; filename="${filename}"`;
}
