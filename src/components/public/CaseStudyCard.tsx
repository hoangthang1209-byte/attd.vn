import type { VisibleCaseStudy } from "@/lib/caseStudies";
import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";

type CaseStudyCardProps = {
  study: VisibleCaseStudy;
};

export default function CaseStudyCard({ study }: CaseStudyCardProps) {
  if (!isValidImageSrc(study.imageSrc)) return null;

  return (
    <article className="case-study-card">
      <div className="case-study-media">
        <Image
          src={study.imageSrc}
          alt={study.title}
          fill
          className="case-study-img"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>

      <div className="case-study-body">
        <div className="case-study-tags">
          <span className="case-study-tag">{study.category}</span>
          <span className="case-study-tag">{study.quantity}</span>
          <span className="case-study-tag">{study.timeline}</span>
        </div>
        <h3 className="case-study-title">{study.title}</h3>
        <p className="case-study-summary">{study.summary}</p>
      </div>
    </article>
  );
}
