import AdminShell from "@/components/admin/AdminShell";
import QuoteForm from "@/components/admin/quotes/QuoteForm";

type Props = {
  searchParams: Promise<{
    pricingCalculationId?: string;
    leadId?: string;
    customerId?: string;
  }>;
};

export default async function NewQuotePage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <AdminShell title="Tạo báo giá">
      <QuoteForm
        mode="create"
        prefillParams={{
          pricingCalculationId: params.pricingCalculationId,
          leadId: params.leadId,
          customerId: params.customerId,
        }}
      />
    </AdminShell>
  );
}
