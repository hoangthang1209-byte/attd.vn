import CaseStudyCard from "@/components/public/CaseStudyCard";
import { getVisibleCaseStudiesFromDb } from "@/features/case-studies/services/case-study.service";
import { CASE_STUDIES_SECTION } from "@/lib/caseStudies";

export default async function CaseStudySection() {
  const studies = await getVisibleCaseStudiesFromDb();
  if (studies.length === 0) return null;

  return (
    <section className="section-compact">
      <div className="container">
        <h2 className="section-title section-title--center">
          {CASE_STUDIES_SECTION.title}
        </h2>
        <p className="section-description section-description--center">
          {CASE_STUDIES_SECTION.description}
        </p>

        <div className="case-study-grid">
          {studies.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>
      </div>
    </section>
  );
}
