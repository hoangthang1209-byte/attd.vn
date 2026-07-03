export type TechPackPdfDisposition = "attachment" | "inline";

export function parseTechPackPdfDisposition(
  value: string | null | undefined,
  downloadFlag?: string | null,
): TechPackPdfDisposition {
  if (value === "inline") return "inline";
  if (downloadFlag === "1" || downloadFlag === "true") return "attachment";
  return value === "attachment" ? "attachment" : "inline";
}

export function techPackPdfContentDisposition(
  filename: string,
  disposition: TechPackPdfDisposition,
): string {
  return `${disposition}; filename="${filename}"`;
}
