import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";

export type PdfFontNames = {
  regularName: string;
  boldName: string;
  usedDejaVu: boolean;
};

// Runtime-only font paths — resolved against cwd at execution, not traced at build.
function fontPath(...segments: string[]): string {
  return join(/* turbopackIgnore: true */ process.cwd(), ...segments);
}

const FONT_CANDIDATES = {
  regular: [
    fontPath("node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf"),
    fontPath("node_modules/dejavu-fonts-ttf/DejaVuSans.ttf"),
  ],
  bold: [
    fontPath("node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf"),
    fontPath("node_modules/dejavu-fonts-ttf/DejaVuSans-Bold.ttf"),
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
      { regularPath },
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
