"use client";

import { useEffect } from "react";

async function waitForDocumentImages(timeoutMs = 10000): Promise<void> {
  const images = Array.from(document.images);
  if (images.length === 0) return;

  await Promise.race([
    Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    ),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/** Signals to Chromium that fonts/images are loaded and PDF capture can proceed. */
export default function QuoteDocumentPdfReady() {
  useEffect(() => {
    async function markReady() {
      try {
        await document.fonts.ready;
      } catch {
        // fonts API may be unavailable
      }
      await waitForDocumentImages();
      document.documentElement.setAttribute("data-quote-pdf-ready", "true");
    }
    void markReady();
  }, []);

  return null;
}
