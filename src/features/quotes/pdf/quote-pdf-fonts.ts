import { existsSync } from "node:fs";
import { join } from "node:path";

export type PdfFontNames = {
  regularName: string;
  boldName: string;
  usedUnicodeFont: boolean;
  fontFamily: "dejavu" | "helvetica";
  regularPath: string | null;
  boldPath: string | null;
};

function fontPath(...segments: string[]): string {
  return join(/* turbopackIgnore: true */ process.cwd(), ...segments);
}

/**
 * Prefer packaged application fonts (always traced into PDF serverless functions),
 * then fall back to the dejavu-fonts-ttf npm package for local/dev installs.
 */
const FONT_CANDIDATES = {
  regular: [
    fontPath("assets/fonts/quote-pdf/DejaVuSans.ttf"),
    fontPath("node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf"),
    fontPath("node_modules/dejavu-fonts-ttf/DejaVuSans.ttf"),
  ],
  bold: [
    fontPath("assets/fonts/quote-pdf/DejaVuSans-Bold.ttf"),
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

function logFontStatus(result: PdfFontNames): void {
  if (fontStatusLogged) return;
  fontStatusLogged = true;
  if (result.usedUnicodeFont) {
    console.info("[quote-pdf] Using Unicode PDF fonts:", {
      family: result.fontFamily,
      regularPath: result.regularPath,
      boldPath: result.boldPath,
    });
  } else {
    console.error("[quote-pdf] Unicode PDF fonts missing — Helvetica cannot render Vietnamese.", {
      regularCandidates: FONT_CANDIDATES.regular,
      boldCandidates: FONT_CANDIDATES.bold,
    });
  }
}

export function resolveQuotePdfFontPaths(): {
  regularPath: string | null;
  boldPath: string | null;
} {
  return {
    regularPath: resolveExistingPath(FONT_CANDIDATES.regular),
    boldPath: resolveExistingPath(FONT_CANDIDATES.bold),
  };
}

export function registerQuotePdfFonts(
  doc: {
    registerFont: (name: string, path: string) => void;
    font: (name: string, size?: number) => unknown;
  },
): PdfFontNames {
  const { regularPath, boldPath } = resolveQuotePdfFontPaths();

  if (!regularPath || !boldPath) {
    const result: PdfFontNames = {
      regularName: "Helvetica",
      boldName: "Helvetica-Bold",
      usedUnicodeFont: false,
      fontFamily: "helvetica",
      regularPath,
      boldPath,
    };
    logFontStatus(result);
    return result;
  }

  try {
    doc.registerFont("QuotePdfRegular", regularPath);
    doc.registerFont("QuotePdfBold", boldPath);
    doc.font("QuotePdfRegular", 8);
    const result: PdfFontNames = {
      regularName: "QuotePdfRegular",
      boldName: "QuotePdfBold",
      usedUnicodeFont: true,
      fontFamily: "dejavu",
      regularPath,
      boldPath,
    };
    logFontStatus(result);
    return result;
  } catch (err) {
    console.error(
      "[quote-pdf] Unicode font registration failed — Helvetica cannot render Vietnamese.",
      err instanceof Error ? err.message : err,
    );
    const result: PdfFontNames = {
      regularName: "Helvetica",
      boldName: "Helvetica-Bold",
      usedUnicodeFont: false,
      fontFamily: "helvetica",
      regularPath,
      boldPath,
    };
    logFontStatus(result);
    return result;
  }
}
