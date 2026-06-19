import { join } from "path";

export type PdfFontSet = {
  regularPath: string;
  boldPath: string;
};

const DEJAVU_REGULAR = join(
  process.cwd(),
  "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf",
);
const DEJAVU_BOLD = join(
  process.cwd(),
  "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf",
);

export function getPdfFontPaths(): PdfFontSet {
  return { regularPath: DEJAVU_REGULAR, boldPath: DEJAVU_BOLD };
}

export function registerQuotePdfFonts(
  doc: { registerFont: (name: string, path: string) => void },
): { regularName: string; boldName: string } {
  try {
    const paths = getPdfFontPaths();
    doc.registerFont("QuotePdfRegular", paths.regularPath);
    doc.registerFont("QuotePdfBold", paths.boldPath);
    return { regularName: "QuotePdfRegular", boldName: "QuotePdfBold" };
  } catch (err) {
    console.warn(
      "[quote-pdf] DejaVu fonts unavailable — falling back to Helvetica (Vietnamese diacritics may be missing).",
      err instanceof Error ? err.message : err,
    );
    return { regularName: "Helvetica", boldName: "Helvetica-Bold" };
  }
}
