"use client";

export function techPackPdfPreviewUrl(techPackId: string): string {
  return `/api/tech-packs/${encodeURIComponent(techPackId)}/pdf?disposition=inline`;
}

export function techPackPdfDownloadUrl(techPackId: string): string {
  return `/api/tech-packs/${encodeURIComponent(techPackId)}/pdf?download=1`;
}

export function openTechPackPdfPreview(techPackId: string): void {
  window.open(techPackPdfPreviewUrl(techPackId), "_blank", "noopener,noreferrer");
}

export function openTechPackPdfPrint(techPackId: string): void {
  window.open(techPackPdfPreviewUrl(techPackId), "_blank", "noopener,noreferrer");
}
