import type { CostingComponentRow } from "@/components/admin/pricing/costing/CostingComponentTable";
import type { CustomCostFormValues } from "@/components/admin/pricing/costing/CostingCustomCostForm";
import {
  costLibraryCategoryToComponentType,
  type CostLibraryItem,
} from "@/features/pricing/cost-library";
import type { CostingWorkspaceClone } from "@/features/pricing/costing-calculation-clone";
import { costingWorkspaceToCalculatorInput } from "@/features/pricing/costing-calculation-clone";
import type { CostingComponentType } from "@/features/pricing/costing-types";

export function libraryItemToComponentRow(item: CostLibraryItem): CostingComponentRow {
  return {
    label: item.name,
    type: costLibraryCategoryToComponentType(item.category, item.name),
    unitCost: String(item.defaultUnitCost),
    totalCost: "",
    quantityFactor: String(item.defaultQuantityFactor ?? 1),
    note: item.defaultNote ?? item.description ?? "",
  };
}

export function customValuesToComponentRow(values: CustomCostFormValues): CostingComponentRow {
  return {
    label: values.name.trim(),
    type: costLibraryCategoryToComponentType(values.category, values.name),
    unitCost: values.defaultUnitCost.trim(),
    totalCost: "",
    quantityFactor: "1",
    note: values.note.trim(),
  };
}

export type QuickCostLineKey = string;

export type QuickCostLine = {
  key: QuickCostLineKey;
  type: CostingComponentType;
  label: string;
  detail: string;
  unitCost: string;
  source: "fabric" | "rib" | "component";
  componentIndex?: number;
};

export function flattenWorkspaceToQuickCostLines(workspace: CostingWorkspaceClone): QuickCostLine[] {
  const lines: QuickCostLine[] = [];
  const fabricCost = workspace.fabricCostPerUnit.trim();
  if (fabricCost && Number(fabricCost) > 0) {
    lines.push({
      key: "fabric",
      type: "MATERIAL",
      label: "Vải",
      detail: workspace.materialName.trim() || workspace.gsm.trim()
        ? `${workspace.materialName.trim()} ${workspace.gsm.trim()}`.trim()
        : "Vải / vật liệu chính",
      unitCost: fabricCost,
      source: "fabric",
    });
  }
  const ribCost = workspace.ribCostPerUnit.trim();
  if (ribCost && Number(ribCost) > 0) {
    lines.push({
      key: "rib",
      type: "RIB",
      label: "Phụ liệu",
      detail: "Bo / phụ liệu chính",
      unitCost: ribCost,
      source: "rib",
    });
  }
  workspace.components.forEach((row, index) => {
    if (!row.label.trim() && !row.unitCost.trim() && !row.totalCost.trim()) return;
    lines.push({
      key: `component-${index}`,
      type: row.type,
      label: row.label.trim() || "Chi phí khác",
      detail: row.note.trim(),
      unitCost: row.unitCost,
      source: "component",
      componentIndex: index,
    });
  });
  return lines;
}

export function applyQuickCostLineUnitCost(
  workspace: CostingWorkspaceClone,
  line: QuickCostLine,
  unitCost: string,
): CostingWorkspaceClone {
  const next = {
    ...workspace,
    components: workspace.components.map((row) => ({ ...row })),
  };
  if (line.source === "fabric") {
    next.fabricCostPerUnit = unitCost;
    return next;
  }
  if (line.source === "rib") {
    next.ribCostPerUnit = unitCost;
    return next;
  }
  if (line.source === "component" && line.componentIndex != null) {
    next.components[line.componentIndex] = {
      ...next.components[line.componentIndex],
      unitCost,
      totalCost: "",
    };
  }
  return next;
}

export function removeQuickCostLine(
  workspace: CostingWorkspaceClone,
  line: QuickCostLine,
): CostingWorkspaceClone {
  const next = {
    ...workspace,
    components: workspace.components.map((row) => ({ ...row })),
  };
  if (line.source === "fabric") {
    next.fabricCostPerUnit = "";
    return next;
  }
  if (line.source === "rib") {
    next.ribCostPerUnit = "";
    return next;
  }
  if (line.source === "component" && line.componentIndex != null) {
    next.components = next.components.filter((_, i) => i !== line.componentIndex);
  }
  return next;
}

export function workspaceToCalculatorInput(
  workspace: CostingWorkspaceClone,
  context?: {
    leadId?: string;
    customerId?: string;
    contactId?: string;
    priceGroupId?: string;
    internalNote?: string;
  },
) {
  return costingWorkspaceToCalculatorInput(workspace, context);
}

export const QUICK_COST_EDITABLE_COLUMNS = ["unitCost"] as const;

export function nextQuickCostCellIndex(current: number, lineCount: number, direction: 1 | -1): number {
  const next = current + direction;
  if (next < 0) return 0;
  if (next >= lineCount) return lineCount - 1;
  return next;
}
