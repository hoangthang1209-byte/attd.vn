import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SECTION_PATH = join(
  process.cwd(),
  "src/components/admin/products/ProductCatalogVariantsSection.tsx",
);

describe("ProductCatalogVariantsSection matrix save-before-generate", () => {
  const source = readFileSync(SECTION_PATH, "utf8");

  it("saves options before opening confirm and again before execute", () => {
    assert.match(source, /onBeforeMatrixGenerate/);
    assert.match(source, /Đang lưu tuỳ chọn\.\.\./);
    assert.match(source, /Đang tạo tổ hợp biến thể\.\.\./);
    assert.match(source, /setSavingOptions\(true\)/);
    assert.match(source, /async function openMatrixConfirm/);
    assert.match(
      source,
      /Không thể tạo biến thể vì nhóm tuỳ chọn chưa được lưu\. Vui lòng lưu sản phẩm rồi thử lại\./,
    );
  });

  it("does not block fresh unsaved option groups from matrix confirmation", () => {
    assert.doesNotMatch(
      source,
      /if \(optionGroups\.length > 0 && !hasPersistedOptionValues\) return;/,
    );
  });
});
