import { NextResponse } from "next/server";
import {
  calculateKnowledgeHealthScore,
  detectMoqDuplicationIssues,
  summarizeAuthoritativeMoqOwner,
} from "@/features/knowledge-base/knowledge-base-health.service";

export async function GET() {
  try {
    const [health, moqDuplication] = await Promise.all([
      calculateKnowledgeHealthScore(),
      detectMoqDuplicationIssues(),
    ]);

    return NextResponse.json({
      health,
      duplication: {
        moqPolicy: summarizeAuthoritativeMoqOwner(),
        moqConflicts: moqDuplication,
        conflictCount: moqDuplication.length,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-base/health]", err);
    return NextResponse.json({ message: "Không thể tính Knowledge Health" }, { status: 500 });
  }
}
