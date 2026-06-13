import CaseStudyCard from "@/components/public/CaseStudyCard";
import { CASE_STUDIES, CASE_STUDIES_SECTION } from "@/lib/caseStudies";

export default function CaseStudySection() {
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
          {CASE_STUDIES.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>
      </div>
    </section>
  );
}
