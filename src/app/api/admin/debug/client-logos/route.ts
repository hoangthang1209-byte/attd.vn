import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVisibleClientLogosFromDb } from "@/features/client-logos/services/client-logo.service";
import { isValidImageSrc } from "@/lib/imagePaths";

export async function GET() {
  try {
    const [all, visibleRows, serviceLogos] = await Promise.all([
      prisma.clientLogoRecord.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.clientLogoRecord.findMany({
        where: { isVisible: true },
      }),
      getVisibleClientLogosFromDb(),
    ]);

    return NextResponse.json({
      dbCount: all.length,
      visibleCount: visibleRows.length,
      logos: all.map((row) => ({
        id: row.id,
        companyName: row.companyName,
        image: row.imageUrl,
        isVisible: row.isVisible,
      })),
      _pipeline: {
        serviceVisibleCount: serviceLogos.length,
        homepageWouldRender: serviceLogos.length,
        imageValidationFailures: visibleRows.filter(
          (row) => !isValidImageSrc(row.imageUrl)
        ).length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Debug query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
