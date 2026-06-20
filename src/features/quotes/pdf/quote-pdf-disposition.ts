export type QuotePdfDisposition = "attachment" | "inline";

export function parseQuotePdfDisposition(
  value: string | null | undefined,
): QuotePdfDisposition {
  return value === "inline" ? "inline" : "attachment";
}

export function quotePdfContentDisposition(
  filename: string,
  disposition: QuotePdfDisposition,
): string {
  return `${disposition}; filename="${filename}"`;
}
