import { notFound } from "next/navigation";
import TechPackDocument from "@/components/tech-pack/TechPackDocument";
import { getTechPackDetail } from "@/features/tech-pack/tech-pack.service";
import { verifyTechPackPdfToken } from "@/features/tech-pack/pdf/tech-pack-pdf-token";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdfToken?: string }>;
};

export default async function TechPackDocumentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { pdfToken } = await searchParams;

  if (!pdfToken || !verifyTechPackPdfToken(pdfToken, id)) {
    notFound();
  }

  const pack = await getTechPackDetail(id);
  if (!pack) notFound();

  return <TechPackDocument pack={pack} />;
}
