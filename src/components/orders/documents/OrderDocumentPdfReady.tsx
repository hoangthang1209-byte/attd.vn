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

export default function OrderDocumentPdfReady() {
  useEffect(() => {
    async function markReady() {
      try {
        await document.fonts.ready;
      } catch {
        // ignore
      }
      await waitForDocumentImages();
      document.documentElement.setAttribute("data-order-pdf-ready", "true");
    }
    void markReady();
  }, []);

  return null;
}
