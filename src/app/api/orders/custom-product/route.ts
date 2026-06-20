import { NextRequest, NextResponse } from "next/server";
import type { OrderProductGender } from "@prisma/client";
import { isOrderProductGender } from "@/features/orders/order-gender";
import {
  createOrderCustomProduct,
} from "@/features/orders/order-custom-product.service";
import { OrderValidationError } from "@/features/orders/order.service";
import { orderProductGenderLabel } from "@/features/orders/order-gender";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const gender = typeof raw.gender === "string" && isOrderProductGender(raw.gender)
    ? (raw.gender as OrderProductGender)
    : null;
  if (!gender) {
    return NextResponse.json({ message: "Giới tính không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await createOrderCustomProduct({
      name: typeof raw.name === "string" ? raw.name : "",
      categoryId: typeof raw.categoryId === "string" ? raw.categoryId : "",
      colorId: typeof raw.colorId === "string" ? raw.colorId : "",
      gender,
      description: typeof raw.description === "string" ? raw.description : null,
      defaultMoq: raw.defaultMoq != null ? Number(raw.defaultMoq) : null,
      unit: typeof raw.unit === "string" ? raw.unit : null,
      designImageUrl: typeof raw.designImageUrl === "string" ? raw.designImageUrl : null,
      productionLeadTime: typeof raw.productionLeadTime === "string" ? raw.productionLeadTime : null,
      customerCode: typeof raw.customerCode === "string" ? raw.customerCode : "",
      sizeName: typeof raw.sizeName === "string" ? raw.sizeName : null,
    });
    return NextResponse.json({
      product: {
        ...result,
        genderSnapshot: orderProductGenderLabel(gender),
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/custom-product]", err);
    return NextResponse.json({ message: "Không thể tạo sản phẩm tùy chọn" }, { status: 500 });
  }
}
