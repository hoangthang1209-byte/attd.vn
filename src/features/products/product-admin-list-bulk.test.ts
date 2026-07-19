import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product admin list bulk UX", () => {
  const dashboard = read("src/components/admin/products/ProductCatalogDashboard.tsx");
  const dialogs = read("src/components/admin/products/ProductBulkDialogs.tsx");

  it("product rows render checkboxes and header selects visible products", () => {
    assert.match(dashboard, /type="checkbox"/);
    assert.match(dashboard, /toggleSelectAllVisible/);
    assert.match(dashboard, /Chọn tất cả sản phẩm đang hiển thị/);
    assert.match(dashboard, /Chọn sản phẩm \$\{p\.name\}/);
  });

  it("bulk toolbar appears when selected and supports clear selection", () => {
    assert.match(dashboard, /product-bulk-toolbar/);
    assert.match(dashboard, /selectedIds\.size > 0/);
    assert.match(dashboard, /Đã chọn \{selectedIds\.size\} sản phẩm/);
    assert.match(dashboard, /product-bulk-clear-selection/);
    assert.match(dashboard, /Bỏ chọn/);
    assert.match(dashboard, /Chọn tất cả/);
  });

  it("bulk archive confirmation appears", () => {
    assert.match(dialogs, /Bạn sắp lưu trữ \{selectedCount\} sản phẩm/);
    assert.match(dialogs, /dữ liệu vẫn được giữ lại/);
    assert.match(dashboard, /openBulkDialog\("archive"\)/);
  });

  it("bulk status dialog opens/submits", () => {
    assert.match(dashboard, /openBulkDialog\("status"\)/);
    assert.match(dialogs, /Cập nhật trạng thái/);
    assert.match(dialogs, /operation: "status"/);
    assert.match(dialogs, /Nháp/);
    assert.match(dialogs, /Đang bán/);
  });

  it("bulk MOQ validation works", () => {
    assert.match(dialogs, /Đặt MOQ bằng/);
    assert.match(dialogs, /Giá trị nhập không hợp lệ/);
    assert.match(dialogs, /operation: "moq"/);
  });

  it("bulk lead-time dialog works", () => {
    assert.match(dialogs, /Cập nhật lead-time/);
    assert.match(dialogs, /Có sẵn: 1–3 ngày/);
    assert.match(dialogs, /operation: "leadTime"/);
  });

  it("list refreshes after success and clears selection", () => {
    assert.match(dashboard, /clearSelection\(\)/);
    assert.match(dashboard, /await fetchProducts\(\)/);
    assert.match(dashboard, /\/api\/admin\/products\/bulk/);
  });

  it("hides seed sample button outside development", () => {
    assert.match(dashboard, /SHOW_SAMPLE_DATA_BUTTON/);
    assert.match(dashboard, /process\.env\.NODE_ENV === "development"/);
    assert.match(dashboard, /Tạo dữ liệu mẫu/);
  });
});
