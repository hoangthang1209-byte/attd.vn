import type { PublicQuoteDocument } from "@/features/quotes/types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { formatQuoteDate } from "@/features/quotes/format";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";

type PartyField = { label: string; value: string | null | undefined };

function FieldList({ fields }: { fields: PartyField[] }) {
  const visible = fields.filter((f) => f.value?.trim());
  if (visible.length === 0) {
    return <p className="quote-party-col__empty">—</p>;
  }
  return (
    <>
      {visible.map((f) => (
        <p key={f.label} className="quote-party-col__row">
          <span className="quote-party-col__label">{f.label}:</span> {f.value}
        </p>
      ))}
    </>
  );
}

type QuotePartyColumnsProps = {
  quote: Pick<
    PublicQuoteDocument,
    | "customerCompany"
    | "customerCode"
    | "customerTaxCode"
    | "customerAddress"
    | "customerCompanyPhone"
    | "customerCompanyEmail"
    | "customerContactName"
    | "customerContactTitle"
    | "customerContactPhone"
    | "customerContactEmail"
    | "salesName"
    | "salesTitle"
    | "salesPhone"
    | "salesEmail"
    | "salesAddress"
  >;
  className?: string;
};

export function QuotePartyColumns({ quote, className = "" }: QuotePartyColumnsProps) {
  return (
    <div className={`quote-party-cols ${className}`.trim()}>
      <section className="quote-party-col">
        <h3 className="quote-party-col__title">Khách hàng</h3>
        <FieldList
          fields={[
            { label: "Tên công ty", value: quote.customerCompany },
            { label: "Mã khách hàng", value: quote.customerCode },
            { label: "Mã số thuế", value: quote.customerTaxCode },
            { label: "Địa chỉ", value: quote.customerAddress },
          ]}
        />
      </section>
      <section className="quote-party-col">
        <h3 className="quote-party-col__title">Người liên hệ</h3>
        <FieldList
          fields={[
            { label: "Họ tên", value: quote.customerContactName },
            { label: "Chức vụ", value: quote.customerContactTitle },
            { label: "Số điện thoại", value: quote.customerContactPhone },
            { label: "Email", value: quote.customerContactEmail },
          ]}
        />
      </section>
      <section className="quote-party-col">
        <h3 className="quote-party-col__title">Nhân viên tư vấn</h3>
        <FieldList
          fields={[
            { label: "Tên", value: quote.salesName },
            { label: "Chức vụ", value: quote.salesTitle },
            { label: "Số điện thoại", value: quote.salesPhone },
            { label: "Email", value: quote.salesEmail },
          ]}
        />
      </section>
    </div>
  );
}

type QuoteDocMetaProps = {
  quote: Pick<
    PublicQuoteDocument,
    "quoteNo" | "quoteDate" | "validUntil" | "currency" | "priceVatType"
  >;
};

export function QuoteDocMeta({ quote }: QuoteDocMetaProps) {
  return (
    <div className="quote-doc__meta-bar">
      <span><strong>Mã báo giá:</strong> {quote.quoteNo}</span>
      <span><strong>Ngày báo giá:</strong> {formatQuoteDate(quote.quoteDate)}</span>
      <span><strong>Hiệu lực đến:</strong> {formatQuoteDate(quote.validUntil)}</span>
      <span><strong>Loại tiền:</strong> {quote.currency}</span>
      <span><strong>Loại giá:</strong> {quotePriceVatTypeLabel(quote.priceVatType)}</span>
    </div>
  );
}

type QuoteCompanyHeaderProps = {
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
};

export function QuoteCompanyHeader({ company, logoUrl }: QuoteCompanyHeaderProps) {
  const legalName = company.legalName?.trim();

  return (
    <header className="quote-doc__header">
      <div className="quote-doc__header-left">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={company.brandName} className="quote-doc__logo" />
        )}
      </div>

      <div className="quote-doc__header-center">
        <h1 className="quote-doc__title">BẢNG BÁO GIÁ</h1>
      </div>

      <div className="quote-doc__header-right">
        {legalName && (
          <p className="quote-doc__header-legal">{legalName}</p>
        )}
        {company.address?.trim() && (
          <p><strong>Địa chỉ:</strong> {company.address}</p>
        )}
        {company.phone?.trim() && (
          <p><strong>Điện thoại:</strong> {company.phone}</p>
        )}
        {company.email?.trim() && (
          <p><strong>Email:</strong> {company.email}</p>
        )}
      </div>
    </header>
  );
}

/** Aliases for shared document component tree naming. */
export { QuoteCompanyHeader as QuoteDocumentHeader };
export { QuotePartyColumns as QuoteDocumentParties };
export { QuoteDocMeta as QuoteDocumentMeta };
