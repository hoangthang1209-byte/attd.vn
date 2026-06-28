import { prisma } from "@/lib/prisma";

export async function generatePatternCode(): Promise<string> {
  const rows = await prisma.pattern.findMany({ select: { code: true } });
  let max = 0;
  for (const row of rows) {
    const legacyMatch = row.code.match(/^PAT-(\d+)$/i);
    const currentMatch = row.code.match(/^PT(\d+)$/i);
    const match = currentMatch ?? legacyMatch;
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return `PT${String(max + 1).padStart(4, "0")}`;
}
