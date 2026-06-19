import { existsSync } from "fs";
import { join } from "path";

export type PdfFontNames = {
  regularName: string;
  boldName: string;
  usedDejaVu: boolean;
};

const FONT_CANDIDATES = {
  regular: [
    join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf"),
    join(process.cwd(), "node_modules/dejavu-fonts-ttf/DejaVuSans.ttf"),
  ],
  bold: [
    join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf"),
    join(process.cwd(), "node_modules/dejavu-fonts-ttf/DejaVuSans-Bold.ttf"),
  ],
};

let fontStatusLogged = false;

function resolveExistingPath(candidates: string[]): string | null {
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function logFontStatus(usedDejaVu: boolean, regularPath: string | null): void {
  if (fontStatusLogged) return;
  fontStatusLogged = true;
  if (usedDejaVu) {
    console.info("[quote-pdf] Using DejaVu fonts:", regularPath);
  } else {
    console.warn(
      "[quote-pdf] DejaVu fonts not found — using Helvetica fallback (Vietnamese diacritics may be missing).",
      { cwd: process.cwd(), regularPath },
    );
  }
}

export function registerQuotePdfFonts(
  doc: {
    registerFont: (name: string, path: string) => void;
    font: (name: string, size?: number) => unknown;
  },
): PdfFontNames {
  const regularPath = resolveExistingPath(FONT_CANDIDATES.regular);
  const boldPath = resolveExistingPath(FONT_CANDIDATES.bold);

  if (!regularPath || !boldPath) {
    logFontStatus(false, regularPath);
    return { regularName: "Helvetica", boldName: "Helvetica-Bold", usedDejaVu: false };
  }

  try {
    doc.registerFont("QuotePdfRegular", regularPath);
    doc.registerFont("QuotePdfBold", boldPath);
    doc.font("QuotePdfRegular", 8);
    logFontStatus(true, regularPath);
    return { regularName: "QuotePdfRegular", boldName: "QuotePdfBold", usedDejaVu: true };
  } catch (err) {
    console.warn(
      "[quote-pdf] DejaVu font registration failed — using Helvetica.",
      err instanceof Error ? err.message : err,
    );
    logFontStatus(false, regularPath);
    return { regularName: "Helvetica", boldName: "Helvetica-Bold", usedDejaVu: false };
  }
}
