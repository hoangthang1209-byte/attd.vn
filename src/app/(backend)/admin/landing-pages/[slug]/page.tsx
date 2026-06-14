import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import LandingPageEditForm from "@/components/admin/LandingPageEditForm";
import {
  ensureLandingPagesSeeded,
  getLandingPageBySlug,
  isLandingPageTableReady,
} from "@/features/landing-pages/services/landing-page.service";
import { LANDING_PAGE_SLUGS } from "@/features/landing-pages/types";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function LandingPageEditPage({ params }: Props) {
  const { slug } = await params;

  if (!LANDING_PAGE_SLUGS.includes(slug as (typeof LANDING_PAGE_SLUGS)[number])) {
    notFound();
  }

  const tableReady = await isLandingPageTableReady();
  if (tableReady) {
    await ensureLandingPagesSeeded();
  }

  const page = tableReady ? await getLandingPageBySlug(slug) : null;
  if (!page) notFound();

  const initial = {
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    heroTitle: page.heroTitle,
    heroDescription: page.heroDescription,
    seoContent: page.seoContent,
    faqJson: page.faqJson,
    primaryCtaLabel: page.primaryCtaLabel,
    primaryCtaHref: page.primaryCtaHref,
    secondaryCtaLabel: page.secondaryCtaLabel,
    secondaryCtaHref: page.secondaryCtaHref,
    isPublished: page.isPublished,
  };

  return (
    <AdminShell title={`Sửa landing: ${slug}`}>
      {!tableReady && (
        <p className="admin-message admin-message--error" role="alert">
          LandingPageContent table chưa tồn tại. Chạy prisma migrate deploy.
        </p>
      )}
      <LandingPageEditForm slug={slug} initial={initial} readOnly={!tableReady} />
    </AdminShell>
  );
}
