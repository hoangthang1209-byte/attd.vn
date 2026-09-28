import { prisma } from "@/lib/prisma";

function nextPatternSequence(codes: string[]): number {
  let max = 0;
  for (const code of codes) {
    const legacyMatch = code.match(/^PAT-(\d+)$/i);
    const currentMatch = code.match(/^PT(\d+)$/i);
    const match = currentMatch ?? legacyMatch;
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return max + 1;
}

export async function generatePatternCodes(count: number): Promise<string[]> {
  const safeCount = Math.max(0, Math.trunc(count));
  if (safeCount === 0) return [];

  const rows = await prisma.pattern.findMany({ select: { code: true } });
  const start = nextPatternSequence(rows.map((row) => row.code));

  return Array.from({ length: safeCount }, (_, index) =>
    `PT${String(start + index).padStart(4, "0")}`,
  );
}

export async function generatePatternCode(): Promise<string> {
  const [code] = await generatePatternCodes(1);
  return code;
}
