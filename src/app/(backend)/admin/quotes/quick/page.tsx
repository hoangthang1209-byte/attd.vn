import AdminPageTitle from "@/components/admin/AdminPageTitle";
import QuickQuoteForm from "@/components/admin/quotes/QuickQuoteForm";

type Props = {
  searchParams: Promise<{
    leadId?: string;
    customerId?: string;
  }>;
};

export default async function QuickQuotePage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <>
      <AdminPageTitle title="Quick Quote" />
      <QuickQuoteForm
        prefillParams={{
          leadId: params.leadId,
          customerId: params.customerId,
        }}
      />
    </>
  );
}
