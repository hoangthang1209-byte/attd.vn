import type { ReactNode } from "react";

function isBoldSubheadingLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("**") &&
    trimmed.endsWith("**") &&
    trimmed.length > 4 &&
    !trimmed.slice(2, -2).includes("**")
  );
}

export function formatPdpDescriptionBlock(block: string): ReactNode {
  const trimmed = block.trim();
  if (!trimmed) return null;

  if (isBoldSubheadingLine(trimmed)) {
    return (
      <h3 className="mp-pdp-desc-subheading">{trimmed.slice(2, -2).trim()}</h3>
    );
  }

  return <p>{block}</p>;
}

export function formatPdpDescriptionContent(content: string): ReactNode[] {
  return content
    .split("\n\n")
    .map((block) => formatPdpDescriptionBlock(block))
    .filter(Boolean);
}
