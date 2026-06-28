import { prisma } from "@/lib/prisma";

export async function generatePatternCode(): Promise<string> {
  const rows = await prisma.pattern.findMany({ select: { code: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.code.match(/^PAT-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `PAT-${String(max + 1).padStart(6, "0")}`;
}
