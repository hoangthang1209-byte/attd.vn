import ProductionSheetHeader, {
  ProductionSheetFooter,
  ProductionSheetOverview,
} from "@/components/admin/orders/production-sheet/ProductionSheetHeader";
import ProductionSheetVariantsTable from "@/components/admin/orders/production-sheet/ProductionSheetVariantsTable";
import ProductionSheetFilesTable from "@/components/admin/orders/production-sheet/ProductionSheetFilesTable";
import {
  ProductionSheetBomTable,
  ProductionSheetMaterialSummaryTable,
} from "@/components/admin/orders/production-sheet/ProductionSheetBomTable";
import ProductionSheetReadiness from "@/components/admin/orders/production-sheet/ProductionSheetReadiness";
import ProductionSheetExecutionSummary from "@/components/admin/orders/production-sheet/ProductionSheetExecutionSummary";
import type { ProductionSheetPdfData } from "@/features/orders/production-sheet/production-sheet.types";

type Props = {
  data: ProductionSheetPdfData;
  variant?: "screen" | "pdf" | "print";
};

export default function ProductionSheetDocument({ data, variant = "screen" }: Props) {
  const variantClass =
    variant === "pdf"
      ? " production-sheet-document--pdf"
      : variant === "print"
        ? " production-sheet-document--print"
        : "";

  return (
    <div className={`production-sheet-document${variantClass}`}>
      <ProductionSheetHeader data={data} />
      <ProductionSheetOverview data={data} />
      <ProductionSheetVariantsTable rows={data.variantRows} />
      <ProductionSheetFilesTable
        orderLevelFiles={data.orderLevelFiles}
        itemLevelFiles={data.itemLevelFiles}
      />
      <ProductionSheetBomTable itemBoms={data.itemBoms} />
      <ProductionSheetMaterialSummaryTable rows={data.materialSummary} />
      <ProductionSheetExecutionSummary data={data} />
      <ProductionSheetReadiness data={data} />
      <ProductionSheetFooter data={data} />
    </div>
  );
}
