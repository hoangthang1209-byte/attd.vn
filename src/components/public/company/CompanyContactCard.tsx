import type { CompanyInfoData } from "@/features/settings/services/settings.service";
import { buildGoogleMapsSearchUrl } from "@/lib/company-trust";
import { hasCompanyField } from "@/lib/companyInfo";
import Link from "next/link";

type Props = {
  company: CompanyInfoData;
  className?: string;
  showIntroLink?: boolean;
};

export default function CompanyContactCard({
  company,
  className,
  showIntroLink = true,
}: Props) {
  const mapsUrl = hasCompanyField(company.address)
    ? buildGoogleMapsSearchUrl(company.address)
    : null;

  const classes = ["company-contact-card", className].filter(Boolean).join(" ");

  return (
    <aside className={classes} aria-label="Thông tin liên hệ công ty">
      <p className="company-contact-card__title">Thông tin công ty</p>

      <dl className="company-contact-card__list">
        <div className="company-contact-card__row">
          <dt>Tên thương hiệu</dt>
          <dd>{company.name}</dd>
        </div>

        {hasCompanyField(company.legalName) ? (
          <div className="company-contact-card__row">
            <dt>Pháp nhân</dt>
            <dd>{company.legalName}</dd>
          </div>
        ) : null}

        {hasCompanyField(company.taxCode) ? (
          <div className="company-contact-card__row">
            <dt>MST</dt>
            <dd>{company.taxCode}</dd>
          </div>
        ) : null}

        {hasCompanyField(company.address) ? (
          <div className="company-contact-card__row">
            <dt>Địa chỉ</dt>
            <dd>
              {company.address}
              {mapsUrl ? (
                <>
                  {" "}
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    Xem bản đồ
                  </a>
                </>
              ) : null}
            </dd>
          </div>
        ) : null}

        {hasCompanyField(company.hotline.display) ? (
          <div className="company-contact-card__row">
            <dt>Hotline</dt>
            <dd>
              <a href={`tel:${company.hotline.raw}`}>{company.hotline.display}</a>
            </dd>
          </div>
        ) : null}

        {hasCompanyField(company.email) ? (
          <div className="company-contact-card__row">
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </dd>
          </div>
        ) : null}

        {hasCompanyField(company.workingHours) ? (
          <div className="company-contact-card__row">
            <dt>Giờ làm việc</dt>
            <dd>{company.workingHours}</dd>
          </div>
        ) : null}
      </dl>

      {showIntroLink ? (
        <p className="company-contact-card__links">
          <Link href="/gioi-thieu">Giới thiệu công ty</Link>
          {" · "}
          <Link href="/lien-he">Liên hệ báo giá</Link>
        </p>
      ) : null}
    </aside>
  );
}
