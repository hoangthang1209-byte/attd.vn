export function quotePdfFilename(quoteNo: string, customerName?: string | null): string {
  const safeNo = quoteNo.replace(/[^a-zA-Z0-9-]/g, "") || "attd";
  const safeCustomer = customerName?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `Bao-gia-ATTD-${safeNo}${safeCustomer ? `-${safeCustomer}` : ""}.pdf`;
}
