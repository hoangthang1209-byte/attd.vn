import type { CaseStudy } from "@/lib/caseStudies";
import { resolveUploadImage } from "@/lib/imagePaths";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";
import Image from "next/image";

type CaseStudyCardProps = {
  study: CaseStudy;
};

export default function CaseStudyCard({ study }: CaseStudyCardProps) {
  const imageSrc = resolveUploadImage("caseStudies", study.image);

  return (
    <article className="case-study-card">
      <div className="case-study-media">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={study.title}
            fill
            className="case-study-img"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <ImagePlaceholder variant="generic" label="Dự án" />
        )}
      </div>

      <div className="case-study-body">
        <div className="case-study-tags">
          <span className="case-study-tag">{study.industry}</span>
          <span className="case-study-tag">{study.productType}</span>
        </div>
        <h3 className="case-study-title">{study.title}</h3>
        <p className="case-study-summary">{study.summary}</p>
      </div>
    </article>
  );
}
