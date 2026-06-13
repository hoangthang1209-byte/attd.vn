/**
 * Deployment readiness scoring — internal report for content completeness.
 * Run: npx tsx scripts/deployment-readiness.ts
 */

import { countClientLogoCandidates, getVisibleClientLogos } from "@/lib/clientLogos";
import { countCaseStudyCandidates, getVisibleCaseStudies } from "@/lib/caseStudies";
import { countConfiguredCategoryImages } from "@/lib/categoryImages";
import {
  countConfiguredTrustMetrics,
  TRUST_METRIC_TOTAL,
  hasVisibleTrustMetrics,
} from "@/lib/trustData";
import { companyInfo, hasCompanyField } from "@/lib/companyInfo";
import { computeProductImageStats, type ProductImageRecord } from "@/lib/productImages";

export type ReadinessSection = {
  label: string;
  configured: number;
  total: number;
  percent: number;
};

export type DeploymentReadinessReport = {
  generatedAt: string;
  products: ReadinessSection;
  images: ReadinessSection;
  caseStudies: ReadinessSection;
  clientLogos: ReadinessSection;
  trustData: ReadinessSection;
  companyInfo: ReadinessSection;
  overall: number;
  notes: string[];
};

function pct(configured: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((configured / total) * 100);
}

function section(
  label: string,
  configured: number,
  total: number
): ReadinessSection {
  return { label, configured, total, percent: pct(configured, total) };
}

const COMPANY_FIELDS = [
  companyInfo.legalName,
  companyInfo.hotline.raw,
  companyInfo.email,
  companyInfo.address,
  companyInfo.taxCode,
  companyInfo.workingHours,
] as const;

export function buildDeploymentReadinessReport(input: {
  products: { images: ProductImageRecord[] }[];
  categorySlugs: string[];
}): DeploymentReadinessReport {
  const notes: string[] = [];

  const productStats = computeProductImageStats(input.products);
  const productsSection = section(
    "Products",
    productStats.withImages,
    productStats.total
  );

  const categoryConfig = countConfiguredCategoryImages();
  const imagesConfigured =
    productStats.withImages +
    categoryConfig.withHero +
    getVisibleClientLogos().length +
    getVisibleCaseStudies().length;
  const imagesTotal =
    productStats.total +
    input.categorySlugs.length +
    countClientLogoCandidates().total +
    countCaseStudyCandidates().total;
  const imagesSection = section("Images", imagesConfigured, imagesTotal);

  const caseStudyCounts = countCaseStudyCandidates();
  const caseStudiesSection = section(
    "Case studies",
    getVisibleCaseStudies().length,
    Math.max(caseStudyCounts.total, 1)
  );

  const clientCounts = countClientLogoCandidates();
  const clientLogosSection = section(
    "Client logos",
    getVisibleClientLogos().length,
    Math.max(clientCounts.total, 1)
  );

  const trustConfigured = countConfiguredTrustMetrics();
  const trustSection = section(
    "Trust data",
    trustConfigured,
    TRUST_METRIC_TOTAL
  );

  const companyConfigured = COMPANY_FIELDS.filter((f) =>
    hasCompanyField(f)
  ).length;
  const companySection = section(
    "Company info",
    companyConfigured,
    COMPANY_FIELDS.length
  );

  const sections = [
    productsSection,
    imagesSection,
    caseStudiesSection,
    clientLogosSection,
    trustSection,
    companySection,
  ];

  const overall = Math.round(
    sections.reduce((sum, s) => sum + s.percent, 0) / sections.length
  );

  if (productStats.withImages === 0 && productStats.total > 0) {
    notes.push("No product images uploaded yet — cards show branded fallback.");
  }
  if (!hasVisibleTrustMetrics()) {
    notes.push("Trust metrics hidden — set values in src/lib/trustData.ts.");
  }
  if (getVisibleClientLogos().length === 0) {
    notes.push("Client logo wall hidden — add entries to src/lib/clientLogos.ts.");
  }
  if (getVisibleCaseStudies().length === 0) {
    notes.push("Case study section hidden — add entries to src/lib/caseStudies.ts.");
  }
  if (!hasCompanyField(companyInfo.address)) {
    notes.push("Company address not configured in src/lib/companyInfo.ts.");
  }
  if (!hasCompanyField(companyInfo.taxCode)) {
    notes.push("Tax code not configured in src/lib/companyInfo.ts.");
  }

  return {
    generatedAt: new Date().toISOString(),
    products: productsSection,
    images: imagesSection,
    caseStudies: caseStudiesSection,
    clientLogos: clientLogosSection,
    trustData: trustSection,
    companyInfo: companySection,
    overall,
    notes,
  };
}

export function formatReadinessReport(report: DeploymentReadinessReport): string {
  const lines = [
    "ATTD.vn — Deployment Readiness Report",
    `Generated: ${report.generatedAt}`,
    "",
    `Products:      ${report.products.percent}% (${report.products.configured}/${report.products.total} with images)`,
    `Images:        ${report.images.percent}% (aggregate content images)`,
    `Case studies:  ${report.caseStudies.percent}% (${report.caseStudies.configured} visible)`,
    `Client logos:  ${report.clientLogos.percent}% (${report.clientLogos.configured} visible)`,
    `Trust data:    ${report.trustData.percent}% (${report.trustData.configured}/${report.trustData.total} metrics)`,
    `Company info:  ${report.companyInfo.percent}% (${report.companyInfo.configured}/${report.companyInfo.total} fields)`,
    "",
    `Overall:       ${report.overall}%`,
  ];

  if (report.notes.length > 0) {
    lines.push("", "Notes:");
    for (const note of report.notes) {
      lines.push(`  • ${note}`);
    }
  }

  return lines.join("\n");
}
