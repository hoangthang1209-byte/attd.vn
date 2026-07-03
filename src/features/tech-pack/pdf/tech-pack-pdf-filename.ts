export function techPackPdfFilename(code: string, version: number): string {
  const safe = code.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `TECH-PACK-${safe}-v${version}.pdf`;
}
