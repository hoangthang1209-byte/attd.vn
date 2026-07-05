import { NextResponse } from "next/server";

export type PermissionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DEALER_UNAUTHORIZED"
  | "DEALER_FORBIDDEN"
  | "PUBLIC_TOKEN_FORBIDDEN_FIELD"
  | "PUBLIC_TOKEN_NOT_FOUND";

const DEFAULT_PERMISSION_MESSAGES: Record<PermissionErrorCode, string> = {
  UNAUTHORIZED: "Vui lòng đăng nhập để tiếp tục.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  DEALER_UNAUTHORIZED: "Vui lòng đăng nhập cổng B2B.",
  DEALER_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  PUBLIC_TOKEN_FORBIDDEN_FIELD: "Dữ liệu công khai chứa trường nội bộ.",
  PUBLIC_TOKEN_NOT_FOUND: "Không tìm thấy tài liệu công khai.",
};

const DEFAULT_PERMISSION_STATUSES: Record<PermissionErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  DEALER_UNAUTHORIZED: 401,
  DEALER_FORBIDDEN: 403,
  PUBLIC_TOKEN_FORBIDDEN_FIELD: 500,
  PUBLIC_TOKEN_NOT_FOUND: 404,
};

export function createPermissionErrorResponse(
  code: PermissionErrorCode,
  message = DEFAULT_PERMISSION_MESSAGES[code],
  status = DEFAULT_PERMISSION_STATUSES[code],
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function unauthorizedResponse(message?: string): NextResponse {
  return createPermissionErrorResponse("UNAUTHORIZED", message);
}

export function forbiddenResponse(message?: string): NextResponse {
  return createPermissionErrorResponse("FORBIDDEN", message);
}

export function dealerUnauthorizedResponse(message?: string): NextResponse {
  return createPermissionErrorResponse("DEALER_UNAUTHORIZED", message);
}

export function dealerForbiddenResponse(message?: string): NextResponse {
  return createPermissionErrorResponse("DEALER_FORBIDDEN", message);
}
