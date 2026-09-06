import "server-only";

import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import chromium, {
  inflate,
  setupLambdaEnvironment,
} from "@sparticuz/chromium";
import { QuotePdfChromiumError } from "@/features/quotes/pdf/quote-pdf-chromium-error";

export const QUOTE_PDF_VIEWPORT = {
  width: 1440,
  height: 1020,
  deviceScaleFactor: 1,
} as const;

export const QUOTE_PDF_OPTIONS: PDFOptions = {
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: false,
  scale: 1,
  margin: {
    top: "8mm",
    right: "8mm",
    bottom: "8mm",
    left: "8mm",
  },
};

export const QUOTE_MIN_PDF_BYTES = 10_000;

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export function logChromiumStage(
  traceId: string,
  stage: string,
  extra?: Record<string, unknown>,
): void {
  console.log("[quote-pdf]", { traceId, stage, ...extra });
}

export function isValidQuotePdfBuffer(buffer: Buffer, minBytes = QUOTE_MIN_PDF_BYTES): boolean {
  return (
    buffer.length >= minBytes &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  );
}

function sparticuzBinDir(): string {
  return join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
}

function assertSparticuzBinPresent(traceId: string): void {
  const binDir = sparticuzBinDir();
  const chromiumBr = join(binDir, "chromium.br");
  const al2023Br = join(binDir, "al2023.tar.br");
  const binExists = existsSync(binDir);
  const brExists = existsSync(chromiumBr);
  const alExists = existsSync(al2023Br);
  logChromiumStage(traceId, "sparticuz-bin-check", {
    binDir,
    binExists,
    chromiumBrExists: brExists,
    al2023BrExists: alExists,
  });
  if (!binExists || !brExists) {
    throw new QuotePdfChromiumError(
      traceId,
      `Chromium binary pack missing at ${binDir}. Ensure @sparticuz/chromium is externalized and included in outputFileTracingIncludes.`,
    );
  }
  if (!alExists) {
    throw new QuotePdfChromiumError(
      traceId,
      `AL2023 shared-library pack missing at ${al2023Br}. Required for libnspr4.so on Vercel.`,
    );
  }
}

/**
 * Vercel Fluid / serverless often leaves /tmp/chromium from a prior warm start
 * while AL2023 libs were never extracted (or were wiped). Also re-apply
 * LD_LIBRARY_PATH immediately before launch — module-load setup can be stale.
 */
async function prepareVercelChromiumSharedLibs(traceId: string): Promise<void> {
  // Helps older detection paths; v149 also keys off VERCEL + Node >= 20.
  if (!process.env.AWS_LAMBDA_JS_RUNTIME?.trim()) {
    const major = process.versions.node.split(".")[0] ?? "22";
    process.env.AWS_LAMBDA_JS_RUNTIME = `nodejs${major}.x`;
  }

  const alRoot = join(tmpdir(), "al2023");
  const alLibDir = join(alRoot, "lib");
  const nsprPath = join(alLibDir, "libnspr4.so");
  const chromiumPath = join(tmpdir(), "chromium");

  if (!existsSync(nsprPath)) {
    logChromiumStage(traceId, "extract-al2023:start", {
      chromiumExists: existsSync(chromiumPath),
      alRootExists: existsSync(alRoot),
    });
    // inflate() short-circuits when /tmp/al2023 exists — remove incomplete trees.
    if (existsSync(alRoot)) {
      rmSync(alRoot, { recursive: true, force: true });
    }
    await inflate(join(sparticuzBinDir(), "al2023.tar.br"));
  }

  setupLambdaEnvironment(alLibDir);

  const ldParts = [
    alLibDir,
    tmpdir(),
    ...(process.env.LD_LIBRARY_PATH ?? "").split(":").filter(Boolean),
  ];
  process.env.LD_LIBRARY_PATH = [...new Set(ldParts)].join(":");

  const libReady = existsSync(nsprPath);
  logChromiumStage(traceId, "lambda-libs-ready", {
    libnspr4Exists: libReady,
    chromiumExists: existsSync(chromiumPath),
    ldLibraryPath: process.env.LD_LIBRARY_PATH,
    awsLambdaJsRuntime: process.env.AWS_LAMBDA_JS_RUNTIME ?? null,
    nodeMajor: process.versions.node.split(".")[0] ?? null,
  });

  if (!libReady) {
    throw new QuotePdfChromiumError(
      traceId,
      "AL2023 libnspr4.so missing after extract; Chromium cannot launch on Vercel.",
    );
  }
}

/** Resolve Chrome/Chromium executable — Vercel uses @sparticuz/chromium only. */
export async function resolveChromiumExecutablePath(
  traceId: string,
): Promise<string> {
  logChromiumStage(traceId, "resolve-executable-path:start");

  if (isVercelRuntime()) {
    assertSparticuzBinPresent(traceId);
    await prepareVercelChromiumSharedLibs(traceId);
    const executablePath = await chromium.executablePath();
    if (!executablePath) {
      throw new QuotePdfChromiumError(
        traceId,
        "Không tìm thấy Chrome/Chromium để tạo PDF. (Vercel path missing)",
      );
    }
    // Re-apply after extract — warm-start early-return skips package-side setup timing.
    await prepareVercelChromiumSharedLibs(traceId);
    logChromiumStage(traceId, "resolve-executable-path:success", {
      executablePath,
      executableExists: existsSync(executablePath),
      source: "sparticuz-vercel",
    });
    return executablePath;
  }

  const envPath =
    process.env.CHROME_EXECUTABLE_PATH?.trim() ||
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath) {
    logChromiumStage(traceId, "resolve-executable-path:success", {
      executablePath: envPath,
      executableExists: existsSync(envPath),
      source: "env",
    });
    return envPath;
  }

  if (process.platform === "darwin") {
    const macChrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    logChromiumStage(traceId, "resolve-executable-path:success", {
      executablePath: macChrome,
      executableExists: existsSync(macChrome),
      source: "macos-chrome",
    });
    return macChrome;
  }

  const linuxCandidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const candidate of linuxCandidates) {
    if (!existsSync(candidate)) continue;
    logChromiumStage(traceId, "resolve-executable-path:success", {
      executablePath: candidate,
      executableExists: true,
      source: "linux-path",
    });
    return candidate;
  }

  try {
    const sparticuzPath = await chromium.executablePath();
    if (sparticuzPath) {
      logChromiumStage(traceId, "resolve-executable-path:success", {
        executablePath: sparticuzPath,
        executableExists: existsSync(sparticuzPath),
        source: "sparticuz-local",
      });
      return sparticuzPath;
    }
  } catch {
    // fall through
  }

  throw new QuotePdfChromiumError(
    traceId,
    "Không tìm thấy Chrome/Chromium để tạo PDF.",
  );
}

export async function launchChromiumBrowser(
  traceId: string,
  executablePath: string,
  viewport = QUOTE_PDF_VIEWPORT,
): Promise<Browser> {
  logChromiumStage(traceId, "launch-browser:start", { executablePath });

  // @sparticuz/chromium ships chrome-headless-shell which only supports headless:"shell".
  if (isVercelRuntime()) {
    chromium.setGraphicsMode = false;
    await prepareVercelChromiumSharedLibs(traceId);
  }

  const headlessMode: boolean | "shell" = isVercelRuntime() ? "shell" : true;

  // Official @sparticuz/chromium + puppeteer-core@25 pattern:
  // await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" })
  const args = isVercelRuntime()
    ? await puppeteer.defaultArgs({
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--font-render-hinting=none",
        ],
        headless: "shell",
      })
    : [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ];

  try {
    const browser = await puppeteer.launch({
      args,
      executablePath,
      headless: headlessMode,
      defaultViewport: viewport,
      acceptInsecureCerts: false,
      env: {
        ...process.env,
        // Child process must see AL2023 libs (libnspr4.so / libnss3.so).
        LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH,
        FONTCONFIG_PATH:
          process.env.FONTCONFIG_PATH ?? join(tmpdir(), "fonts"),
        HOME: process.env.HOME ?? tmpdir(),
      },
    });

    logChromiumStage(traceId, "launch-browser:success", {
      headless: headlessMode,
      argCount: args.length,
      ldLibraryPath: process.env.LD_LIBRARY_PATH ?? null,
    });
    return browser;
  } catch (error) {
    console.error("[quote-pdf] chromium launch failed", {
      traceId,
      executablePath,
      executableExists: existsSync(executablePath),
      libnspr4Exists: existsSync(join(tmpdir(), "al2023", "lib", "libnspr4.so")),
      ldLibraryPath: process.env.LD_LIBRARY_PATH ?? null,
      headless: headlessMode,
      argCount: args.length,
      argsSample: args.slice(0, 12),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw wrapChromiumPdfError(traceId, error);
  }
}

export function logChromiumBrowserDiagnostics(
  traceId: string,
  executablePath: string,
): void {
  console.log("[quote-pdf] chromium diagnostics", {
    traceId,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    isVercel: isVercelRuntime(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV,
    executablePath,
    executableExists: existsSync(executablePath),
  });
}

export async function closeChromiumBrowserSafely(
  traceId: string,
  browser: Browser | null,
): Promise<void> {
  if (!browser) return;
  logChromiumStage(traceId, "close-browser:start");
  try {
    await browser.close();
    logChromiumStage(traceId, "close-browser:success");
  } catch (closeError) {
    console.error("[quote-pdf] browser close failed", {
      traceId,
      errorName: closeError instanceof Error ? closeError.name : "UnknownError",
      errorMessage:
        closeError instanceof Error ? closeError.message : String(closeError),
    });
  }
}

export function wrapChromiumPdfError(
  traceId: string,
  error: unknown,
): QuotePdfChromiumError {
  if (error instanceof QuotePdfChromiumError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "Chromium PDF generation failed";
  return new QuotePdfChromiumError(traceId, message, { cause: error });
}
