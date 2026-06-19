"use client";

import { useEffect } from "react";

async function waitForDocumentImages(timeoutMs = 8000): Promise<void> {
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

/** Triggers browser print after fonts and images are ready (document-only route). */
export default function QuoteDocumentAutoprint() {
  useEffect(() => {
    async function run() {
      try {
        await document.fonts.ready;
      } catch {
        // fonts API may be unavailable
      }
      await waitForDocumentImages();
      window.print();
    }
    void run();
  }, []);

  return null;
}
