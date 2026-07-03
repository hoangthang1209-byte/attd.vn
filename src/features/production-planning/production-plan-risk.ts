import { startOfDay, endOfDay, addDays } from "@/features/orders/order-operations-helpers";
import type { ProductionPlanRiskTone } from "@/features/production-planning/production-plan.types";
import type { ProductionPlanStatus } from "@prisma/client";
import type {
  ProductionPlanDocStatus,
  ProductionPlanMaterialStatus,
  ProductionPlanQcStatus,
} from "@/features/production-planning/production-plan.types";

export type ProductionPlanRiskInput = {
  status: ProductionPlanStatus;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  internalDeadlineAt: Date | null;
  deliveryDeadline: Date | null;
  ownerId: string | null;
  docStatus: ProductionPlanDocStatus;
  materialStatus: ProductionPlanMaterialStatus;
  qcStatus: ProductionPlanQcStatus;
  now?: Date;
};

export function computeProductionPlanRisks(input: ProductionPlanRiskInput): string[] {
  const now = input.now ?? new Date();
  const risks: string[] = [];
  const today = startOfDay(now);

  if (input.status !== "COMPLETED") {
    if (input.plannedEndAt && startOfDay(input.plannedEndAt) < today) {
      risks.push("Quá hạn");
    } else if (input.internalDeadlineAt && startOfDay(input.internalDeadlineAt) < today) {
      risks.push("Quá hạn");
    } else if (
      input.deliveryDeadline &&
      startOfDay(input.deliveryDeadline) < today
    ) {
      risks.push("Quá hạn");
    }

    const twoDays = endOfDay(addDays(today, 2));
    if (
      !risks.includes("Quá hạn") &&
      input.internalDeadlineAt &&
      input.internalDeadlineAt <= twoDays
    ) {
      risks.push("Sắp trễ");
    } else if (
      !risks.includes("Quá hạn") &&
      input.plannedEndAt &&
      input.internalDeadlineAt &&
      input.plannedEndAt > input.internalDeadlineAt
    ) {
      risks.push("Sắp trễ");
    }
  }

  if (input.docStatus === "missing") risks.push("Thiếu file");
  if (input.materialStatus === "shortage") risks.push("Thiếu vật tư");
  if (!input.ownerId) risks.push("Chưa phân công");
  if (input.qcStatus === "rework") risks.push("Cần làm lại");

  if (
    input.docStatus === "missing" &&
    input.plannedStartAt &&
    startOfDay(input.plannedStartAt) <= today &&
    input.status !== "COMPLETED"
  ) {
    if (!risks.includes("Thiếu file")) risks.push("Thiếu file");
  }

  return [...new Set(risks)];
}

export function computeProductionPlanRiskTone(
  risks: string[],
  status: ProductionPlanStatus,
): ProductionPlanRiskTone {
  if (status === "COMPLETED") return "green";
  if (risks.some((r) => r === "Quá hạn")) return "red";
  if (
    risks.some((r) =>
      ["Sắp trễ", "Thiếu file", "Thiếu vật tư", "Cần làm lại"].includes(r),
    )
  ) {
    return "orange";
  }
  if (risks.some((r) => r === "Chưa phân công")) return "yellow";
  return "green";
}
